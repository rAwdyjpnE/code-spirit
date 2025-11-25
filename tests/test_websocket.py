import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_websocket_connection():
    with client.websocket_connect("/ws/student/non_existent_id") as websocket:
        try:
            data = websocket.receive_json()
        except Exception:
            pass