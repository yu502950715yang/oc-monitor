# OpenCode 事件监控系统工作计划

## TL;DR

> **快速摘要**: 创建一个OpenCode事件监控系统，用于实时监控和展示OpenCode运行过程中的所有事件。系统包含后端API、前端界面和OpenCode插件三个部分，界面使用中文。

> **交付物**:
> - FastAPI后端（事件API + WebSocket推送 + SQLite存储）
> - Vue 3前端（统计面板 + 会话事件列表，中文界面）
> - OpenCode插件（事件监听 + HTTP上报）
> - Docker Compose一键部署配置

> **预估工作量**: 短（Short）
> **并行执行**: 是 - 3个主要任务可并行
> **关键路径**: 后端API → 前端开发 → 插件集成 → 部署验证

---

## 背景

### 原始需求
用户希望为OpenCode创建一个监控系统，界面要求使用中文。

### 访谈摘要
**关键讨论**:
- 技术栈：Vue 3 + TypeScript + Naive UI（前端），FastAPI + Python（后端），SQLite（数据库）
- 功能范围：仅事件监控（轻量级）
- 通信方式：OpenCode插件通过HTTP POST上报事件
- 部署方式：Docker Compose

**研究发现的参考信息**:
- OpenCode使用SSE进行事件通信
- 插件开发使用 `@opencode-ai/plugin`
- 事件类型包括：session、message、tool、command、file等30+种
- 参考项目OpenCodeAgent提供了API设计参考

### Metis审查
**已解决的问题**:
- 插件与后端通信机制已确认：HTTP POST
- 数据量级别已确认：每小时<1000条
- 错误处理策略已确认：内存队列+重试

---

## 工作目标

### 核心目标
构建一个轻量级的OpenCode事件监控系统，实现：
1. 实时采集OpenCode事件
2. 按会话分组展示事件
3. 显示统计图表
4. 中文用户界面

### 具体交付物

#### 后端 (backend/)
- [ ] `app/main.py` - FastAPI应用入口，包含健康检查端点
- [ ] `app/api/events.py` - 事件管理API（POST /api/v1/events, GET /api/v1/events）
- [ ] `app/api/sessions.py` - 会话管理API（按会话分组查询）
- [ ] `app/api/statistics.py` - 统计API（GET /api/v1/statistics）
- [ ] `app/models/event.py` - Pydantic事件模型
- [ ] `app/models/session.py` - 会话模型
- [ ] `app/storage/event_store.py` - SQLite事件存储
- [ ] `app/websocket_manager.py` - WebSocket管理器
- [ ] `app/config.py` - 配置管理
- [ ] `requirements.txt` - Python依赖
- [ ] `.env.example` - 环境变量示例

#### 前端 (frontend/)
- [ ] `src/App.vue` - 主应用组件，单页面布局
- [ ] `src/views/HomeView.vue` - 首页，包含统计面板和事件列表
- [ ] `src/components/StatsPanel.vue` - 统计面板（事件总数、类型分布）
- [ ] `src/components/SessionList.vue` - 会话列表组件
- [ ] `src/components/EventList.vue` - 事件列表组件
- [ ] `src/components/EventItem.vue` - 单个事件项（摘要+展开详情）
- [ ] `src/stores/eventStore.ts` - Pinia事件状态管理
- [ ] `src/services/api.ts` - API客户端
- [ ] `src/types/index.ts` - TypeScript类型定义
- [ ] `src/main.ts` - Vue应用入口
- [ ] `package.json` - npm依赖

#### OpenCode插件 (plugins/monitor/)
- [ ] `index.ts` - 插件主入口，事件监听和上报
- [ ] `types.ts` - 事件类型定义
- [ ] `buffer.ts` - 事件缓冲和重试逻辑
- [ ] `package.json` - 插件依赖
- [ ] `.opencoderc` - 插件配置

#### 部署配置
- [ ] `docker-compose.yml` - Docker编排配置
- [ ] `Dockerfile.backend` - 后端Docker镜像
- [ ] `Dockerfile.frontend` - 前端Docker镜像

### 完成定义
- [ ] 后端API可正常启动并响应请求
- [ ] 前端页面可正常访问，中文显示正确
- [ ] OpenCode插件可正常加载和上报事件
- [ ] Docker Compose可一键启动所有服务
- [ ] WebSocket实时推送正常工作

### 必须包含
- 事件实时监控（25+种OpenCode事件类型）
- 按会话分组展示
- 统计面板（事件数量、类型分布）
- 中文界面
- Docker部署支持

### 必须不包含（边界约束）
- Agent执行功能
- 工作流可视化
- 追踪时间线
- 单元测试
- 认证/授权（本地开发用）
- 复杂过滤和搜索功能

---

## 验证策略

### 测试决策
- **测试基础设施**: 否（用户选择不包含测试）
- **自动化测试**: 无
- **QA方式**: Agent-Executed QA（每个任务包含验证场景）

### QA政策
每个任务必须包含Agent-Executed QA场景。证据保存到 `.sisyphus/evidence/` 目录。

**前端验证**（使用Playwright）:
- 打开浏览器，访问前端页面
- 验证中文文本显示正确
- 验证统计面板数据加载
- 验证事件列表渲染
- 截图为证

**后端验证**（使用Bash/curl）:
- 启动后端服务
- 调用健康检查端点
- 发送测试事件
- 验证数据存储
- 验证WebSocket连接

**插件验证**（使用Bash）:
- 加载OpenCode插件
- 触发事件测试
- 验证事件上报到后端

---

## 执行策略

### 并行执行波次

```
Wave 1 (立即启动 - 基础+脚手架):
├── 任务1: 项目结构初始化 - 创建目录结构和基础配置文件
├── 任务2: 后端基础框架 - FastAPI + SQLite + 模型定义
├── 任务3: 前端基础框架 - Vue 3 + Naive UI + 状态管理
├── 任务4: OpenCode插件基础 - 插件结构 + 类型定义
└── 任务5: Docker配置 - docker-compose + Dockerfile

Wave 2 (Wave 1完成后 - 核心功能):
├── 任务6: 后端事件API - 事件CRUD + 会话查询
├── 任务7: 后端统计API - 统计计算 + WebSocket
├── 任务8: 前端统计面板 - 统计展示 + 图表
├── 任务9: 前端事件列表 - 会话分组 + 事件展示
├── 任务10: OpenCode插件事件监听 - 事件钩子实现
└── 任务11: OpenCode插件上报 - HTTP POST + 缓冲重试

Wave 3 (Wave 2完成后 - 集成+部署):
├── 任务12: 前端API集成 - 连接后端API + WebSocket
├── 任务13: 插件与后端集成 - 端到端事件流
├── 任务14: Docker部署测试 - 容器构建和运行
└── 任务15: 端到端验证 - 完整功能测试

Wave FINAL (全部任务后 - 验证):
├── 验证1: 后端功能验证 (bash/curl)
├── 验证2: 前端功能验证 (playwright)
├── 验证3: 插件功能验证
└── 验证4: Docker部署验证
```

### 依赖矩阵

| 任务 | 依赖 | 阻塞 |
|------|------|------|
| 1 | - | 2,3,4,5 |
| 2 | 1 | 6,7 |
| 3 | 1 | 8,9 |
| 4 | 1 | 10,11 |
| 5 | 1 | 14 |
| 6 | 2 | 12,13 |
| 7 | 2 | 12 |
| 8 | 3 | 12 |
| 9 | 3 | 12 |
| 10 | 4 | 13 |
| 11 | 4,10 | 13 |
| 12 | 6,7,8,9 | 15 |
| 13 | 6,10,11 | 15 |
| 14 | 5 | 15 |
| 15 | 12,13,14 | - |

---

## 待办事项

- [x] 1. 项目结构初始化

  **待办事项**: 创建目录结构和基础配置文件
  
  **推荐Agent类型**: `quick`
  - **分类**: quick
    - 原因：创建目录和配置文件是简单任务
  - **技能**: 无需特殊技能
  
  **并行化**:
  - **可并行运行**: 是
  - **并行组**: Wave 1（与任务2-5并行）
  - **阻塞**: 无
  - **被阻塞**: 任务2,3,4,5
  
  **验收标准**:
  - [ ] 目录结构创建成功: `ls -la E:\code\oc-monitor`
  - [ ] backend/ 目录存在
  - [ ] frontend/ 目录存在  
  - [ ] plugins/ 目录存在

- [x] 2. 后端基础框架

  **待办事项**: FastAPI + SQLite + 模型定义
  
  **推荐Agent类型**: `unspecified-high`
  - **分类**: unspecified-high
    - 原因：需要实现API框架、数据库模型、配置管理
  - **技能**: python
  
  **并行化**:
  - **可并行运行**: 是
  - **并行组**: Wave 1（与任务1,3,4,5并行）
  - **阻塞**: 任务1
  - **被阻塞**: 任务6,7
  
  **验收标准**:
  - [ ] FastAPI应用可启动: `cd backend && python -c "from app.main import app; print('OK')"`
  - [ ] SQLite数据库可创建
  - [ ] Pydantic模型无验证错误

- [x] 3. 前端基础框架

  **待办事项**: Vue 3 + Naive UI + 状态管理
  
  **推荐Agent类型**: `visual-engineering`
  - **分类**: visual-engineering
    - 原因：Vue组件开发和UI实现
  - **技能**: vue-best-practices
  
  **并行化**:
  - **可并行运行**: 是
  - **并行组**: Wave 1（与任务1,2,4,5并行）
  - **阻塞**: 任务1
  - **被阻塞**: 任务8,9
  
  **验收标准**:
  - [ ] Vue项目可构建: `cd frontend && npm run build`
  - [ ] Naive UI组件可导入
  - [ ] Pinia store可实例化

- [x] 4. OpenCode插件基础

  **待办事项**: 插件结构 + 类型定义
  
  **推荐Agent类型**: `unspecified-high`
  - **分类**: unspecified-high
    - 原因：TypeScript类型定义和插件结构
  - **技能**: 无需特殊技能
  
  **并行化**:
  - **可并行运行**: 是
  - **并行组**: Wave 1（与任务1,2,3,5并行）
  - **阻塞**: 任务1
  - **被阻塞**: 任务10,11
  
  **验收标准**:
  - [ ] TypeScript编译无错误
  - [ ] 插件类型定义完整

- [x] 5. Docker配置

  **待办事项**: docker-compose + Dockerfile
  
  **推荐Agent类型**: `quick`
  - **分类**: quick
    - 原因：Docker配置文件是简单任务
  - **技能**: 无需特殊技能
  
  **并行化**:
  - **可并行运行**: 是
  - **并行组**: Wave 1（与任务1-4并行）
  - **阻塞**: 任务1
  - **被阻塞**: 任务14
  
  **验收标准**:
  - [ ] docker-compose.yml语法正确: `docker-compose config`
  - [ ] Dockerfile语法正确

- [x] 6. 后端事件API

  **待办事项**: 事件CRUD + 会话查询
  
  **推荐Agent类型**: `unspecified-high`
  - **分类**: unspecified-high
    - 原因：实现REST API端点
  - **技能**: python
  
  **并行化**:
  - **可并行运行**: 否（Wave 2）
  - **并行组**: 顺序执行
  - **阻塞**: 任务2
  - **被阻塞**: 任务12,13
  
  **验收标准**:
  - [ ] POST /api/v1/events 返回201: `curl -X POST http://localhost:8000/api/v1/events -H "Content-Type: application/json" -d '{"event_type":"test"}'`
  - [ ] GET /api/v1/events 返回事件列表
  - [ ] GET /api/v1/events?session_id=xxx 可按会话查询

- [x] 7. 后端统计API

  **待办事项**: 统计计算 + WebSocket
  
  **推荐Agent类型**: `unspecified-high`
  - **分类**: unspecified-high
    - 原因：统计计算和WebSocket实现
  - **技能**: python
  
  **并行化**:
  - **可并行运行**: 否（Wave 2）
  - **并行组**: 顺序执行
  - **阻塞**: 任务2
  - **被阻塞**: 任务12
  
  **验收标准**:
  - [ ] GET /api/v1/statistics 返回统计数据
  - [ ] WebSocket连接可建立

- [x] 8. 前端统计面板

  **待办事项**: 统计展示 + 图表
  
  **推荐Agent类型**: `visual-engineering`
  - **分类**: visual-engineering
    - 原因：UI组件开发
  - **技能**: vue-best-practices, frontend-design
  
  **并行化**:
  - **可并行运行**: 否（Wave 2）
  - **并行组**: 顺序执行
  - **阻塞**: 任务3
  - **被阻塞**: 任务12
  
  **验收标准**:
  - [ ] 统计面板组件渲染
  - [ ] 统计数据正确显示

- [x] 9. 前端事件列表

  **待办事项**: 会话分组 + 事件展示
  
  **推荐Agent类型**: `visual-engineering`
  - **分类**: visual-engineering
    - 原因：UI组件开发
  - **技能**: vue-best-practices
  
  **并行化**:
  - **可并行运行**: 否（Wave 2）
  - **并行组**: 顺序执行
  - **阻塞**: 任务3
  - **被阻塞**: 任务12
  
  **验收标准**:
  - [ ] 事件列表正确渲染
  - [ ] 按会话分组显示

- [x] 10. OpenCode插件事件监听

  **待办事项**: 事件钩子实现
  
  **推荐Agent类型**: `unspecified-high`
  - **分类**: unspecified-high
    - 原因：事件监听逻辑实现
  - **技能**: 无需特殊技能
  
  **并行化**:
  - **可并行运行**: 否（Wave 2）
  - **并行组**: 顺序执行
  - **阻塞**: 任务4
  - **被阻塞**: 任务13
  
  **验收标准**:
  - [ ] 插件可监听session.idle事件
  - [ ] 插件可监听tool.execute.*事件

- [x] 11. OpenCode插件上报

  **待办事项**: HTTP POST + 缓冲重试
  
  **推荐Agent类型**: `unspecified-high`
  - **分类**: unspecified-high
    - 原因：HTTP客户端和重试逻辑
  - **技能**: 无需特殊技能
  
  **并行化**:
  - **可并行运行**: 否（Wave 2）
  - **并行组**: 顺序执行
  - **阻塞**: 任务4,10
  - **被阻塞**: 任务13
  
  **验收标准**:
  - [ ] HTTP POST可发送
  - [ ] 缓冲队列可暂存事件
  - [ ] 重试机制可工作

- [x] 12. 前端API集成

  **待办事项**: 连接后端API + WebSocket
  
  **推荐Agent类型**: `visual-engineering`
  - **分类**: visual-engineering
    - 原因：前后端集成
  - **技能**: vue-best-practices
  
  **并行化**:
  - **可并行运行**: 否（Wave 3）
  - **并行组**: 顺序执行
  - **阻塞**: 任务6,7,8,9
  - **被阻塞**: 任务15
  
  **验收标准**:
  - [ ] 前端可调用后端API
  - [ ] WebSocket消息可接收

- [ ] 13. 插件与后端集成

  **待办事项**: 端到端事件流
  
  **推荐Agent类型**: `unspecified-high`
  - **分类**: unspecified-high
    - 原因：端到端集成
  - **技能**: 无需特殊技能
  
  **并行化**:
  - **可并行运行**: 否（Wave 3）
  - **并行组**: 顺序执行
  - **阻塞**: 任务6,10,11
  - **被阻塞**: 任务15
  
  **验收标准**:
  - [ ] 插件事件可上报到后端
  - [ ] 前端可显示上报的事件

- [x] 14. Docker部署测试

  **待办事项**: 容器构建和运行
  
  **推荐Agent类型**: `quick`
  - **分类**: quick
    - 原因：Docker测试
  - **技能**: 无需特殊技能
  
  **并行化**:
  - **可并行运行**: 否（Wave 3）
  - **并行组**: 顺序执行
  - **阻塞**: 任务5
  - **被阻塞**: 任务15
  
  **验收标准**:
  - [ ] docker-compose build成功
  - [ ] docker-compose up -d成功

- [ ] 15. 端到端验证

  **待办事项**: 完整功能测试
  
  **推荐Agent类型**: `unspecified-high`
  - **分类**: unspecified-high
    - 原因：完整功能验证
  - **技能**: playwright
  
  **并行化**:
  - **可并行运行**: 否（Wave 3）
  - **并行组**: 顺序执行
  - **阻塞**: 任务12,13,14
  - **被阻塞**: 无
  
  **验收标准**:
  - [ ] 完整事件流工作正常
  - [ ] 界面中文显示正确

---

## 最终验证波次

- [ ] F1. **后端功能验证** - `bash`
  - 启动后端服务: `cd backend && uvicorn app.main:app --reload`
  - 健康检查: `curl http://localhost:8000/health`
  - 预期: 返回 `{"status":"ok"}`
  - 事件上报: `curl -X POST http://localhost:8000/api/v1/events -H "Content-Type: application/json" -d '{"event_type":"test.event","session_id":"test-session","data":{}}'`
  - 预期: 返回201状态码
  - 事件查询: `curl http://localhost:8000/api/v1/events?session_id=test-session`
  - 预期: 返回事件列表
  - 证据: `.sisyphus/evidence/backend-api-verify.txt`

- [ ] F2. **前端功能验证** - `playwright`
  - 启动前端: `cd frontend && npm run dev`
  - 打开浏览器访问: `http://localhost:5173`
  - 验证页面标题包含中文
  - 验证统计面板区域存在
  - 验证事件列表区域存在
  - 截图为证: `.sisyphus/evidence/frontend-verify.png`

- [ ] F3. **OpenCode插件验证** - `bash`
  - 检查插件文件存在: `ls plugins/monitor/`
  - 验证TypeScript编译: `cd plugins/monitor && npx tsc --noEmit`
  - 预期: 无编译错误

- [ ] F4. **Docker部署验证** - `bash`
  - 构建镜像: `docker-compose build`
  - 启动服务: `docker-compose up -d`
  - 验证后端健康: `curl http://localhost:8000/health`
  - 验证前端可访问: `curl http://localhost:3000`
  - 停止服务: `docker-compose down`
  - 证据: `.sisyphus/evidence/docker-verify.txt`

---

## 提交策略

- **Wave 1**: `chore: 初始化项目结构和基础配置`
  - 文件: backend/, frontend/, plugins/, docker-compose.yml, Dockerfile.*
  - 提交前验证: 目录结构正确

- **Wave 2**: `feat: 实现核心功能`
  - 文件: backend/app/api/*.py, frontend/src/components/*.vue, plugins/monitor/*.ts
  - 提交前验证: 代码可运行

- **Wave 3**: `feat: 集成和部署`
  - 文件: 前端API集成, 插件集成, Docker配置
  - 提交前验证: 端到端功能正常

---

## 成功标准

### 验证命令

```bash
# 后端API测试
curl http://localhost:8000/health
# 预期: {"status":"ok","message":"OpenCode Monitor API"}

# 事件上报测试
curl -X POST http://localhost:8000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{"event_type":"session.idle","session_id":"test-001","event_category":"session","data":{"duration_ms":1000}}'
# 预期: {"status":"success","event_id":"..."}

# 事件查询测试
curl http://localhost:8000/api/v1/events?session_id=test-001
# 预期: 返回包含测试事件的事件列表

# 统计API测试
curl http://localhost:8000/api/v1/statistics
# 预期: {"total_events":1,"sessions_count":1,...}
```

### 最终检查清单

- [ ] 所有"必须包含"功能已实现
- [ ] 所有"必须不包含"功能已排除
- [ ] 后端API可正常启动
- [ ] 前端页面可正常访问
- [ ] 中文界面显示正确
- [ ] Docker Compose可正常部署
- [ ] 无关键错误或警告

---

## 计划元数据

- **创建时间**: 2026-03-19
- **计划版本**: v1.0
- **预估工时**: 短（Short）
- **技术栈**: Vue 3 + FastAPI + SQLite + OpenCode Plugin