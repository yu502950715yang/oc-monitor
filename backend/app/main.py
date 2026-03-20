"""
OpenCode Monitor - FastAPI Application Entry Point
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import settings
from .storage.event_store import event_store
from .websocket_manager import ws_manager
from .api import events, sessions, statistics, agents


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时确保数据目录存在
    import os
    data_dir = "./data"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    
    # 初始化数据库连接
    await event_store.connect()
    
    yield
    
    # 关闭时断开数据库连接
    await event_store.close()


app = FastAPI(
    title="OpenCode Monitor API",
    description="API for monitoring OpenCode sessions and events",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 配置 - 允许所有源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "ok",
        "message": "OpenCode Monitor API"
    }


# 注册API路由
app.include_router(events.router, prefix="/api/v1")
app.include_router(sessions.router, prefix="/api/v1")
app.include_router(statistics.router, prefix="/api/v1")
app.include_router(agents.router, prefix="/api/v1")


# WebSocket端点
@app.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket端点 - 实时接收新事件推送
    
    客户端连接后会立即收到所有已连接客户端数量的通知。
    当有新事件入库时，所有连接的客户端都会收到事件数据推送。
    """
    await ws_manager.connect(websocket)
    try:
        # 发送连接成功消息
        await ws_manager.send_personal_message({
            "type": "connected",
            "message": "WebSocket连接已建立",
            "active_connections": ws_manager.get_connection_count()
        }, websocket)
        
        # 保持连接并等待客户端消息
        while True:
            # 客户端可以发送心跳或其他消息
            data = await websocket.receive_text()
            # 可以在这里处理客户端消息，目前忽略
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await ws_manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )