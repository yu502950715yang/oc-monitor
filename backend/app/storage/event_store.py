"""
SQLite Event Store - 使用 aiosqlite 进行异步数据库操作
"""
import aiosqlite
import json
from datetime import datetime
from typing import Optional, List, Any, Dict
from pathlib import Path

from ..models.event import OpenCodeEvent
from ..config import settings


class EventStore:
    """SQLite 事件存储类"""
    
    def __init__(self, db_path: Optional[str] = None):
        """初始化事件存储
        
        Args:
            db_path: 数据库文件路径，如果为None则使用配置中的DATABASE_URL
        """
        if db_path:
            self.db_path = db_path
        else:
            # 从 DATABASE_URL 提取路径 (sqlite:///./data/events.db -> ./data/events.db)
            db_url = settings.DATABASE_URL
            if db_url.startswith("sqlite:///"):
                self.db_path = db_url.replace("sqlite:///", "")
            else:
                self.db_path = "./data/events.db"
        
        # 确保目录存在
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        self._db: Optional[aiosqlite.Connection] = None
    
    async def connect(self):
        """建立数据库连接并初始化表结构"""
        self._db = await aiosqlite.connect(self.db_path)
        self._db.row_factory = aiosqlite.Row
        await self._init_tables()
    
    async def close(self):
        """关闭数据库连接"""
        if self._db:
            await self._db.close()
            self._db = None
    
    async def _init_tables(self):
        """初始化数据库表"""
        async with self._db.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                content TEXT,
                timestamp TEXT NOT NULL,
                metadata TEXT
            )
        """):
            await self._db.commit()
        
        # 创建索引以提高查询性能
        await self._db.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id)
        """)
        await self._db.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)
        """)
        await self._db.commit()
    
    async def create_event(self, event: OpenCodeEvent) -> int:
        """创建新事件
        
        Args:
            event: OpenCodeEvent 实例
            
        Returns:
            新创建事件的ID
        """
        metadata_json = json.dumps(event.metadata) if event.metadata else None
        
        async with self._db.execute(
            """
            INSERT INTO events (session_id, event_type, content, timestamp, metadata)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                event.session_id,
                event.event_type,
                event.content,
                event.timestamp.isoformat(),
                metadata_json
            )
        ):
            await self._db.commit()
        
        # 获取最后插入的ID
        cursor = await self._db.execute("SELECT last_insert_rowid()")
        row = await cursor.fetchone()
        event_id = row[0] if row else 0
        
        # 事件创建后，通过WebSocket广播到所有连接的客户端
        if event_id > 0:
            await self._broadcast_event(event, event_id)
        
        return event_id
    
    async def _broadcast_event(self, event: OpenCodeEvent, event_id: int):
        """广播新创建的事件到所有WebSocket客户端
        
        Args:
            event: OpenCodeEvent 实例
            event_id: 事件ID
        """
        try:
            from ..websocket_manager import ws_manager
            
            event_data = {
                "id": event_id,
                "session_id": event.session_id,
                "event_type": event.event_type,
                "content": event.content,
                "timestamp": event.timestamp.isoformat(),
                "metadata": event.metadata or {}
            }
            
            await ws_manager.broadcast_event(event_data)
        except Exception as e:
            # 广播失败不影响事件创建
            print(f"Failed to broadcast event: {e}")
    
    async def get_event(self, event_id: int) -> Optional[OpenCodeEvent]:
        """根据ID获取事件
        
        Args:
            event_id: 事件ID
            
        Returns:
            OpenCodeEvent 实例，如果不存在则返回 None
        """
        cursor = await self._db.execute(
            "SELECT * FROM events WHERE id = ?",
            (event_id,)
        )
        row = await cursor.fetchone()
        
        if row:
            return self._row_to_event(row)
        return None
    
    async def get_events_by_session(
        self, 
        session_id: str, 
        limit: int = 100,
        offset: int = 0
    ) -> List[OpenCodeEvent]:
        """获取指定会话的所有事件
        
        Args:
            session_id: 会话ID
            limit: 返回数量限制
            offset: 偏移量
            
        Returns:
            OpenCodeEvent 实例列表
        """
        cursor = await self._db.execute(
            """
            SELECT * FROM events 
            WHERE session_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ? OFFSET ?
            """,
            (session_id, limit, offset)
        )
        rows = await cursor.fetchall()
        return [self._row_to_event(row) for row in rows]
    
    async def get_all_events(
        self, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[OpenCodeEvent]:
        """获取所有事件
        
        Args:
            limit: 返回数量限制
            offset: 偏移量
            
        Returns:
            OpenCodeEvent 实例列表
        """
        cursor = await self._db.execute(
            "SELECT * FROM events ORDER BY timestamp DESC LIMIT ? OFFSET ?",
            (limit, offset)
        )
        rows = await cursor.fetchall()
        return [self._row_to_event(row) for row in rows]
    
    async def delete_event(self, event_id: int) -> bool:
        """删除事件
        
        Args:
            event_id: 事件ID
            
        Returns:
            是否成功删除
        """
        cursor = await self._db.execute(
            "DELETE FROM events WHERE id = ?",
            (event_id,)
        )
        await self._db.commit()

    async def delete_all_events(self):
        """清空所有事件"""
        cursor = await self._db.execute("DELETE FROM events")
        await self._db.commit()
        return cursor.rowcount > 0
    
    def _row_to_event(self, row: aiosqlite.Row) -> OpenCodeEvent:
        """将数据库行转换为 OpenCodeEvent 对象
        
        Args:
            row: 数据库行
            
        Returns:
            OpenCodeEvent 实例
        """
        metadata: Dict[str, Any] = {}
        if row["metadata"]:
            try:
                metadata = json.loads(row["metadata"])
            except json.JSONDecodeError:
                pass
        
        return OpenCodeEvent(
            id=row["id"],
            session_id=row["session_id"],
            event_type=row["event_type"],
            content=row["content"],
            timestamp=datetime.fromisoformat(row["timestamp"]),
            metadata=metadata
        )


# 全局事件存储实例
event_store = EventStore()