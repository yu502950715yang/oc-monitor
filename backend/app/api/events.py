"""
Events API - 事件管理端点
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Query, Request, Body
from pydantic import BaseModel, Field
from typing import Any

from ..models.event import OpenCodeEvent
from ..storage.event_store import event_store


# 请求模型
class EventCreate(BaseModel):
    """创建事件请求模型"""
    session_id: str = Field(..., description="会话ID")
    event_type: str = Field(..., description="事件类型")
    event_category: Optional[str] = Field(default=None, description="事件分类")
    data: Optional[dict] = Field(default=None, description="事件数据")


class EventBatchCreate(BaseModel):
    """批量创建事件请求模型 (插件兼容)"""
    events: list = Field(default_factory=list, description="事件列表")
    timestamp: Optional[int] = Field(default=None, description="时间戳")


class EventResponse(BaseModel):
    """事件响应模型"""
    id: int
    session_id: str
    event_type: str
    content: Optional[str] = None
    timestamp: str
    metadata: dict


# 创建路由
router = APIRouter(prefix="/events", tags=["events"])


@router.delete("/clear", status_code=status.HTTP_200_OK)
async def delete_all_events():
    """清空所有事件"""
    await event_store.delete_all_events()
    return {"success": True, "message": "All events deleted"}


@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset_events():
    """清空所有事件 (POST方式)"""
    await event_store.delete_all_events()
    return {"success": True, "message": "All events reset"}


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_event(request: Request):
    """上报事件 - 支持单条和批量格式"""
    # 直接读取原始JSON，避免Pydantic验证
    event_data = await request.json()
    
    # 判断是否是批量格式
    if "events" in event_data and isinstance(event_data.get("events"), list):
        # 批量格式
        events_list = event_data.get("events", [])
        if not events_list:
            return {"success": True, "count": 0}
        
        created_ids = []
        for event_item in events_list:
            # 优先使用顶层的 session_id，否则从嵌套结构提取
            session_id = event_item.get("sessionId") or event_item.get("session_id", "")
            
            # 从嵌套结构提取: data.data.properties.info.sessionID
            if not session_id:
                data = event_item.get("data", {})
                if isinstance(data, dict):
                    data_inner = data.get("data", {})
                    if isinstance(data_inner, dict):
                        props = data_inner.get("properties", {})
                        if isinstance(props, dict):
                            info = props.get("info", {})
                            if isinstance(info, dict):
                                session_id = info.get("sessionID") or ""
            
            event_type = event_item.get("type") or event_item.get("event_type", "unknown")
            
            metadata = {"raw": event_item}
            if "toolName" in event_item:
                metadata["tool_name"] = event_item["toolName"]
            if "messageId" in event_item:
                metadata["message_id"] = event_item["messageId"]
            if "projectPath" in event_item:
                metadata["project_path"] = event_item["projectPath"]
            
            event = OpenCodeEvent(
                session_id=session_id,
                event_type=event_type,
                metadata=metadata
            )
            event_id = await event_store.create_event(event)
            created_ids.append(event_id)
        
        return {"success": True, "count": len(created_ids), "ids": created_ids}
    
    # 单条格式
    session_id = event_data.get("session_id", "")
    event_type = event_data.get("event_type", "unknown")
    event_category = event_data.get("event_category")
    data = event_data.get("data")
    
    metadata = {}
    if event_category:
        metadata["event_category"] = event_category
    if data:
        metadata["data"] = data
    
    event = OpenCodeEvent(
        session_id=session_id,
        event_type=event_type,
        metadata=metadata
    )
    
    event_id = await event_store.create_event(event)
    event.id = event_id
    
    return EventResponse(
        id=event.id,
        session_id=event.session_id,
        event_type=event.event_type,
        content=event.content,
        timestamp=event.timestamp.isoformat(),
        metadata=event.metadata
    )


@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def create_events_batch(batch_data: EventBatchCreate):
    """批量上报事件 - 插件兼容接口"""
    if not batch_data.events:
        return {"success": True, "count": 0}
    
    created_ids = []
    for event_item in batch_data.events:
        # 提取事件数据
        session_id = event_item.get("sessionId") or event_item.get("session_id", "")
        event_type = event_item.get("type") or event_item.get("event_type", "unknown")
        
        # 构建metadata
        metadata = {"raw": event_item}
        if "toolName" in event_item:
            metadata["tool_name"] = event_item["toolName"]
        if "messageId" in event_item:
            metadata["message_id"] = event_item["messageId"]
        if "projectPath" in event_item:
            metadata["project_path"] = event_item["projectPath"]
        
        event = OpenCodeEvent(
            session_id=session_id,
            event_type=event_type,
            metadata=metadata
        )
        
        event_id = await event_store.create_event(event)
        created_ids.append(event_id)
    
    return {
        "success": True, 
        "count": len(created_ids),
        "ids": created_ids
    }


@router.get("", response_model=List[EventResponse])
async def get_events(
    limit: int = Query(default=100, ge=1, le=1000, description="返回数量限制"),
    session_id: Optional[str] = Query(default=None, description="按会话ID过滤")
):
    """获取事件列表，支持limit和session_id过滤"""
    if session_id:
        events = await event_store.get_events_by_session(session_id, limit=limit)
    else:
        events = await event_store.get_all_events(limit=limit)
    
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


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: int):
    """获取单个事件详情"""
    event = await event_store.get_event(event_id)
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found"
        )
    
    return EventResponse(
        id=event.id,
        session_id=event.session_id,
        event_type=event.event_type,
        content=event.content,
        timestamp=event.timestamp.isoformat(),
        metadata=event.metadata or {}
    )