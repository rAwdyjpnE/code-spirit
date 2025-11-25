import sys
import os
import time
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import get_settings

def init_db():
    settings = get_settings()
    
    print(f"⏳ Attempting to connect to PostgreSQL at {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}...")

    retries = 5
    while retries > 0:
        try:
            conn = psycopg2.connect(
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                dbname="postgres"
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cursor = conn.cursor()
            cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{settings.POSTGRES_DB}'")
            exists = cursor.fetchone()
            
            if not exists:
                print(f"🛠️ Database '{settings.POSTGRES_DB}' not found. Creating...")
                cursor.execute(f"CREATE DATABASE {settings.POSTGRES_DB}")
                print(f"✅ Database '{settings.POSTGRES_DB}' created successfully!")
            else:
                print(f"✅ Database '{settings.POSTGRES_DB}' already exists.")
            
            cursor.close()
            conn.close()
            break
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            retries -= 1
            if retries > 0:
                print(f"🔄 Retrying in 2 seconds... ({retries} left)")
                time.sleep(2)
            else:
                print("💀 Could not connect to database after multiple attempts.")
                sys.exit(1)

if __name__ == "__main__":
    init_db()