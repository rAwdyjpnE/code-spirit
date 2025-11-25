import pytest
import asyncio
from backend.code_executor import code_executor

try:
    import docker
    client = docker.from_env()
    client.ping()
    DOCKER_AVAILABLE = True
except:
    DOCKER_AVAILABLE = False

@pytest.mark.asyncio
@pytest.mark.skipif(not DOCKER_AVAILABLE, reason="Docker not available")
async def test_simple_sum():
    code = """
def sum_numbers(a, b):
    return a + b
"""
    test_cases = [
        {"input": [1, 2], "expected": 3},
        {"input": [-1, 1], "expected": 0}
    ]
    
    result = await code_executor.run_code(code, test_cases)
    assert result["status"] == "success"
    assert len(result["test_results"]) == 2
    assert result["test_results"][0]["passed"] is True

@pytest.mark.asyncio
@pytest.mark.skipif(not DOCKER_AVAILABLE, reason="Docker not available")
async def test_syntax_error():
    code = """
def sum_numbers(a, b):
    return a + 
"""
    test_cases = []
    result = await code_executor.run_code(code, test_cases)
    assert result["status"] == "error"
    assert "SyntaxError" in result["error_message"] or "System Error" in result["error_message"]

@pytest.mark.asyncio
@pytest.mark.skipif(not DOCKER_AVAILABLE, reason="Docker not available")
async def test_infinite_loop():
    code = """
def loop():
    while True:
        pass
loop()
"""
    test_cases = [{"input": [], "expected": None}]
    result = await code_executor.run_code(code, test_cases)
    assert result["status"] == "error"
    assert "Read timed out" in result["error_message"] or "ContainerError" in str(type(result))

@pytest.mark.asyncio
async def test_security_check():
    code = "import os\nos.system('ls')"
    test_cases = []
    
    result = await code_executor.run_code(code, test_cases)
    assert result["status"] == "error"
    assert "Security Error" in result["error_message"]