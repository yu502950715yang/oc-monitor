"""
WebSocket Manager - 管理WebSocket连接和事件广播
"""
from fastapi import WebSocket
from typing import List, Dict, Any
import asyncio
import json
from datetime import datetime


class WebSocketManager:
    """WebSocket连接管理器"""
    
    def __init__(self):
        """初始化WebSocket管理器"""
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket):
        """接受新的WebSocket连接
        
        Args:
            websocket: WebSocket连接对象
        """
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        print(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    async def disconnect(self, websocket: WebSocket):
        """断开WebSocket连接
        
        Args:
            websocket: WebSocket连接对象
        """
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        print(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast_event(self, event_data: Dict[str, Any]):
        """广播事件到所有连接的客户端
        
        Args:
            event_data: 要广播的事件数据
        """
        if not self.active_connections:
            return
        
        # 序列化事件数据
        message = json.dumps({
            "type": "new_event",
            "data": event_data,
            "timestamp": datetime.now().isoformat()
        }, ensure_ascii=False, default=str)
        
        # 广播到所有连接
        disconnected = []
        async with self._lock:
            for connection in self.active_connections:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"Error sending to client: {e}")
                    disconnected.append(connection)
        
        # 清理断开的连接
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
    
    async def broadcast_message(self, message: Dict[str, Any]):
        """广播任意消息到所有连接的客户端
        
        Args:
            message: 要广播的消息
        """
        if not self.active_connections:
            return
        
        message_str = json.dumps(message, ensure_ascii=False, default=str)
        
        disconnected = []
        async with self._lock:
            for connection in self.active_connections:
                try:
                    await connection.send_text(message_str)
                except Exception as e:
                    print(f"Error sending to client: {e}")
                    disconnected.append(connection)
        
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """发送消息到特定客户端
        
        Args:
            message: 要发送的消息
            websocket: 目标WebSocket连接
        """
        message_str = json.dumps(message, ensure_ascii=False, default=str)
        try:
            await websocket.send_text(message_str)
        except Exception as e:
            print(f"Error sending personal message: {e}")
    
    def get_connection_count(self) -> int:
        """获取当前连接数
        
        Returns:
            当前活跃的WebSocket连接数
        """
        return len(self.active_connections)


# 全局WebSocket管理器实例
ws_manager = WebSocketManager()