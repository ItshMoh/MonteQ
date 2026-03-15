import asyncio
import json
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections per user for real-time updates."""

    def __init__(self):
        # user_id -> set of active WebSocket connections
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(ws)

    async def disconnect(self, user_id: str, ws: WebSocket):
        async with self._lock:
            if user_id in self._connections:
                self._connections[user_id].discard(ws)
                if not self._connections[user_id]:
                    del self._connections[user_id]

    async def send_to_user(self, user_id: str, event: str, data: dict):
        """Send an event to all connections for a user."""
        message = json.dumps({"event": event, "data": data})
        async with self._lock:
            connections = self._connections.get(user_id, set()).copy()

        dead = []
        for ws in connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)

        # Clean up dead connections
        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections.get(user_id, set()).discard(ws)

    async def broadcast(self, event: str, data: dict):
        """Send to all connected users."""
        async with self._lock:
            all_users = list(self._connections.keys())
        for user_id in all_users:
            await self.send_to_user(user_id, event, data)


# Singleton instance
ws_manager = ConnectionManager()
