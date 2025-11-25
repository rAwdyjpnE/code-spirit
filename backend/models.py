import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Float, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from backend.database import Base

class UserStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    TYPING = "typing"
    AFK = "afk"

class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    ERROR = "error"

class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_token = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    users = relationship("User", back_populates="session")
    assigned_tasks = relationship("AssignedTask", back_populates="session")

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    is_online = Column(Boolean, default=True)
    status = Column(Enum(UserStatus), default=UserStatus.ONLINE)

    session = relationship("Session", back_populates="users")
    assigned_tasks = relationship("AssignedTask", back_populates="user")
    submissions = relationship("Submission", back_populates="user")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    template = Column(Text, nullable=True)
    spec = Column(JSON, nullable=False)
    difficulty = Column(String(50), default="medium")
    time_limit = Column(Integer, default=5)

    assigned_tasks = relationship("AssignedTask", back_populates="task")
    submissions = relationship("Submission", back_populates="task")

class AssignedTask(Base):
    __tablename__ = "assigned_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    task_id = Column(String, ForeignKey("tasks.id"))
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"))
    assigned_at = Column(DateTime, default=datetime.utcnow)
    is_completed = Column(Boolean, default=False)

    user = relationship("User", back_populates="assigned_tasks")
    task = relationship("Task", back_populates="assigned_tasks")
    session = relationship("Session", back_populates="assigned_tasks")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    task_id = Column(String, ForeignKey("tasks.id"))
    code = Column(Text, nullable=False)
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.PENDING)
    test_results = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    execution_time = Column(Float, nullable=True)

    user = relationship("User", back_populates="submissions")
    task = relationship("Task", back_populates="submissions")