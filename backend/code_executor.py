import asyncio
import json
import base64
from typing import Any, Dict
import docker
from backend.config import settings


class CodeExecutor:
    def __init__(self):
        try:
            self.client = docker.from_env()
        except Exception as e:
            print(f"Docker not available: {e}")
            self.client = None

    async def run_code(self, code: str, task_id: str, task_spec: Dict) -> Dict[str, Any]:
        if not self.client:
            return {"status": "error", "error_message": "Docker not available"}
        b64_code = base64.b64encode(code.encode('utf-8')).decode('utf-8')
        b64_spec = base64.b64encode(json.dumps(task_spec).encode('utf-8')).decode('utf-8')
        runner_script = f"""
import sys
import json
import base64
from pathlib import Path
from backend.grader import grade_solution

try:
    # Декодируем код студента и пишем его во временный файл внутри контейнера
    code_content = base64.b64decode('{b64_code}').decode('utf-8')
    student_code_path = Path('/tmp/solution.py')
    student_code_path.write_text(code_content, encoding='utf-8')

    # Декодируем спецификацию задачи
    spec_json = base64.b64decode('{b64_spec}').decode('utf-8')
    spec_data = json.loads(spec_json)
    
    # Запускаем проверку
    result = grade_solution(student_code_path, '{task_id}', spec_data)
    print(json.dumps(result))
except Exception as e:
    import traceback
    print(json.dumps({{"error": f"Grader failed: {{str(e)}}", "traceback": traceback.format_exc()}}))
"""

        try:
            container = self.client.containers.run(
                image="code-spirit-worker",
                command=["python", "-c", runner_script],
                working_dir="/workspace",
                mem_limit=settings.EXECUTION_MEMORY_LIMIT,
                network_disabled=True,
                remove=True,
                user="runner",
            )
            
            logs = container.decode('utf-8').strip()

            if not logs:
                return {"status": "error", "error_message": "No output from grader"}

            result_data = json.loads(logs)

            summary = result_data.get("summary", {})
            all_passed = summary.get("passed") == summary.get("total") and summary.get("total", 0) > 0

            return {
                "status": "success" if all_passed else "error",
                "test_results": result_data.get("cases", []),
                "error_message": result_data.get("error"),
                "execution_time": 1.0
            }

        except Exception as e:
            return {"status": "error", "error_message": f"System Error: {str(e)}"}


code_executor = CodeExecutor()