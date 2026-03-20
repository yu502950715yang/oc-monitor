"""
智能体信息提取器 - 从事件中提取和分析智能体信息

提供从 OpenCode 事件中提取智能体名称、统计信息和状态的功能。
"""
from typing import List, Dict, Any, Optional

from ..models.event import OpenCodeEvent


def extract_agents(events: List[OpenCodeEvent]) -> List[str]:
    """从事件列表中提取唯一的智能体名称列表
    
    解析 message.updated 事件的 metadata.data.properties.info.agent 字段，
    提取所有唯一的智能体名称。
    
    Args:
        events: OpenCodeEvent 事件列表
        
    Returns:
        唯一的智能体名称列表（按出现顺序）
    """
    agent_names: List[str] = []
    seen = set()
    
    for event in events:
        if event.event_type != "message.updated":
            continue
        
        agent_name = _extract_agent_from_event(event)
        if agent_name and agent_name not in seen:
            agent_names.append(agent_name)
            seen.add(agent_name)
    
    return agent_names


def get_agent_stats(events: List[OpenCodeEvent], agent_name: str) -> Dict[str, Any]:
    """返回智能体事件统计
    
    统计指定智能体的事件数量和状态（busy/idle）。
    
    Args:
        events: OpenCodeEvent 事件列表
        agent_name: 智能体名称
        
    Returns:
        包含以下字段的字典:
        - event_count: 事件总数
        - status: 智能体状态 ("busy", "idle" 或 "unknown")
        - session_id: 关联的会话ID（如果有）
    """
    agent_events = _get_events_for_agent(events, agent_name)
    
    if not agent_events:
        return {
            "event_count": 0,
            "status": "unknown",
            "session_id": None
        }
    
    # 获取状态
    status = _get_agent_status(agent_events)
    
    # 获取关联的会话ID
    session_ids = set(event.session_id for event in agent_events)
    session_id = session_ids.pop() if len(session_ids) == 1 else None
    
    return {
        "event_count": len(agent_events),
        "status": status,
        "session_id": session_id
    }


def determine_agent_status(events: List[OpenCodeEvent], agent_name: str) -> str:
    """确定智能体的当前状态（busy/idle）
    
    基于 session.status 事件来确定智能体状态。
    最新的一条 status 事件决定当前状态。
    
    Args:
        events: OpenCodeEvent 事件列表
        agent_name: 智能体名称
        
    Returns:
        "busy", "idle" 或 "unknown"
    """
    agent_events = _get_events_for_agent(events, agent_name)
    
    if not agent_events:
        return "unknown"
    
    return _get_agent_status(agent_events)


def _extract_agent_from_event(event: OpenCodeEvent) -> Optional[str]:
    """从事件中提取智能体名称
    
    尝试从 metadata.data.properties.info.agent 字段提取智能体名称。
    
    Args:
        event: OpenCodeEvent 事件
        
    Returns:
        智能体名称，如果不存在或解析失败则返回 None
    """
    if not event.metadata:
        return None
    
    try:
        # 尝试多种可能的路径
        # 路径1: metadata.data.properties.info.agent
        data = event.metadata.get("data")
        if data and isinstance(data, dict):
            properties = data.get("properties")
            if properties and isinstance(properties, dict):
                info = properties.get("info")
                if info and isinstance(info, dict):
                    agent = info.get("agent")
                    if agent and isinstance(agent, str):
                        return agent
        
        # 路径2: metadata.properties.info.agent (扁平结构)
        properties = event.metadata.get("properties")
        if properties and isinstance(properties, dict):
            info = properties.get("info")
            if info and isinstance(info, dict):
                agent = info.get("agent")
                if agent and isinstance(agent, str):
                    return agent
        
        # 路径3: metadata.agent (直接字段)
        agent = event.metadata.get("agent")
        if agent and isinstance(agent, str):
            return agent
            
    except (AttributeError, TypeError):
        # 任何解析错误都返回 None
        pass
    
    return None


def _get_events_for_agent(events: List[OpenCodeEvent], agent_name: str) -> List[OpenCodeEvent]:
    """获取与指定智能体相关的所有事件
    
    对于 message.updated 事件，直接匹配 agent 字段。
    对于其他事件（如 session.status），会查找同一 session 中的事件。
    
    Args:
        events: OpenCodeEvent 事件列表
        agent_name: 智能体名称
        
    Returns:
        该智能体的事件列表
    """
    agent_events = []
    agent_sessions = set()
    
    # 第一遍：找出该 agent 的所有 message.updated 事件及其 session_id
    for event in events:
        if event.event_type == "message.updated":
            extracted_agent = _extract_agent_from_event(event)
            if extracted_agent == agent_name:
                agent_events.append(event)
                agent_sessions.add(event.session_id)
    
    # 第二遍：添加同一 session 中的其他事件（如 session.status）
    for event in events:
        if event.session_id in agent_sessions:
            if event not in agent_events:  # 避免重复添加
                agent_events.append(event)
    
    return agent_events


def _get_agent_status(events: List[OpenCodeEvent]) -> str:
    """从事件列表中获取智能体状态
    
    查找最新的 session.status 事件来确定状态。
    
    Args:
        events: OpenCodeEvent 事件列表（应该属于同一个智能体）
        
    Returns:
        "busy", "idle" 或 "unknown"
    """
    # 查找 session.status 事件
    status_events = [
        event for event in events
        if event.event_type == "session.status"
    ]
    
    if not status_events:
        return "unknown"
    
    # 按时间戳排序，取最新的事件
    sorted_events = sorted(status_events, key=lambda e: e.timestamp, reverse=True)
    latest_status_event = sorted_events[0]
    
    # 从 metadata 中提取状态
    if latest_status_event.metadata:
        try:
            # 尝试多种路径
            # 路径1: metadata.data.properties.status.type
            data = latest_status_event.metadata.get("data")
            if data and isinstance(data, dict):
                properties = data.get("properties")
                if properties and isinstance(properties, dict):
                    status = properties.get("status")
                    if status and isinstance(status, dict):
                        status_type = status.get("type")
                        if status_type in ("busy", "idle"):
                            return status_type
            
            # 路径2: metadata.properties.status.type
            properties = latest_status_event.metadata.get("properties")
            if properties and isinstance(properties, dict):
                status = properties.get("status")
                if status and isinstance(status, dict):
                    status_type = status.get("type")
                    if status_type in ("busy", "idle"):
                        return status_type
            
            # 路径3: metadata.status
            status_type = latest_status_event.metadata.get("status")
            if status_type in ("busy", "idle"):
                return status_type
                
        except (AttributeError, TypeError):
            pass
    
    return "unknown"