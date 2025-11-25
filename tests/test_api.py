import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app
from backend.database import Base, get_db
from backend.config import get_settings

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Code Spirit API is running 🚀"}

def test_create_session_and_login():
    response = client.post("/api/admin/session/create", json={"password": "secret"})
    assert response.status_code == 200
    session_data = response.json()
    assert "id" in session_data
    session_id = session_data["id"]
    login_response = client.post(
        "/api/admin/login", 
        data={"username": session_id, "password": "wrong"}
    )
    assert login_response.status_code == 401
    login_response = client.post(
        "/api/admin/login", 
        data={"username": session_id, "password": "secret"}
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
    return session_id, login_response.json()["access_token"]

def test_student_flow():
    session_id, _ = test_create_session_and_login()
    response = client.post(
        "/api/register",
        json={"name": "Test Student", "session_id": session_id}
    )
    assert response.status_code == 200
    user_data = response.json()
    user_id = user_data["id"]
    assert user_data["name"] == "Test Student"
    task_response = client.get(f"/api/student/{user_id}/task")
    assert task_response.status_code == 200
    assert task_response.json() is None