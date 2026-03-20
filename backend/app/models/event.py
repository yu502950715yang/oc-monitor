"""
OpenCode Event Pydantic Models
"""
from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, Field


class OpenCodeEvent(BaseModel):
    """OpenCode 事件模型"""
    
    id: Optional[int] = Field(default=None, description="事件ID")
    session_id: str = Field(..., description="会话ID")
    event_type: str = Field(..., description="事件类型")
    content: Optional[str] = Field(default=None, description="事件内容")
    timestamp: datetime = Field(default_factory=datetime.now, description="事件时间戳")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="附加元数据")
    
    class Config:
        from_attributes = True