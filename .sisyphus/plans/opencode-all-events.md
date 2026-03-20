# OpenCode 全事件类型监控计划

## TL;DR

> 监控并展示全部 25+ 种 OpenCode 事件类型，包括 command、file、installation、lsp、message、permission、server、session、todo、shell、tool、tui 等类别。

**交付物**:
- 插件更新：监听全部 25+ 事件类型
- 后端更新：存储完整事件信息
- 前端更新：显示所有事件类型分布统计

**预计工作量**: 小
**执行方式**: 顺序执行

---

## Context

### 原始需求
用户想要监控所有 25+ 种 OpenCode 事件类型，而不是目前仅监控的 5 种。

### OpenCode 官方文档事件类型列表 (25种)

| 类别 | 事件类型 | 数量 |
|------|----------|------|
| Command | command.executed | 1 |
| File | file.edited, file.watcher.updated | 2 |
| Installation | installation.updated | 1 |
| LSP | lsp.client.diagnostics, lsp.updated | 2 |
| Message | message.part.removed, message.part_updated, message.removed, message.updated | 4 |
| Permission | permission.asked, permission.replied | 2 |
| Server | server.connected | 1 |
| Session | session.created, session.compacted, session.deleted, session.diff, session.error, session.idle, session.status, session.updated | 8 |
| Todo | todo.updated | 1 |
| Shell | shell.env | 1 |
| Tool | tool.execute.after, tool.execute.before | 2 |
| TUI | tui.prompt.append, tui.command.execute, tui.toast.show | 3 |

---

## Work Objectives

### 核心目标
- 插件能够监听并上报全部 25+ 种事件类型
- 前端统计面板正确显示所有事件类型的分布
- 清除旧数据，重新开始收集干净的数据

### 交付物
1. 更新的 monitor.js 插件（监听全部事件）
2. 更新的后端统计 API
3. 重置后的数据库

---

## Verification Strategy

**验证方式**: 手动测试 + API 调用

### QA Scenarios

**Scenario: 验证插件监听所有事件类型**
- 工具: 重启 OpenCode 使插件生效
- 预期: OpenCode 运行后，API 能接收到各种类型的事件

**Scenario: 验证事件类型统计**
- 工具: curl http://localhost:7000/api/v1/statistics
- 预期: event_types 包含所有 25+ 种事件类型

**Scenario: 验证前端显示**
- 工具: 浏览器访问 http://localhost:3000
- 预期: 事件类型分布显示所有类别

---

## Execution Strategy

### 执行顺序（全部顺序执行）

1. 更新插件监听全部事件类型
2. 后端已支持 session_id 提取（无需修改）
3. 前端已支持事件类型统计（无需修改）
4. 重置数据库
5. 重启后端服务

---

## TODOs

- [ ] 1. 更新插件监听全部 25+ 事件类型

  **What to do**:
  - 编辑 `C:\Users\0009\.config\opencode\plugins\monitor.js`
  - 将 TARGET_EVENTS 数组扩展为包含全部 25+ 事件类型
  - 事件类型及其中文解释：

  | 事件类型 | 中文解释 |
  |----------|----------|
  | **Command (命令)** | |
  | command.executed | 命令执行完成 |
  | **File (文件)** | |
  | file.edited | 文件被编辑 |
  | file.watcher.updated | 文件监视器更新 |
  | **Installation (安装)** | |
  | installation.updated | 安装信息更新 |
  | **LSP (语言服务器)** | |
  | lsp.client.diagnostics | LSP 诊断信息 |
  | lsp.updated | LSP 状态更新 |
  | **Message (消息)** | |
  | message.part.removed | 消息部分被删除 |
  | message.part.updated | 消息部分被更新 |
  | message.removed | 消息被删除 |
  | message.updated | 消息被更新 |
  | **Permission (权限)** | |
  | permission.asked | 请求权限 |
  | permission.replied | 权限回复 |
  | **Server (服务器)** | |
  | server.connected | 服务器连接 |
  | **Session (会话)** | |
  | session.created | 会话创建 |
  | session.compacted | 会话被压缩 |
  | session.deleted | 会话被删除 |
  | session.diff | 会话差异 |
  | session.error | 会话错误 |
  | session.idle | 会话空闲 |
  | session.status | 会话状态更新 |
  | session.updated | 会话更新 |
  | **Todo (待办)** | |
  | todo.updated | 待办事项更新 |
  | **Shell (终端)** | |
  | shell.env | 终端环境变量 |
  | **Tool (工具)** | |
  | tool.execute.after | 工具执行后 |
  | tool.execute.before | 工具执行前 |
  | **TUI (界面)** | |
  | tui.prompt.append | 界面追加提示 |
  | tui.command.execute | 界面命令执行 |
  | tui.toast.show | 界面显示通知 |

  **QA Scenarios**:
  - 重启 OpenCode 后，执行各种操作（命令、文件编辑、权限请求等）
  - 调用 curl http://localhost:7000/api/v1/events?limit=10 验证接收到新事件类型

- [ ] 2. 重置数据库清除旧数据

  **What to do**:
  - 执行 curl -X POST http://localhost:7000/api/v1/events/reset 清除旧数据

  **QA Scenarios**:
  - curl http://localhost:7000/api/v1/statistics 验证 total_events = 0

- [ ] 3. 重启后端服务

  **What to do**:
  - 停止现有 Python 进程
  - 启动新的后端服务

  **QA Scenarios**:
  - curl http://localhost:7000/health 验证服务正常运行

---

## Success Criteria

- [ ] 插件 TARGET_EVENTS 包含全部 25+ 事件类型
- [ ] 数据库已重置，事件数为 0
- [ ] 后端服务正常运行
- [ ] OpenCode 产生的各种事件都能被正确捕获

---

## 执行过程使用的工具

### 本次执行使用的能力
由于任务较为直接，本次执行主要使用基础工具：

| 工具 | 用途 |
|------|------|
| **edit** | 修改 monitor.js 插件文件 |
| **bash** | 执行 curl 命令测试 API、重置数据库、重启服务 |
| **read** | 确认文件修改结果 |

### Skills/MCP 需求分析
本次任务**不需要**使用以下 Skills/MCP：
- **vue-best-practices**: 无需修改 Vue 代码
- **playwright**: 无需浏览器自动化测试
- **git-master**: 无需 git 操作

如需更复杂的任务（如前端 UI 调整），可考虑：
- `visual-engineering`: 前端 UI/UX 调整
- `frontend-design`: 界面设计优化

---

## Commit Strategy

无需提交（本地开发调试）