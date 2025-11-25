import json
import os
import sys
from sqlalchemy.orm import Session

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SessionLocal, engine, Base
from backend.models import Task

def seed_tasks():
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        tasks_file = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "backend", "tasks", "tasks_pool.json"
        )
        
        print(f"📖 Reading tasks from {tasks_file}...")
        
        with open(tasks_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        tasks_data = data.get("tasks", [])
        print(f"🔍 Found {len(tasks_data)} tasks.")
        
        added_count = 0
        updated_count = 0
        
        for task_item in tasks_data:
            existing_task = db.query(Task).filter(Task.id == task_item["id"]).first()
            
            if existing_task:
                existing_task.title = task_item["title"]
                existing_task.description = task_item["description"]
                existing_task.template = task_item.get("template")
                existing_task.spec = task_item["spec"]
                existing_task.difficulty = task_item["difficulty"]
                existing_task.time_limit = task_item["time_limit"]
                updated_count += 1
            else:
                new_task = Task(
                    id=task_item["id"],
                    title=task_item["title"],
                    description=task_item["description"],
                    template=task_item.get("template"),
                    spec=task_item["spec"],
                    difficulty=task_item["difficulty"],
                    time_limit=task_item["time_limit"]
                )
                db.add(new_task)
                added_count += 1
        
        db.commit()
        print(f"✅ Success! Added: {added_count}, Updated: {updated_count}")
        
    except Exception as e:
        print(f"❌ Error seeding tasks: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_tasks()