from __future__ import annotations

import json
import sys
import types
import importlib.util
from pathlib import Path
from typing import Any, Dict, List, Set
import inspect
import math
import ast

BASE_DIR = Path(__file__).resolve().parent.parent
TASKS_DIR = BASE_DIR / "backend" / "tasks"

class GradingError(Exception):
    pass

def load_task_spec(task_id: str, spec_data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    if spec_data:
        return spec_data
    task_path = TASKS_DIR / task_id / "task.json"
    if not task_path.exists():
        raise GradingError(f"Task spec not found for task_id='{task_id}'")
    with task_path.open("r", encoding="utf-8") as f:
        return json.load(f)

def load_solution_module(solution_path: Path) -> types.ModuleType:
    if not solution_path.exists() or solution_path.suffix.lower() != ".py":
        raise GradingError("Solution must be a .py file that exists")

    spec = importlib.util.spec_from_file_location("student_solution", solution_path)
    if spec is None or spec.loader is None:
        raise GradingError("Failed to create import spec for solution")
    module = importlib.util.module_from_spec(spec)

    try:
        spec.loader.exec_module(module)
    except Exception as e:
        raise GradingError(f"Error executing solution module: {e}") from e
    return module

def to_jsonable(obj: Any) -> Any:
    if obj is None or isinstance(obj, (str, bool, int)):
        return obj
    if isinstance(obj, float):
        if math.isfinite(obj):
            return obj
        return str(obj)
    if isinstance(obj, dict):
        out: Dict[str, Any] = {}
        for k, v in obj.items():
            key = k if isinstance(k, str) else str(k)
            out[key] = to_jsonable(v)
        return out
    if isinstance(obj, (list, tuple)):
        return [to_jsonable(x) for x in obj]
    if isinstance(obj, set):
        try:
            return [to_jsonable(x) for x in sorted(list(obj))]
        except TypeError:
            return [to_jsonable(x) for x in list(obj)]
    try:
        return str(obj)
    except Exception:
        return repr(obj)

def _collect_imports_from_source(src: str) -> Set[str]:
    tree = ast.parse(src)
    mods: Set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                base = (alias.name or "").split(".")[0]
                if base:
                    mods.add(base)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                base = node.module.split(".")[0]
                if base:
                    mods.add(base)
    return mods

def enforce_allowed_imports_if_configured(source: str, spec: Dict[str, Any]) -> None:
    allowed_modules: Set[str] = set(spec.get("allowed_imports", []))
    if not allowed_modules:
        return

    allowed_set = allowed_modules | {"__future__"}
    found = _collect_imports_from_source(source)
    extra = sorted(found - allowed_set)
    if extra:
        raise GradingError(f"Disallowed imports: {', '.join(extra)}. Allowed: {sorted(allowed_set)}")

def _validate_parameter_names(callable_obj: Any, expected_params: List[str]) -> None:
    sig = inspect.signature(callable_obj)
    actual_params = [
        name for name, param in sig.parameters.items()
        if param.kind not in (inspect.Parameter.VAR_POSITIONAL, inspect.Parameter.VAR_KEYWORD)
    ]
    if actual_params != expected_params:
        raise GradingError(f"Parameter names mismatch: expected {expected_params}, got {actual_params}")

def _ensure_tests_list(tests: Any, *, context: str) -> List[Dict[str, Any]]:
    if not isinstance(tests, list):
        raise GradingError(f"{context} must be a list of test objects")
    return tests

def _get_test_args(t: Dict[str, Any]) -> List[Any]:
    return t.get("args") or t.get("input") or []


def run_function_tests(module: types.ModuleType, spec: Dict[str, Any], entry: Dict[str, Any]) -> Dict[str, Any]:
    func_name = entry["name"]
    func = getattr(module, func_name, None)
    if not func:
        raise GradingError(f"Function '{func_name}' not found")
    
    if "params" in entry:
        _validate_parameter_names(func, entry["params"])

    tests = _ensure_tests_list(entry.get("tests") or spec.get("tests"), context="Function tests")
    results, passed = [], 0

    for idx, t in enumerate(tests, 1):
        args = _get_test_args(t)
        kwargs = t.get("kwargs", {})
        expected = t.get("expected")

        case_res: Dict[str, Any] = {"index": idx, "input": args}
        
        try:
            actual = func(*args, **kwargs)
            ok = actual == expected
            if ok:
                passed += 1
            case_res.update({"status": "passed" if ok else "failed", "expected": expected, "actual": to_jsonable(actual)})
        except Exception as e:
            case_res.update({"status": "error", "error": f"{type(e).__name__}: {e}"})
        results.append(case_res)

    return {"total": len(tests), "passed": passed, "details": results, "label": func_name}

def _resolve_class_from_module(module: types.ModuleType, class_name: str) -> type[Any]:
    cls = getattr(module, class_name, None)
    if not cls or not inspect.isclass(cls):
        raise GradingError(f"Class '{class_name}' not found")
    return cls

def run_class_method_tests(module: types.ModuleType, spec: Dict[str, Any], entry: Dict[str, Any]) -> Dict[str, Any]:
    class_name, method_name = entry["class_name"], entry["method_name"]
    cls = _resolve_class_from_module(module, class_name)
    
    ctor_args, ctor_kwargs = entry.get("constructor_args", []), entry.get("constructor_kwargs", {})
    
    tests = _ensure_tests_list(entry.get("tests") or spec.get("tests"), context="Method tests")
    results, passed = [], 0

    for idx, t in enumerate(tests, 1):
        args = _get_test_args(t)
        kwargs = t.get("kwargs", {})
        expected = t.get("expected")
        test_ctor_args, test_ctor_kwargs = t.get("constructor_args", ctor_args), t.get("constructor_kwargs", ctor_kwargs)

        case_res: Dict[str, Any] = {"index": idx, "input": args}
        
        try:
            instance = cls(*test_ctor_args, **test_ctor_kwargs)
            target = getattr(instance, method_name)
            actual = target(*args, **kwargs)
            ok = actual == expected
            if ok:
                passed += 1
            case_res.update({"status": "passed" if ok else "failed", "expected": expected, "actual": to_jsonable(actual)})
        except Exception as e:
            case_res.update({"status": "error", "error": f"{type(e).__name__}: {e}"})
        results.append(case_res)

    return {"total": len(tests), "passed": passed, "details": results, "label": f"{class_name}.{method_name}"}

def run_class_attribute_tests(module: types.ModuleType, spec: Dict[str, Any], entry: Dict[str, Any]) -> Dict[str, Any]:
    class_name, attribute_name = entry["class_name"], entry["attribute_name"]
    cls = _resolve_class_from_module(module, class_name)

    ctor_args, ctor_kwargs = entry.get("constructor_args", []), entry.get("constructor_kwargs", {})
    
    tests = _ensure_tests_list(entry.get("tests") or spec.get("tests"), context="Attribute tests")
    results, passed = [], 0

    for idx, t in enumerate(tests, 1):
        test_ctor_args, test_ctor_kwargs = t.get("constructor_args", ctor_args), t.get("constructor_kwargs", ctor_kwargs)
        expected = t.get("expected")
        
        case_res: Dict[str, Any] = {"index": idx}
        try:
            instance = cls(*test_ctor_args, **test_ctor_kwargs)
            if not hasattr(instance, attribute_name):
                raise AttributeError(f"Attribute '{attribute_name}' not found")
            actual = getattr(instance, attribute_name)
            ok = actual == expected
            if ok:
                passed += 1
            case_res.update({"status": "passed" if ok else "failed", "expected": expected, "actual": to_jsonable(actual)})
        except Exception as e:
            case_res.update({"status": "error", "error": f"{type(e).__name__}: {e}"})
        results.append(case_res)

    return {"total": len(tests), "passed": passed, "details": results, "label": f"{class_name}.{attribute_name}"}

def _normalize_entry_list(raw_entry: Any) -> List[Dict[str, Any]]:
    if isinstance(raw_entry, list):
        return raw_entry
    if isinstance(raw_entry, dict):
        return [raw_entry]
    raise GradingError("Task spec 'entry' must be an object or a list of objects")

def grade_solution(solution_path: Path, task_id: str, spec_data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    spec = load_task_spec(task_id, spec_data)
    
    try:
        source = solution_path.read_text(encoding="utf-8")
    except Exception as e:
        raise GradingError(f"Cannot read solution source: {e}") from e

    if "allowed_imports" in spec:
        enforce_allowed_imports_if_configured(source, spec)

    module = load_solution_module(solution_path)
    entries = _normalize_entry_list(spec["entry"])
    
    overall_cases, total_passed, total_tests, case_index = [], 0, 0, 1

    for entry in entries:
        entry_type = entry.get("type", "function").lower()
        if entry_type == "function":
            tests_res = run_function_tests(module, spec, entry)
        elif entry_type == "class_method":
            tests_res = run_class_method_tests(module, spec, entry)
        elif entry_type == "class_attribute":
            tests_res = run_class_attribute_tests(module, spec, entry)
        else:
            raise GradingError(f"Unsupported entry type: {entry_type}")

        for detail in tests_res.get("details", []):
            case = {**detail, "index": case_index, "entry": tests_res.get("label")}
            overall_cases.append(case)
            case_index += 1
        
        total_passed += tests_res.get("passed", 0)
        total_tests += tests_res.get("total", 0)

    return {
        "task_id": task_id,
        "summary": {"passed": total_passed, "total": total_tests},
        "cases": overall_cases,
    }