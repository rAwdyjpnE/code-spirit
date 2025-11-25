from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import json
from datetime import datetime
import uuid

from backend.config import get_settings
from backend.database import engine, Base, get_db
from backend.models import User, Session as DbSession, Task, AssignedTask, Submission, UserStatus, SubmissionStatus
from backend.schemas import (
    UserCreate, UserResponse, 
    SessionCreate, SessionResponse,
    TaskResponse, SubmissionCreate, SubmissionResponse,
    StudentDetail,
    TaskCreate, TaskUpdate, ManualAssignRequest
)
from backend.auth import (
    get_password_hash, verify_password, create_access_token, 
    get_current_admin_session
)
from backend.websocket_manager import manager
from backend.task_manager import TaskManager
from backend.code_executor import code_executor

Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title="Code Spirit API",
    description="Real-time Python learning platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Code Spirit API is running 🚀"}

# ==========================================
# AUTH & ADMIN ENDPOINTS
# ==========================================

@app.post("/api/admin/session/create", response_model=SessionResponse)
def create_session(session_data: SessionCreate, db: Session = Depends(get_db)):
    hashed_pw = get_password_hash(session_data.password)
    new_session = DbSession(admin_token=hashed_pw)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session

@app.post("/api/admin/login")
def login_admin(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        session_id = form_data.username
        uuid.UUID(session_id)
    except ValueError:
         raise HTTPException(status_code=400, detail="Invalid Session ID format")

    session = db.query(DbSession).filter(DbSession.id == session_id).first()
    if not session or not verify_password(form_data.password, session.admin_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect session ID or password")
    
    access_token = create_access_token(data={"sub": str(session.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/admin/students", response_model=List[UserResponse])
def get_students(
    current_session: DbSession = Depends(get_current_admin_session),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.session_id == current_session.id).all()

@app.get("/api/admin/student/{student_id}", response_model=StudentDetail)
def get_student_detail(
    student_id: str,
    current_session: DbSession = Depends(get_current_admin_session),
    db: Session = Depends(get_db)
):
    student = db.query(User).filter(User.id == student_id, User.session_id == current_session.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    current_assignment = db.query(AssignedTask).filter(AssignedTask.user_id == student.id, AssignedTask.is_completed == False).first()
    current_task = db.query(Task).filter(Task.id == current_assignment.task_id).first() if current_assignment else None
    last_submission = db.query(Submission).filter(Submission.user_id == student.id).order_by(Submission.submitted_at.desc()).first()

    response = StudentDetail.model_validate(student)
    response.current_task = current_task
    response.last_submission = last_submission
    
    return response

@app.post("/api/admin/tasks/assign")
async def assign_tasks(
    current_session: DbSession = Depends(get_current_admin_session),
    db: Session = Depends(get_db)
):
    tm = TaskManager(db)
    assigned_students_with_tasks = tm.assign_tasks_to_all(str(current_session.id))
    
    for student, task in assigned_students_with_tasks:
        student_socket = manager.active_connections.get(str(student.id))
        if student_socket:
            await manager.send_personal_message({
                "type": "task_assigned",
                "task": TaskResponse.model_validate(task).model_dump()
            }, student_socket)

    return {"assigned_count": len(assigned_students_with_tasks)}

@app.get("/api/admin/tasks", response_model=List[TaskResponse])
def get_all_tasks(db: Session = Depends(get_db), current_session: DbSession = Depends(get_current_admin_session)):
    return db.query(Task).all()

@app.post("/api/admin/tasks", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db), current_session: DbSession = Depends(get_current_admin_session)):
    if db.query(Task).filter(Task.id == task.id).first():
        raise HTTPException(status_code=400, detail="Task ID already exists")
    new_task = Task(**task.model_dump())
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@app.put("/api/admin/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: str, task_update: TaskUpdate, db: Session = Depends(get_db), current_session: DbSession = Depends(get_current_admin_session)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    db.commit()
    db.refresh(db_task)
    return db_task

@app.delete("/api/admin/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), current_session: DbSession = Depends(get_current_admin_session)):
    db_task = db.query(Task).filter(Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.query(AssignedTask).filter(AssignedTask.task_id == task_id).delete()
    db.query(Submission).filter(Submission.task_id == task_id).delete()
    db.delete(db_task)
    db.commit()
    return {"message": "Task deleted"}

@app.post("/api/admin/student/assign_manual")
async def assign_manual_task(req: ManualAssignRequest, db: Session = Depends(get_db), current_session: DbSession = Depends(get_current_admin_session)):
    tm = TaskManager(db)
    task = tm.assign_specific_task(req.student_id, req.task_id, str(current_session.id)) if req.task_id else tm.assign_task_to_student(req.student_id, str(current_session.id)).task
    if not task:
        raise HTTPException(status_code=400, detail="Could not assign task")
    student_socket = manager.active_connections.get(req.student_id)
    if student_socket:
        await manager.send_personal_message({"type": "task_assigned", "task": TaskResponse.model_validate(task).model_dump()}, student_socket)
    return {"status": "assigned", "task_id": task.id}

# ==========================================
# STUDENT ENDPOINTS
# ==========================================

@app.post("/api/register", response_model=UserResponse)
def register_student(user_data: UserCreate, db: Session = Depends(get_db)):
    session = db.query(DbSession).filter(DbSession.id == user_data.session_id, DbSession.is_active == True).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or inactive")
    new_user = User(name=user_data.name, session_id=user_data.session_id)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/api/student/{user_id}/task", response_model=Optional[TaskResponse])
def get_student_task(user_id: str, db: Session = Depends(get_db)):
    assignment = db.query(AssignedTask).filter(AssignedTask.user_id == user_id, AssignedTask.is_completed == False).first()
    return db.query(Task).filter(Task.id == assignment.task_id).first() if assignment else None

@app.post("/api/submit", response_model=SubmissionResponse)
async def submit_solution(submission: SubmissionCreate, user_id: str = Body(..., embed=True), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == submission.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    new_submission = Submission(user_id=user_id, task_id=task.id, code=submission.code, status=SubmissionStatus.RUNNING)
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)

    result = await code_executor.run_code(submission.code, task.id, task.spec)

    new_submission.status = SubmissionStatus(result.get("status", "error"))
    new_submission.test_results = result.get("test_results")
    new_submission.error_message = result.get("error_message")
    new_submission.execution_time = result.get("execution_time")

    if new_submission.status == SubmissionStatus.SUCCESS:
        assignment = db.query(AssignedTask).filter(AssignedTask.user_id == user_id, AssignedTask.task_id == task.id).first()
        if assignment:
            assignment.is_completed = True
            
    db.commit()

    user = db.query(User).filter(User.id == user_id).first()
    await manager.broadcast_to_admins(str(user.session_id), {"type": "student_update", "user_id": str(user.id), "status": user.status, "submission_status": new_submission.status})
    
    return new_submission

# ==========================================
# WEBSOCKETS
# ==========================================

@app.websocket("/ws/student/{user_id}")
async def websocket_student(websocket: WebSocket, user_id: str, db: Session = Depends(get_db)):
    await manager.connect_student(websocket, user_id)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        await websocket.close(); return

    user.is_online, user.status, user.last_seen = True, UserStatus.ONLINE, datetime.utcnow()
    db.commit()
    await manager.broadcast_to_admins(str(user.session_id), {"type": "student_update", "user_id": user_id, "status": "online"})

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            user.last_seen = datetime.utcnow()
            if msg_type == "code_update":
                await manager.send_to_admins_viewing_student(str(user.session_id), user_id, {"type": "live_code_update", "user_id": user_id, "code": data.get("code")})
            elif msg_type == "status_update":
                user.status = data.get("status")
                db.commit()
                await manager.broadcast_to_admins(str(user.session_id), {"type": "student_update", "user_id": user_id, "status": user.status})
    except WebSocketDisconnect:
        manager.disconnect_student(user_id)
        user.is_online, user.status = False, UserStatus.OFFLINE
        db.commit()
        await manager.broadcast_to_admins(str(user.session_id), {"type": "student_update", "user_id": user_id, "status": "offline"})

@app.websocket("/ws/admin/{session_id}")
async def websocket_admin(websocket: WebSocket, session_id: str):
    await manager.connect_admin(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "view_student":
                manager.set_admin_viewing(websocket, data.get("student_id"))
    except WebSocketDisconnect:
        manager.disconnect_admin(websocket, session_id)