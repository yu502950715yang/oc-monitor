"""
Agents API - 智能体信息端点
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ..utils.agent_extractor import extract_agents, get_agent_stats
from ..storage.event_store import event_store
from .events import EventResponse


# 响应模型
class AgentInfo(BaseModel):
    """智能体信息模型"""
    agent_name: str = Field(..., description="智能体名称")
    event_count: int = Field(..., description="事件数量")
    status: str = Field(..., description="智能体状态 (busy/idle/unknown)")


class AgentEventResponse(BaseModel):
    """智能体事件响应模型（工具输出被截断）"""
    id: int
    session_id: str
    event_type: str
    content: Optional[str] = None
    timestamp: str
    metadata: dict


# 创建路由
router = APIRouter(prefix="/sessions/{session_id}/agents", tags=["agents"])

# 工具输出截断长度
TOOL_OUTPUT_MAX_LENGTH = 5000


def _truncate_content(content: Optional[str]) -> Optional[str]:
    """截断工具输出内容到指定长度"""
    if content is None:
        return None
    if len(content) > TOOL_OUTPUT_MAX_LENGTH:
        return content[:TOOL_OUTPUT_MAX_LENGTH] + "\n... [truncated]"
    return content


@router.get("", response_model=List[AgentInfo])
async def get_session_agents(session_id: str):
    """获取指定会话的所有智能体列表
    
    返回会话中所有智能体的基本信息，包括名称、事件数量和状态。
    """
    # 获取会话的所有事件
    events = await event_store.get_events_by_session(session_id, limit=10000)
    
    if not events:
        return []
    
    # 提取智能体名称列表
    agent_names = extract_agents(events)
    
    # 获取每个智能体的统计信息
    agents = []
    for agent_name in agent_names:
        stats = get_agent_stats(events, agent_name)
        agents.append(AgentInfo(
            agent_name=agent_name,
            event_count=stats.get("event_count", 0),
            status=stats.get("status", "unknown")
        ))
    
    return agents


@router.get("/{agent_name}/events", response_model=List[AgentEventResponse])
async def get_agent_events(
    session_id: str,
    agent_name: str,
    limit: int = Query(default=100, ge=1, le=1000, description="返回数量限制")
):
    """获取指定智能体的所有事件
    
    返回智能体的活动事件列表（按时间倒序），工具输出被截断至 5000 字符。
    """
    # 获取会话的所有事件
    events = await event_store.get_events_by_session(session_id, limit=10000)
    
    if not events:
        return []
    
    # 提取智能体名称列表
    agent_names = extract_agents(events)
    
    # 验证智能体是否存在
    if agent_name not in agent_names:
        raise HTTPException(
            status_code=404,
            detail=f"Agent '{agent_name}' not found in session '{session_id}'"
        )
    
    # 获取智能体的事件（需要使用 agent_extractor 内部的函数）
    # 由于 agent_extractor 没有直接导出获取事件列表的函数，
    # 我们手动过滤：同一 session 中的事件
    agent_events = [e for e in events if e.session_id == session_id]
    
    # 按时间倒序排序
    sorted_events = sorted(agent_events, key=lambda e: e.timestamp, reverse=True)
    
    # 限制返回数量
    limited_events = sorted_events[:limit]
    
    # 返回事件，截断工具输出
    return [
        AgentEventResponse(
            id=e.id if e.id is not None else 0,
            session_id=e.session_id,
            event_type=e.event_type,
            content=_truncate_content(e.content),
            timestamp=e.timestamp.isoformat(),
            metadata=e.metadata or {}
        )
        for e in limited_events
    ]