# OpenCode 事件监控系统 - 使用文档

## 概述

OpenCode 事件监控系统是一个用于实时监控 OpenCode 运行过程中所有事件的轻量级监控系统。系统包含：

- **后端 API**：FastAPI + SQLite，提供事件存储、查询、统计功能
- **前端界面**：Vue 3 + Naive UI，中文界面展示
- **OpenCode 插件**：监听并上报事件到监控系统

---

## 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 克隆或下载项目后，进入目录
cd oc-monitor

# 2. 启动 Docker Desktop（Windows）或确保 Docker 运行（Linux/Mac）

# 3. 一键启动
docker-compose up -d

# 4. 访问系统
# 后端 API: http://localhost:8000
# 前端界面: http://localhost:3000
# API 文档: http://localhost:8000/docs
```

### 方式二：本地开发运行

#### 1. 启动后端

```bash
# 进入后端目录
cd backend

# 创建虚拟环境（可选）
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7000
```

后端启动后：
- API 地址：http://localhost:8000
- 健康检查：http://localhost:8000/health
- API 文档：http://localhost:8000/docs

#### 2. 启动前端

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端启动后访问：http://localhost:5173

---

## 系统功能

### 1. 事件监控

系统监控以下类型的 OpenCode 事件：

| 事件类型 | 说明 |
|---------|------|
| session.idle | 会话完成 |
| session.created | 新会话创建 |
| session.error | 会话错误 |
| message.updated | 消息更新 |
| tool.execute.after | 工具执行完成 |
| command.executed | 命令执行 |
| file.edited | 文件编辑 |
| permission.asked | 权限请求 |
| tui.toast.show | 系统通知 |

### 2. 界面说明

```
┌─────────────────────────────────────────────────────────────┐
│  OpenCode 事件监控系统                    [连接状态]  🔴/🟢  │
├──────────────────────┬──────────────────────────────────────┤
│  📊 数据统计          │  📋 事件列表                          │
│                      │                                       │
│  总事件数: 156       │  会话ID     类型       时间           │
│  会话数: 23          │  ───────────────────────────────     │
│  活跃会话: 2         │  sess_001   message    10:30:45      │
│                      │  sess_001   tool        10:30:42      │
│  ─────────────────   │  sess_002   session     10:29:30      │
│                      │                                       │
│  📈 事件类型分布      │  [点击会话查看详情]                   │
│  message  ████ 45%   │                                       │
│  tool     ███   30%  │                                       │
│  session  ██    20%  │                                       │
│  other    █      5%  │                                       │
└──────────────────────┴──────────────────────────────────────┘
```

- **左侧**：统计面板，显示总事件数、会话数、事件类型分布
- **右侧**：事件列表，按会话分组，点击可展开查看详情

### 3. API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/v1/events` | POST | 上报事件 |
| `/api/v1/events` | GET | 获取事件列表 |
| `/api/v1/sessions` | GET | 获取会话列表 |
| `/api/v1/sessions/{id}/events` | GET | 获取会话事件 |
| `/api/v1/statistics` | GET | 获取统计信息 |
| `/ws/events` | WebSocket | 实时事件推送 |

---

## OpenCode 插件配置

### 安装插件

将 `plugins/monitor` 目录复制到 OpenCode 插件目录：

```bash
# 全局插件
cp -r plugins/monitor ~/.config/opencode/plugins/

# 或项目级插件
cp -r plugins/monitor .opencode/plugins/
```

### 配置环境变量

在 OpenCode 配置文件中设置：

```json
{
  "plugins": ["monitor"],
  "env": {
    "MONITOR_ENDPOINT": "http://localhost:8000/api/v1/events"
  }
}
```

### 插件配置项

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `MONITOR_ENDPOINT` | `http://localhost:8000/api/v1/events` | 监控服务端点 |
| `MONITOR_BUFFER_MAX_SIZE` | `10` | 最大缓冲事件数 |
| `MONITOR_BUFFER_FLUSH_INTERVAL` | `3000` | 刷新间隔（毫秒） |
| `MONITOR_BUFFER_MAX_RETRIES` | `3` | 最大重试次数 |
| `MONITOR_VERBOSE` | `false` | 是否输出详细日志 |

---

## 测试 API

### 健康检查

```bash
curl http://localhost:8000/health
# 返回: {"status":"ok","message":"OpenCode Monitor API"}
```

### 上报测试事件

```bash
curl -X POST http://localhost:8000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "session.idle",
    "session_id": "test-session-001",
    "event_category": "session",
    "data": {
      "duration_ms": 5000,
      "message_count": 10
    }
  }'
```

### 查询统计

```bash
curl http://localhost:8000/api/v1/statistics
```

### 查询会话

```bash
# 获取所有会话
curl http://localhost:8000/api/v1/sessions

# 获取指定会话的事件
curl http://localhost:8000/api/v1/sessions/test-session-001/events
```

---

## 常见问题

### Q: 前端无法连接后端

**解决方法**：
1. 确认后端服务已启动（端口 8000）
2. 检查前端配置中的 API 地址
3. 如果使用 Docker，确保端口映射正确

### Q: 插件无法上报事件

**解决方法**：
1. 确认 `MONITOR_ENDPOINT` 环境变量设置正确
2. 检查后端服务是否正常运行
3. 查看浏览器控制台或终端的错误日志

### Q: Docker 构建失败

**解决方法**：
1. 确保 Docker Desktop 已启动
2. 确保有足够的磁盘空间
3. Windows 下可能需要启用 WSL2

### Q: 如何清除历史数据

直接删除 SQLite 数据库文件：

```bash
# 后端运行时会自动创建 data/ 目录
rm -rf data/events.db
```

---

## 项目结构

```
oc-monitor/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── models/         # Pydantic 模型
│   │   ├── storage/        # SQLite 存储
│   │   ├── main.py         # 应用入口
│   │   └── config.py       # 配置
│   └── requirements.txt    # Python 依赖
│
├── frontend/               # Vue 3 前端
│   ├── src/
│   │   ├── components/     # Vue 组件
│   │   ├── stores/         # Pinia 状态
│   │   ├── services/       # API 客户端
│   │   └── types/          # TypeScript 类型
│   └── package.json        # npm 依赖
│
├── plugins/monitor/        # OpenCode 插件
│   ├── index.ts            # 插件入口
│   ├── types.ts            # 类型定义
│   └── buffer.ts           # 缓冲逻辑
│
├── docker-compose.yml      # Docker 编排
├── Dockerfile.backend      # 后端镜像
└── Dockerfile.frontend     # 前端镜像
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | FastAPI + Python 3.11+ |
| 数据库 | SQLite |
| 前端 | Vue 3 + TypeScript + Naive UI |
| 状态管理 | Pinia |
| 实时通信 | WebSocket |
| 部署 | Docker + Docker Compose |

---

## 许可证

MIT License