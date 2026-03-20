"""
Statistics API - 统计信息端点
"""
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Query
import aiosqlite
from pydantic import BaseModel, Field

from ..config import settings


# 创建路由
router = APIRouter(prefix="/statistics", tags=["statistics"])


def _get_db_path() -> str:
    """获取数据库路径"""
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        return db_url.replace("sqlite:///", "")
    return "./data/events.db"


class StatisticsResponse(BaseModel):
    """统计信息响应模型 - 与前端 Statistics 类型匹配"""
    total_events: int = Field(default=0, description="总事件数")
    total_sessions: int = Field(default=0, description="总会话数")
    active_sessions: int = Field(default=0, description="活跃会话数")
    events_today: int = Field(default=0, description="今日事件数")
    event_types: Dict[str, int] = Field(default_factory=dict, description="按类型统计的事件数")
    agent_types: Dict[str, int] = Field(default_factory=dict, description="按智能体类型统计的事件数")
    first_event_time: Optional[str] = Field(default=None, description="最早事件时间")
    last_event_time: Optional[str] = Field(default=None, description="最新事件时间")


class SummaryResponse(BaseModel):
    """简洁摘要响应模型"""
    total_events: int = Field(default=0, description="总事件数")
    sessions_count: int = Field(default=0, description="总会话数")
    active_connections: int = Field(default=0, description="当前WebSocket连接数")


@router.get("", response_model=StatisticsResponse)
async def get_statistics():
    """获取详细统计信息
    
    返回包含以下内容的统计信息：
    - total_events: 总事件数
    - sessions_count: 总会话数
    - events_by_category: 按类别统计的事件数（从event_type提取类别）
    - events_by_type: 按类型统计的事件数
    - first_event_time: 最早事件时间
    - last_event_time: 最新事件时间
    """
    db_path = _get_db_path()
    
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        
        # 获取总数统计
        cursor = await db.execute("""
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT session_id) as sessions_count,
                MIN(timestamp) as first_event_time,
                MAX(timestamp) as last_event_time
            FROM events
        """)
        row = await cursor.fetchone()
        
        total_events = row["total_events"] if row and row["total_events"] else 0
        sessions_count = row["sessions_count"] if row and row["sessions_count"] else 0
        first_event_time = row["first_event_time"] if row and row["first_event_time"] else None
        last_event_time = row["last_event_time"] if row and row["last_event_time"] else None
        
        # 按事件类型统计
        cursor = await db.execute("""
            SELECT event_type, COUNT(*) as count
            FROM events
            GROUP BY event_type
            ORDER BY count DESC
        """)
        rows = await cursor.fetchall()
        events_by_type = {row["event_type"]: row["count"] for row in rows}
        
        # 按类别统计（从event_type提取类别前缀）
        # 例如: "tool_call" -> "tool", "message" -> "message"
        events_by_category: Dict[str, int] = {}
        for event_type, count in events_by_type.items():
            # 提取类别：取下划线前的部分，如果没有下划线则使用完整类型
            category = event_type.split("_")[0] if "_" in event_type else event_type
            if category in events_by_category:
                events_by_category[category] += count
            else:
                events_by_category[category] = count
        
        # 计算今日事件数
        from datetime import datetime, timedelta
        today = datetime.now().date().isoformat()
        cursor = await db.execute("""
            SELECT COUNT(*) as count
            FROM events
            WHERE date(timestamp) = ?
        """, (today,))
        row = await cursor.fetchone()
        events_today = row["count"] if row else 0
        
        # 统计活跃会话（最近30分钟有活动的会话）
        thirty_minutes_ago = (datetime.now() - timedelta(minutes=30)).isoformat()
        cursor = await db.execute("""
            SELECT COUNT(DISTINCT session_id) as count
            FROM events
            WHERE timestamp > ?
        """, (thirty_minutes_ago,))
        row = await cursor.fetchone()
        active_sessions = row["count"] if row else 0
        
        # agent_types 从 metadata 中提取
        agent_types: Dict[str, int] = {}
        
        # 查询所有事件，提取 agent 信息
        cursor = await db.execute("""
            SELECT metadata FROM events
            WHERE metadata IS NOT NULL AND metadata != ''
        """)
        rows = await cursor.fetchall()
        
        for row in rows:
            try:
                metadata = row["metadata"]
                
                # 如果 metadata 是字符串，尝试解析为 JSON
                if isinstance(metadata, str):
                    try:
                        import json
                        metadata = json.loads(metadata)
                    except Exception:
                        continue
                
                if metadata and isinstance(metadata, dict):
                    # 尝试从多个位置提取 agent
                    agent = None
                    
                    # 路径1: metadata.data.data.properties.info.agent
                    data = metadata.get("data", {})
                    if isinstance(data, dict):
                        data_inner = data.get("data", {})
                        if isinstance(data_inner, dict):
                            props = data_inner.get("properties", {})
                            if isinstance(props, dict):
                                info = props.get("info", {})
                                if isinstance(info, dict):
                                    agent = info.get("agent")
                    
                    if agent:
                        # 保留完整 agent 名称
                        agent = agent.strip()
                        
                        agent_types[agent] = agent_types.get(agent, 0) + 1
            except Exception:
                pass  # 忽略解析错误
        
        return StatisticsResponse(
            total_events=total_events,
            total_sessions=sessions_count,
            active_sessions=active_sessions,
            events_today=events_today,
            event_types=events_by_type,
            agent_types=agent_types,
            first_event_time=first_event_time,
            last_event_time=last_event_time
        )


@router.get("/summary", response_model=SummaryResponse)
async def get_summary():
    """获取简洁摘要信息
    
    返回包含以下内容的简洁统计：
    - total_events: 总事件数
    - sessions_count: 总会话数
    - active_connections: 当前WebSocket连接数
    """
    from ..websocket_manager import ws_manager
    
    db_path = _get_db_path()
    
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        
        # 获取事件数和会话数
        cursor = await db.execute("""
            SELECT 
                COUNT(*) as total_events,
                COUNT(DISTINCT session_id) as sessions_count
            FROM events
        """)
        row = await cursor.fetchone()
        
        total_events = row["total_events"] if row else 0
        sessions_count = row["sessions_count"] if row else 0
    
    # 获取当前WebSocket连接数
    active_connections = ws_manager.get_connection_count()
    
    return SummaryResponse(
        total_events=total_events,
        sessions_count=sessions_count,
        active_connections=active_connections
    )