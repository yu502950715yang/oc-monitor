# 活动流重构调研报告

## 数据库结构确认

### SQLite 表结构 (opencode.db)
- **session**: id, project_id, parent_id, title, directory, time_created, time_updated
- **message**: id, session_id, time_created, time_updated, **data (JSON文本)**
- **part**: id, message_id, session_id, time_created, time_updated, **data (JSON文本)**

### Message data 格式
```json
{
  "role": "user",
  "time": {"created": 1772169498271},
  "summary": {"diffs": []},
  "agent": "Sisyphus (Ultraworker)",
  "model": {"providerID": "...", "modelID": "..."}
}
```

### Part data 格式 (工具调用)
```json
{
  "type": "tool",
  "tool": "grep",
  "state": {
    "status": "completed",  // pending, running, in_progress, completed
    "input": { "pattern": "...", "path": "..." },
    "output": "...",
    "title": "",
    "time": { "start": 1772169507800, "end": 1772169508360 }
  }
}
```

### Part 类型
- text: 文本内容
- step-start: 步骤开始
- step-finish: 步骤结束
- reasoning: 推理过程
- tool: 工具调用 (核心)

## 问题根源

1. 后端 parser.ts 尝试查询独立列 (type, tool, state) 但实际数据在 data JSON 字段中
2. 前端只显示 message 的 agent/role 字段，没有解析工具调用
3. 缺少 formatCurrentAction 逻辑来展示有意义的工具描述

## 需要实现的功能

### 后端
1. 修改 SQLite 查询，正确解析 JSON data 字段
2. 添加 part 解析逻辑
3. 实现 formatCurrentAction 函数
4. 添加获取活动流的 API (messages + parts)

### 前端
1. 更新 Activity 类型定义
2. 解析工具调用数据
3. 展示工具调用: "Running grep for 'pattern'", "Reading file.txt"
4. 展示步骤开始/结束事件

## 参考: 原项目 activityLogic.ts
- TOOL_DISPLAY_NAMES: 工具显示名称映射
- formatCurrentAction: 格式化工具调用为可读文本
- getSessionActivityState: 获取会话活动状态

---

## Skill/MCP 追踪调研结果

### 当前状态: 没有原生追踪

**关键发现**: OpenCode 和 Claude Code 目前都 **没有原生 skill/MCP 调用追踪功能**。

### 官方文档来源
- OpenCode Skills 文档: https://opencode.ai/docs/skills/
- OpenCode MCP 文档: https://opencode.ai/docs/mcp-servers/

### Skill 文件位置
- 项目级: `.opencode/skills/<name>/SKILL.md`
- 全局: `~/.config/opencode/skills/<name>/SKILL.md`
- 也支持 Claude 兼容位置

### Skill 调用方式
通过 `skill` 工具调用:
```
skill({ name: "skill-name" })
```

### MCP 配置
在 `opencode.json` 的 `mcp` 部分配置

### 追踪现状
当前会话元数据只记录聚合工具计数:
```json
{ "tool_counts": { "Skill": 3 } }
```
但**不记录**具体是哪个 skill 被调用。

### 可行的追踪方案

#### 方案 1: 从工具名称推断 MCP
- `context7_*` → Context7 MCP 工具
- `websearch_*` → Web 搜索 MCP
- 从 part 表的 tool 字段可以获取

#### 方案 2: 创建自定义监控方案
- 需要 OpenCode 扩展支持或等待原生功能

#### 方案 3: 解析日志文件
- 检查 `~/.local/share/opencode/log/` 目录