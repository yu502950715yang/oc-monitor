"""
Sessions API - 会话管理端点
"""
from typing import List, Optional
from fastapi import APIRouter, Query
import aiosqlite
from pydantic import BaseModel, Field
from datetime import datetime

from ..config import settings
from ..utils.agent_extractor import extract_agents
from ..storage.event_store import event_store
from .events import EventResponse


class SessionInfo(BaseModel):
    """会话信息模型 - 与前端 Session 类型匹配"""
    id: str = Field(..., description="会话唯一标识")
    session_id: str = Field(..., description="会话ID")
    start_time: Optional[str] = Field(default=None, description="会话开始时间")
    end_time: Optional[str] = Field(default=None, description="会话结束时间")
    agent_count: int = Field(default=0, description="智能体数量")
    event_count: int = Field(default=0, description="事件数量")
    status: str = Field(default='active', description="会话状态")


# 创建路由
router = APIRouter(prefix="/sessions", tags=["sessions"])


def _get_db_path() -> str:
    """获取数据库路径"""
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        return db_url.replace("sqlite:///", "")
    return "./data/events.db"


@router.get("", response_model=List[SessionInfo])
async def get_sessions():
    """获取所有会话列表（带事件统计）"""
    db_path = _get_db_path()
    
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        
        # 查询每个会话的事件统计
        cursor = await db.execute("""
            SELECT 
                session_id,
                COUNT(*) as event_count,
                MIN(timestamp) as first_event_time,
                MAX(timestamp) as last_event_time
            FROM events
            GROUP BY session_id
            ORDER BY last_event_time DESC
        """)
        rows = await cursor.fetchall()
        
        # 判断会话是否活跃（最近30分钟有活动）
        from datetime import timedelta
        thirty_minutes_ago = (datetime.now() - timedelta(minutes=30)).isoformat()
        
        sessions = []
        for row in rows:
            last_event_time = row["last_event_time"]
            is_active = last_event_time and last_event_time > thirty_minutes_ago if last_event_time else False
            
            # 获取会话的事件并提取智能体数量
            session_id = row["session_id"]
            session_events = await event_store.get_events_by_session(session_id, limit=1000)
            agent_names = extract_agents(session_events)
            agent_count = len(agent_names)
            
            sessions.append(SessionInfo(
                id=session_id or "unknown",
                session_id=session_id or "",
                start_time=row["first_event_time"],
                end_time=row["last_event_time"],
                agent_count=agent_count,
                event_count=row["event_count"],
                status='active' if is_active else 'completed'
            ))
        
        return sessions


@router.get("/{session_id}/events", response_model=List[EventResponse])
async def get_session_events(
    session_id: str,
    limit: int = Query(default=100, ge=1, le=1000, description="返回数量限制")
):
    """获取指定会话的所有事件"""
    from ..storage.event_store import event_store
    
    events = await event_store.get_events_by_session(session_id, limit=limit)
    
    return [
        EventResponse(
            id=e.id,
            session_id=e.session_id,
            event_type=e.event_type,
            content=e.content,
            timestamp=e.timestamp.isoformat(),
            metadata=e.metadata or {}
        )
        for e in events
    ]