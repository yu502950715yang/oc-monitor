# OpenCode 全事件类型监控计划

## 需求
监控所有 25+ 种 OpenCode 事件类型并展示在前端界面上。

## 已确认的事件类型 (25种)

### Command (1)
- `command.executed`

### File (2)
- `file.edited`
- `file.watcher.updated`

### Installation (1)
- `installation.updated`

### LSP (2)
- `lsp.client.diagnostics`
- `lsp.updated`

### Message (4)
- `message.part.removed`
- `message.part.updated`
- `message.removed`
- `message.updated`

### Permission (2)
- `permission.asked`
- `permission.replied`

### Server (1)
- `server.connected`

### Session (8)
- `session.created`
- `session.compacted`
- `session.deleted`
- `session.diff`
- `session.error`
- `session.idle`
- `session.status`
- `session.updated`

### Todo (1)
- `todo.updated`

### Shell (1)
- `shell.env`

### Tool (2)
- `tool.execute.after`
- `tool.execute.before`

### TUI (3)
- `tui.prompt.append`
- `tui.command.execute`
- `tui.toast.show`

## 技术决策
- 继续使用轮询作为实时更新方式（WebSocket 有连接问题）
- 保持现有的前端轮询后备机制

## 待确认
- 是否需要重置数据库清除旧数据？