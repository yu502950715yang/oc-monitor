"""
Session Pydantic Models
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class Session(BaseModel):
    """OpenCode 会话模型"""
    
    id: Optional[int] = Field(default=None, description="会话ID")
    session_id: str = Field(..., description="会话唯一标识符")
    start_time: datetime = Field(default_factory=datetime.now, description="会话开始时间")
    end_time: Optional[datetime] = Field(default=None, description="会话结束时间")
    status: str = Field(default="active", description="会话状态: active, completed, interrupted")
    message_count: int = Field(default=0, description="消息数量")
    agents_used: Optional[List[str]] = Field(default_factory=list, description="使用的代理列表")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="附加元数据")
    
    class Config:
        from_attributes = True