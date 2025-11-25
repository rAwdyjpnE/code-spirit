import random
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from backend.models import Task, AssignedTask, User, Session as DbSession

class TaskManager:
    def __init__(self, db: Session):
        self.db = db

    def get_random_task(self, exclude_task_ids: List[str] = None) -> Optional[Task]:
        query = self.db.query(Task)
        
        if exclude_task_ids:
            query = query.filter(Task.id.notin_(exclude_task_ids))

        available_tasks = query.all()
        
        if not available_tasks:
            return None
            
        return random.choice(available_tasks)

    def assign_task_to_student(self, user_id: str, session_id: str) -> Optional[AssignedTask]:
        existing_assignments = self.db.query(AssignedTask.task_id)\
            .filter(AssignedTask.user_id == user_id)\
            .all()
        
        exclude_ids = [t[0] for t in existing_assignments]

        task = self.get_random_task(exclude_task_ids=exclude_ids)
        
        if not task:
            return None

        new_assignment = AssignedTask(
            user_id=user_id,
            task_id=task.id,
            session_id=session_id
        )
        
        self.db.add(new_assignment)
        self.db.commit()
        self.db.refresh(new_assignment)
        
        return new_assignment

    def assign_tasks_to_all(self, session_id: str) -> list:
        students = self.db.query(User).filter(User.session_id == session_id).all()
        assignments = []
        for student in students:
            active_task = self.db.query(AssignedTask)\
                .filter(AssignedTask.user_id == student.id, AssignedTask.is_completed == False)\
                .first()

            if not active_task:
                new_assignment = self.assign_task_to_student(student.id, session_id)
                if new_assignment:
                    assignments.append((student, new_assignment.task))
                    
        return assignments
    
    def assign_specific_task(self, user_id: str, task_id: str, session_id: str) -> Optional[Task]:
        active_assignment = self.db.query(AssignedTask).filter(
            AssignedTask.user_id == user_id, 
            AssignedTask.is_completed == False
        ).first()
        
        if active_assignment:
            self.db.delete(active_assignment)
            self.db.commit()

        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None

        new_assignment = AssignedTask(
            user_id=user_id,
            task_id=task.id,
            session_id=session_id
        )
        self.db.add(new_assignment)
        self.db.commit()
        return task