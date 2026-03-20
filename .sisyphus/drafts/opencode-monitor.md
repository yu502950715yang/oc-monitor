# 草稿: OpenCode 监控系统

## 项目背景

### 目标
为 OpenCode 创建一个监控系统，界面要求使用中文。

### 参考项目: OpenCodeAgent (cr330326/OpenCodeAgent)
GitHub: https://github.com/cr330326/OpenCodeAgent
描述: 主要聚焦于Agent编排可视化监控，便于分析Agent执行过程中的问题。

---

## OpenCodeAgent 核心功能分析

### 1. 实时监控
- 通过 WebSocket 追踪 Agent 事件、追踪和消息
- 实时数据推送

### 2. 可视化工作流
- 使用 ReactFlow 进行 Agent 工作流可视化
- 交互式画布

### 3. 事件流
- 监控 25+ 种 OpenCode 事件类型：
  - Command Events: 命令执行和生命周期
  - File Events: 文件读取、写入、编辑操作
  - LSP Events: 语言服务器协议交互
  - Message Events: Agent 通信消息
  - Permission Events: 权限请求和授权
  - Server Events: 服务器生命周期和健康
  - Session Events: 会话开始、结束和管理
  - Todo Events: 任务和待办事项更新
  - Shell Events: Shell 命令执行
  - Tool Events: 工具调用和结果
  - TUI Events: 终端UI交互

### 4. 追踪时间线
- 查看 Agent 执行追踪的时间和状态信息

### 5. 统计仪表板
- 系统健康监控
- 性能指标展示

### 6. Agent 管理
- 追踪多个 Agent 在线/离线状态

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.11+, FastAPI, Pydantic |
| 前端 | React 18, TypeScript, ReactFlow, Zustand, dayjs |
| 数据库 | SQLite (开发), PostgreSQL/TimescaleDB (生产) |
| 缓存 | Redis |
| 部署 | Docker, Docker Compose |

---

## API 端点

### 健康检查
- GET `/health` - 健康检查

### 追踪管理
- GET `/api/v1/traces` - 列出所有追踪
- GET `/api/v1/traces/{trace_id}` - 通过ID获取追踪
- GET `/api/v1/traces/session/{session_id}` - 通过会话ID获取追踪
- GET `/api/v1/traces/statistics` - 获取追踪统计

### Agent 执行
- POST `/api/v1/agents/execute` - 执行Agent
- WS `/api/v1/agents/ws` - WebSocket实时更新

### 事件管理
- GET `/api/v1/events` - 列出所有事件
- POST `/api/v1/events` - 报告新事件
- GET `/api/v1/events/statistics` - 获取事件统计

---

## 当前项目状态
- 工作目录: E:\code\oc-monitor (空目录)
- 目标: 创建一个新的 OpenCode 监控系统，界面使用中文

---

---

## 详细功能分析 (来自探索任务)

### 后端API架构

#### Agent管理API
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/v1/agents` | GET | 获取所有Agent列表及状态 |
| `/api/v1/agents/execute` | POST | 执行Agent并生成追踪记录 |
| `/api/v1/agents/ws` | WebSocket | 实时通信通道 |

#### 事件管理API
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/v1/events` | POST | 上报单个事件 |
| `/api/v1/events` | GET | 获取所有事件 |
| `/api/v1/events/session/{session_id}` | GET | 获取指定会话事件 |
| `/api/v1/events/agent/{agent_id}` | GET | 获取指定Agent事件 |
| `/api/v1/events/statistics` | GET | 获取事件统计 |

#### 追踪管理API
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/v1/traces` | GET | 分页获取追踪列表 |
| `/api/v1/traces/statistics` | GET | 获取追踪统计 |
| `/api/v1/traces/session/{session_id}` | GET | 获取会话追踪 |
| `/api/v1/traces/{trace_id}` | GET | 获取单个追踪详情 |
| `/api/v1/traces/metrics/{agent_id}` | GET | 获取Agent性能指标 |
| `/api/v1/traces/cleanup` | POST | 清理过期数据 |

### 数据模型

#### 事件分类 (EventCategory)
- COMMAND - 命令执行
- FILE - 文件操作
- INSTALLATION - 安装
- LSP - 语言服务器协议
- MESSAGE - 消息
- PERMISSION - 权限
- SERVER - 服务器
- SESSION - 会话
- TODO - 待办事项
- SHELL - Shell环境
- TOOL - 工具执行
- TUI - 终端UI

#### Agent状态 (AgentStatusEnum)
- ONLINE(在线) / OFFLINE(离线) / BUSY(忙碌) / IDLE(空闲) / ERROR(错误)

#### 追踪状态 (TraceStatus)
- IDLE / PENDING / RUNNING / SUCCESS / FAILED / RETRYING

### 前端组件

1. **AgentList** - Agent列表展示，状态颜色编码
2. **FlowCanvas** - ReactFlow工作流可视化
3. **AgentExecutor** - Agent执行调试器
4. **EventStream** - 实时事件流展示
5. **MonitorPanel** - 系统监控统计面板
6. **TraceTimeline** - 追踪时间线

### 状态管理 (Zustand)
```typescript
interface AgentState {
  agents: AgentInfo[];
  events: OpenCodeEvent[];
  traces: AgentTrace[];
  statistics: Statistics | null;
  loading: boolean;
  error: string | null;
}
```

### 数据库表结构

1. **opencodecode_events** - 事件表
2. **opencodecode_agent_status** - Agent状态表
3. **agent_traces** - 追踪表
4. **agent_messages** - 消息表

### 插件系统

基于 `@opencode-ai/sdk` 实现，支持35+种事件类型：
- 事件缓冲器批量处理
- 定时刷新发送
- 阈值触发立即发送

---

---

## 用户需求确认

### 技术栈选择 ✓
| 层级 | 技术选择 | 说明 |
|------|---------|------|
| 前端 | Vue 3 + TypeScript + Naive UI | 中文友好的UI组件库 |
| 后端 | FastAPI + Python | 与OpenCodeAgent一致 |
| 数据库 | SQLite | 零配置，单文件 |
| 部署 | Docker Compose | 一键部署 |

### 功能范围 ✓
- **选择**: 仅事件监控（轻量级方案）
- **包含**: 
  - OpenCode事件采集和展示
  - 基础统计面板
  - OpenCode插件集成（实时上报事件）
- **不包含**: Agent执行、工作流可视化、追踪时间线

### 测试策略 ✓
- 不包含单元测试
- 需要Agent-Executed QA验证

### 部署方式 ✓
- Docker Compose 一键部署

---

---

## 最终需求确认 ✓

### 技术栈
| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | Composition API |
| UI组件库 | Naive UI | 中文友好 |
| 状态管理 | Pinia | Vue 3官方推荐 |
| 后端框架 | FastAPI + Python | 异步高性能 |
| 数据库 | SQLite | 零配置单文件 |
| 实时通信 | WebSocket | 实时事件推送 |
| 部署 | Docker Compose | 一键部署 |

### 功能需求
1. **事件监控**（核心功能）
   - 监控所有25+种OpenCode事件类型
   - 按会话(Session)分组展示
   - 摘要+展开详情的展示方式
   - WebSocket实时更新

2. **统计面板**
   - 总事件数统计
   - 事件类型分布图
   - 时间趋势图
   - Agent活跃度

3. **OpenCode插件集成**
   - 实时采集并上报事件
   - 支持批量事件缓冲

### 界面要求
- 单页面布局（左右分栏或上下分栏）
- 界面文字使用中文
- 左侧：统计面板
- 右侧：会话事件列表

### 不包含
- Agent执行功能
- 工作流可视化
- 追踪时间线
- 单元测试

### 测试策略
- 不包含自动化测试
- 使用Agent-Executed QA验证

---

## Metis差距分析报告

### 关键问题（需用户确认）

| # | 问题 | 影响 | 优先级 |
|---|------|------|--------|
| 1 | 插件如何与后端通信？(HTTP POST / WebSocket客户端 / SSE客户端) | 架构选择 | 关键 |
| 2 | 是本地开发还是远程部署？(决定认证需求) | 安全 | 关键 |
| 3 | 后端不可用时，插件如何处理？(内存队列/丢弃/本地文件) | 数据完整性 | 高 |
| 4 | 每小时预期的事件量是多少？(影响数据库和UI选择) | 性能 | 中 |
| 5 | 插件是与OpenCode的SSE端点直接集成还是新建集成？ | 集成方式 | 关键 |

### 风险区域

| 风险 | 建议 |
|------|------|
| 插件集成可行性 | 添加可行性验证任务 |
| 统计面板范围蔓延 | 冻结MVP范围 |
| 网络故障数据丢失 | 添加事件队列重试 |
| 大数据集性能 | 需虚拟滚动 |

### 验收标准缺失
- 需添加具体的可执行验收标准（curl命令、Playwright测试）
- 需添加性能指标（页面加载<2秒，支持10000+事件）
- 需添加部署验证（docker-compose up成功，health返回200）

---

## OpenCode插件通信机制研究

### OpenCode官方支持的通信方式

根据 https://opencode.ai/docs 的文档：

| 方式 | 说明 | 推荐 |
|------|------|------|
| **SSE** (Server-Sent Events) | OpenCode内置，通过 `/event` 端点订阅事件流 | 外部监控系统 |
| **HTTP API** | 插件内使用 `curl` 或 `axios` 发送HTTP请求 | 插件上报 ⭐ |
| **SDK** | `@opencode-ai/sdk` 提供客户端API | 深度集成 |

### 推荐方案

**选择**：OpenCode插件 + HTTP POST上报

原因：
1. 插件可以直接监听所有事件类型
2. HTTP POST实现简单可靠
3. 可以在插件内添加缓冲和重试逻辑
4. 符合OpenCode官方插件开发模式

### 通信流程

```
OpenCode运行时
    ↓ 事件触发
OpenCodePlugin (监听event钩子)
    ↓ HTTP POST (curl/axios)
FastAPI后端 (POST /api/v1/events)
    ↓ 保存
SQLite数据库
    ↓ WebSocket推送
Vue前端 (实时更新显示)
```

---

## 用户最终确认 ✓

| 决策项 | 用户选择 |
|--------|---------|
| 通信机制 | HTTP POST（通过OpenCode插件上报） |
| 使用场景 | 本地开发调试（无需认证） |
| 错误处理 | 内存队列+重试 |
| 数据量 | 每小时<1000条 |
| 集成方式 | 独立OpenCode插件 |

---

## 清除检查 ✓
- [x] 核心目标明确 - OpenCode事件监控系统
- [x] 范围边界已建立 - 仅事件监控
- [x] 技术方案已确定 - Vue 3 + FastAPI + HTTP POST
- [x] 测试策略已确认 - 无单元测试，Agent-Executed QA
- [x] Metis审查完成 - 所有关键问题已确认
- [x] OpenCode通信机制研究完成 - SSE/HTTP POST方案已确定

**状态**: 准备生成工作计划 ✓
