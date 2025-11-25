from typing import Dict, List, Any
from fastapi import WebSocket
import json
import asyncio
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.admin_connections: Dict[str, List[WebSocket]] = {}
        self.admin_viewing: Dict[WebSocket, str] = {}

    async def connect_student(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"🔌 Student connected: {user_id}")

    def disconnect_student(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"🔌 Student disconnected: {user_id}")

    async def connect_admin(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.admin_connections:
            self.admin_connections[session_id] = []
        self.admin_connections[session_id].append(websocket)
        print(f"👑 Admin connected to session: {session_id}")

    def disconnect_admin(self, websocket: WebSocket, session_id: str):
        if session_id in self.admin_connections:
            if websocket in self.admin_connections[session_id]:
                self.admin_connections[session_id].remove(websocket)

        if websocket in self.admin_viewing:
            del self.admin_viewing[websocket]

    def set_admin_viewing(self, websocket: WebSocket, student_id: str):
        self.admin_viewing[websocket] = student_id

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception as e:
            print(f"Error sending message: {e}")

    async def broadcast_to_admins(self, session_id: str, message: dict):
        if session_id in self.admin_connections:
            for connection in self.admin_connections[session_id][:]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def send_to_admins_viewing_student(self, session_id: str, student_id: str, message: dict):
        if session_id in self.admin_connections:
            for connection in self.admin_connections[session_id]:
                if self.admin_viewing.get(connection) == student_id:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

manager = ConnectionManager()