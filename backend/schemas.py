from pydantic import BaseModel, UUID4
from typing import List, Optional, Any, Dict
from datetime import datetime
from backend.models import UserStatus, SubmissionStatus

class TestCase(BaseModel):
    input: List[Any]
    expected: Any
    description: Optional[str] = None

class TaskBase(BaseModel):
    id: str
    title: str
    description: str
    difficulty: str
    time_limit: int
    template: Optional[str] = None

class TaskCreate(TaskBase):
    spec: Dict

class TaskResponse(TaskBase):
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    name: str

class UserCreate(UserBase):
    session_id: str

class UserResponse(UserBase):
    id: UUID4
    session_id: UUID4
    is_online: bool
    status: UserStatus
    last_seen: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    password: str

class SessionResponse(BaseModel):
    id: UUID4
    created_at: datetime
    is_active: bool
    
    class Config:
        from_attributes = True

class SubmissionCreate(BaseModel):
    task_id: str
    code: str

class SubmissionResponse(BaseModel):
    id: UUID4
    task_id: str
    code: str
    status: SubmissionStatus
    test_results: Optional[List[Dict]] = None
    error_message: Optional[str] = None
    submitted_at: datetime
    
    class Config:
        from_attributes = True

class StudentDetail(UserResponse):
    current_task: Optional[TaskResponse] = None
    last_submission: Optional[SubmissionResponse] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    time_limit: Optional[int] = None
    template: Optional[str] = None
    test_cases: Optional[List[TestCase]] = None

class ManualAssignRequest(BaseModel):
    student_id: str
    task_id: Optional[str] = None