# 活动流功能重构计划

## TL;DR

> **快速摘要**: 重构活动流功能，从 SQLite 数据库正确解析工具调用数据，并在前端展示有意义的活动信息（工具调用、步骤开始/结束等）。

> **交付物**:
> - 后端正确解析 SQLite 中的 JSON data 字段
> - 新增 parts API 端点
> - 前端显示工具调用详情（如 "Running grep for 'pattern'"）
> - 显示步骤开始/结束事件

> **预估工作量**: 中等
> **并行执行**: 是
> **关键路径**: parser.ts 修改 → API 调整 → 前端展示

---

## 背景

### 问题描述
当前活动流只显示毫无意义的 agent/role 字段，没有展示实际的工具调用和代理活动。

### 根因分析
1. **后端 parser.ts 问题**: 尝试查询独立的 type/tool/state 列，但实际数据存储在 JSON 格式的 data 字段中
2. **前端数据转换问题**: 只处理 messages，没有处理 parts（工具调用）
3. **展示层问题**: 缺少 formatCurrentAction 逻辑来展示可读的工具描述

### OpenCode 数据存储结构 (已确认)

**核心表**:
| 表名 | 用途 | 关键字段 |
|------|------|----------|
| session | 会话 | id, project_id, **parent_id**, title, directory, **summary_additions**, **summary_deletions**, **summary_files** |
| message | 消息 | id, session_id, **data (JSON)** - 包含 role, agent, model |
| part | 工具调用 | id, message_id, session_id, **data (JSON)** - 包含 type, tool, state |
| todo | 任务列表 | session_id, content, status (completed/in_progress), priority, position |
| project | 项目 | id, name, worktree (工作目录路径) |

**Part 类型分布** (已验证):
| 类型 | 数量 | 用途 |
|------|------|------|
| tool | ~60% | 工具调用 (read, write, grep, bash, glob 等) |
| reasoning | ~20% | AI 推理过程 |
| patch | ~15% | 代码补丁 |
| step-start/step-finish | ~3% | 步骤边界 |
| compaction | ~1% | 上下文压缩 |
| file | <1% | 文件操作 |
| agent | <1% | 代理启动 |

**Part tool 类型**:
- read, write, edit, bash, grep, glob - 文件操作
- task, subtask, agent - 代理委托
- todowrite, todoread - 任务管理
- webfetch - 网页获取
- lsp_* - LSP 工具
- compaction - 上下文压缩

**Session 层级**:
- parent_id 支持子会话 (如 @Sisyphus-Junior subagent)
- 子会话标题格式: "Generate xxx (@agent-name subagent)"

---

## 工作目标

### 扩展功能 (基于数据分析)

除了核心活动流，还可以实现：
1. **会话统计面板** - 显示 summary_additions/deletions/files
2. **TODO 列表** - 从 todo 表获取当前会话任务
3. **文件修改追踪** - 显示 patch 类型数据
4. **推理过程展示** - 显示 reasoning 类型
5. **会话层级树** - 展示 parent-child 关系

### 核心目标
实现与原项目 ocwatch-main 类似的完整活动流展示：
- 工具调用: "Running grep for 'Atlas'", "Reading file.ts"
- 步骤事件: step-start, step-finish
- 推理过程: reasoning

### 具体交付物
1. 后端正确解析 SQLite 中的 JSON data 字段
2. 新增 `/api/sessions/:id/parts` 端点获取工具调用
3. 实现 formatCurrentAction 函数（从原项目迁移）
4. 前端正确显示工具调用详情

---

## 验证策略

### 测试决策
- **基础设施**: 已存在 (bun test / vitest)
- **自动化测试**: 需要添加 - 在实现过程中添加测试
- **框架**: vitest
- **QA 策略**: 所有任务必须包含 Agent-Executed QA 场景

### 验证命令
```bash
# 后端解析
curl http://localhost:50234/api/sessions | jq '.[0]'

# 活动流数据
curl http://localhost:50234/api/sessions/{id}/activity | jq '.parts[0]'

# 前端验证
# 打开应用，选择会话，活动流应显示工具调用详情
```

---

## 执行策略

### 并行执行波浪

```
Wave 1 (立即开始 - 基础设施):
├── T1: 修改 parser.ts - 正确解析 JSON data 字段 [quick]
├── T2: 添加 part 查询函数 - getPartsForSession [quick]
└── T3: 创建 activityLogic.ts - formatCurrentAction + TOOL_DISPLAY_NAMES [quick]

Wave 2 (Wave 1 后 - API 层):
├── T4: 修改 sessions.ts - 返回完整 activity (messages + parts) [quick]
├── T5: 添加 parts API 端点 [quick]
└── T6: 更新类型定义 - PartMeta, ActivityItem [quick]

Wave 3 (Wave 2 后 - 前端):
├── T7: 更新 Activity 类型 - 支持 tool/call 类型 [quick]
├── T8: 修改 AppContext.tsx - 正确解析 parts 数据 [quick]
├── T9: 更新 ActivityStream.tsx - 展示工具调用详情 [quick]
└── T10: 添加工具显示名称中文映射 [quick]

Wave FINAL:
├── F1: 整体功能测试 [unspecified-high]
└── F2: 验证活动流显示正确 [unspecified-high]
```

### 依赖矩阵
- T1, T2, T3: 无依赖 (并行)
- T4, T5, T6: 依赖 T1, T2
- T7, T8, T9, T10: 依赖 T4, T5, T6
- F1, F2: 依赖 Wave 3 全部

---

## TODOs

- [x] 1. 修改 parser.ts - 正确解析 SQLite JSON data 字段

  **工作内容**:
  - 修改 queryMessagesFromSqlite: 解析 data 字段 JSON
  - 修改 queryPartsFromSqlite: 解析 data 字段 JSON，提取 type/tool/state
  - 确保 time 字段正确解析

  **推荐 Agent Profile**:
  - Category: `quick`
  - Skills: []
  - Reason: 文件解析逻辑修改，相对简单

  **并行化**:
  - 可并行: 是
  - 波浪: Wave 1
  - 阻塞: 无
  - 被阻塞: T4, T5

  **参考**:
  - `electron/main/services/storage/parser.ts` - 当前实现
  - 数据库表结构: message(id, session_id, data), part(id, message_id, session_id, data)
  - sample data: `{"type":"tool","tool":"grep","state":{...}}`

  **验收标准**:
  - [x] getMessagesForSession 返回解析后的 data 对象
  - [x] getPartsForSession 返回解析后的 type/tool/state

  **QA 场景**:
  ```
  场景: 验证消息解析正确
    Tool: Bash
    Preconditions: OpenCode DB 存在
    Steps:
      1. 运行 getMessagesForSession('ses_xxx')
      2. 检查返回的 message 对象是否包含解析后的 data
      3. 验证 agent 字段存在
    Expected Result: data.agent 字段等于 "Sisyphus (Ultraworker)"
    Evidence: console output

  场景: 验证工具调用解析正确
    Tool: Bash
    Preconditions: OpenCode DB 存在
    Steps:
      1. 运行 getPartsForSession('ses_xxx')
      2. 检查返回的 part 对象
    Expected Result: part.type === "tool", part.tool 存在
    Evidence: console output
  ```

- [x] 2. 添加 part 查询函数 - getPartsForSession

  **工作内容**:
  - 确保已存在的 getPartsForSession 正确工作
  - 添加测试验证数据返回

  **推荐 Agent Profile**:
  - Category: `quick`
  - Skills: []

  **并行化**:
  - 可并行: 是 (与 T1, T3)
  - 波浪: Wave 1

- [x] 3. 创建 activityLogic.ts - formatCurrentAction + TOOL_DISPLAY_NAMES

  **工作内容**:
  - 从原项目迁移 TOOL_DISPLAY_NAMES
  - 迁移 formatCurrentAction 函数
  - 支持的工具: read, write, edit, bash, grep, glob, task, webfetch, agent, todowrite 等

  **推荐 Agent Profile**:
  - Category: `quick`
  - Skills: []
  - Reason: 纯函数逻辑迁移，不需要深入探索

  **并行化**:
  - 可并行: 是 (与 T1, T2)
  - 波浪: Wave 1
  - 阻塞: 无
  - 被阻塞: T9

  **参考**:
  - `E:\code\oc-monitor-java\ocwatch-main\src\server\logic\activityLogic.ts` - 原项目实现

  **验收标准**:
  - [x] formatCurrentAction(part) 返回格式化字符串
  - [x] "Reading file.txt", "Running grep for 'pattern'"

- [x] 4. 修改 sessions.ts API - 返回完整 activity 数据

  **工作内容**:
  - 修改 /api/sessions/:id/activity 端点
  - 同时返回 messages 和 parts
  - 添加 parts 字段到响应

  **推荐 Agent Profile**:
  - Category: `quick`
  - Skills: []

  **并行化**:
  - 可并行: 否
  - 波浪: Wave 2
  - 阻塞: T1, T2
  - 被阻塞: T7, T8

  **参考**:
  - `electron/main/routes/sessions.ts` - 当前实现

  **验收标准**:
  - [ ] /api/sessions/:id/activity 返回 { session, messages, parts }

- [ ] 5. 添加 parts API 端点

  **工作内容**:
  - 添加 /api/sessions/:id/parts 端点
  - 返回指定会话的所有工具调用

  **推荐 Agent Profile**:
  - Category: `quick`

- [ ] 6. 更新类型定义 - PartMeta, ActivityItem

  **工作内容**:
  - 更新 PartMeta 接口以匹配新的数据结构
  - 添加 ActivityItem 类型

  **推荐 Agent Profile**:
  - Category: `quick`

- [ ] 7. 更新 Activity 类型 - 支持工具调用

  **工作内容**:
  - 修改 Activity 接口
  - 添加 type: 'tool-call' | 'step-start' | 'step-finish' | 'reasoning'
  - 添加 toolName, input, status 等字段

  **推荐 Agent Profile**:
  - Category: `quick`
  - Skills: []

  **并行化**:
  - 可并行: 否
  - 波浪: Wave 3
  - 阻塞: T4, T5

  **参考**:
  - `src/renderer/src/components/ActivityStream.tsx` - 当前类型
  - `src/renderer/src/hooks/useApi.ts` - Activity 类型

  **QA 场景**:
  ```
  场景: 验证 Activity 类型扩展
    Tool: TypeScript check
    Steps:
      1. 运行 tsc --noEmit
      2. 检查无类型错误
    Expected Result: 编译通过
  ```

- [ ] 8. 修改 AppContext.tsx - 正确解析 parts 数据

  **工作内容**:
  - 修改 useEffect 中的数据转换逻辑
  - 从 parts 数组生成 Activity 项
  - 使用 formatCurrentAction 格式化工具调用文本

  **推荐 Agent Profile**:
  - Category: `quick`
  - Skills: []

  **并行化**:
  - 可并行: 是 (与 T7, T9, T10)
  - 波浪: Wave 3

  **参考**:
  - `src/renderer/src/context/AppContext.tsx:60-74` - 当前转换逻辑

  **验收标准**:
  - [ ] activities 包含工具调用类型的项
  - [ ] content 字段格式正确，如 "Searching test"

- [ ] 9. 更新 ActivityStream.tsx - 展示工具调用详情

  **工作内容**:
  - 更新 UI 展示工具调用
  - 添加 tool 图标和颜色
  - 显示输入参数预览

  **推荐 Agent Profile**:
  - Category: `visual-engineering`
  - Skills: ["vue-best-practices"]
  - Reason: UI 组件修改，需要 Vue 最佳实践

  **并行化**:
  - 可并行: 是 (与 T7, T8, T10)
  - 波浪: Wave 3
  - 阻塞: T3

  **参考**:
  - `src/renderer/src/components/ActivityStream.tsx` - 当前实现

  **QA 场景**:
  ```
  场景: 验证工具调用显示
    Tool: Playwright
    Preconditions: 应用运行，会话已选择
    Steps:
      1. 打开活动流面板
      2. 查找包含工具名称的元素
    Expected Result: 显示 "工具: grep - 搜索 pattern"
    Evidence: screenshot
  ```

- [ ] 10. 添加工具显示名称中文映射

  **工作内容**:
  - 在前端添加 TOOL_DISPLAY_NAMES 中文映射
  - grep → 搜索, read → 读取, write → 写入, bash → 运行

  **推荐 Agent Profile**:
  - Category: `quick`

---

## 最终验证波浪

- [ ] F1. 整体功能测试

  运行完整流程，验证数据从数据库到前端的完整性。

- [ ] F2. 验证活动流显示正确

  打开应用，确认活动流显示有意义的工具调用信息。

---

## 成功标准

### 验证命令
```bash
# 1. 获取会话列表
curl http://localhost:50234/api/sessions

# 2. 获取活动数据（包含 parts）
curl http://localhost:50234/api/sessions/{session-id}/activity | jq '.parts[0]'

# 3. 验证响应结构
# 预期: { session: {...}, messages: [...], parts: [...] }
```

### 最终检查清单
- [ ] 后端正确解析 SQLite JSON data 字段
- [ ] parts 数据包含 type, tool, state
- [ ] formatCurrentAction 返回格式化字符串
- [ ] 前端显示工具调用详情
- [ ] 显示中文工具名称（读取、搜索、运行等）