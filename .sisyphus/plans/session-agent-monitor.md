# 会话智能体实时监控 - 工作计划

## TL;DR

> **快速摘要**：为 OpenCode 监控系统添加智能体级别的实时监控功能，从现有事件数据中提取 Agent 信息，展示每个智能体的状态、执行的操作和实时输出。

> **交付物**：
> - 后端 API：`/api/v1/sessions/{id}/agents` - 获取会话中的智能体列表
> - 后端 API：`/api/v1/sessions/{id}/agents/{agent_name}/events` - 获取智能体活动
> - 前端组件：AgentList（智能体列表）+ AgentActivity（智能体活动详情）
> - 三栏布局：会话列表 | 智能体列表 | 智能体活动详情

> **预估工作量**：中等
> **并行执行**：是（后端 API 和前端组件可并行开发）
> **关键路径**：后端智能体提取逻辑 → API 端点 → 前端组件 → 集成测试

---

## 背景

### 原始需求
> "监控每个会话，能看到每个智能体实时都做了些什么"

### 访谈总结

**关键讨论点**：
- 监控对象：OpenCode 的 Agent（如 Prometheus、Metis、build、oracle 等）
- 展示内容：完整监控（状态 + 操作 + 输出内容 + 实时日志）
- 数据来源：从现有事件数据中提取（无需修改 monitor.js 插件）

**研究结果**：
- 现有事件数据已包含丰富的智能体信息：
  - `message.updated` 事件的 `properties.info.agent` 字段包含 Agent 名称
  - `message.part.updated` (type: "tool") 事件包含工具执行详情（状态、输入、输出）
  - `session.status` 事件包含会话状态（busy/idle）
- 无需修改插件，所有数据已存在于现有事件中

### Metis 审查结果

**识别的边界（已处理）**：
- ✅ 确认插件无需修改 - 现有数据已足够
- ✅ 确认使用现有 events 表的 metadata 字段
- ✅ 确认不添加新的数据库表
- ✅ 确认不添加实时流（使用现有的 WebSocket + 轮询）

**边缘情况（已包含）**：
- Agent 名称为空时的处理
- 工具输出过长时的截断
- 无事件时的空状态显示

---

## 工作目标

### 核心目标
为每个会话显示参与其中的智能体列表，并展示每个智能体的实时活动（执行的操作、输出内容、状态变化）。

### 具体交付物
1. **后端 API**：
   - 修改 `/api/v1/sessions` 返回正确的 `agent_count`
   - 新增 `/api/v1/sessions/{session_id}/agents` - 获取智能体列表
   - 新增 `/api/v1/sessions/{session_id}/agents/{agent_name}/events` - 获取智能体活动

2. **前端组件**：
   - `AgentList.vue` - 显示会话中的智能体列表及状态
   - `AgentActivity.vue` - 显示智能体的实时活动详情

3. **布局调整**：
   - 修改 App.vue 为三栏布局
   - 左侧：会话列表
   - 中间：智能体列表
   - 右侧：智能体活动详情

### 完成定义
- [ ] 后端 API 返回正确的智能体数量和列表
- [ ] 前端可以查看每个智能体的活动
- [ ] 实时更新通过现有 WebSocket 工作
- [ ] 边缘情况（如无数据、超长输出）已处理

### 必须包含
- 智能体名称显示
- 智能体状态（空闲/运行中/已完成）
- 智能体执行的操作列表
- 操作的实时输出显示

### 禁止包含
- 跨会话的智能体跟踪
- 智能体资源使用监控（数据不存在）
- 新的数据库表
- 修改 monitor.js 插件代码

---

## 验证策略

### 测试决策
- **基础设施已存在**：是（Vitest）
- **自动化测试**：TDD 模式
- **框架**：Vitest（前端）+ pytest（后端）

### QA 策略
每个任务必须包含可执行的 QA 场景（使用 Agent-Executed QA）：
- **前端/UI**：使用 Playwright 打开浏览器，导航到页面，点击智能体，验证显示
- **后端/API**：使用 curl 发送请求，验证响应 JSON 结构和字段

---

## 执行策略

### 并行执行阶段

```
Wave 1（立即开始 - 基础搭建）：
├── 任务 1: 后端 - 智能体提取工具函数 [quick]
├── 任务 2: 后端 - 修改 Sessions API 增加 agent_count [quick]
├── 任务 3: 前端 - 添加智能体类型定义 [quick]
├── 任务 4: 前端 - AgentList 组件基础结构 [quick]
└── 任务 5: 前端 - AgentActivity 组件基础结构 [quick]

Wave 2（Wave 1 完成后 - 核心功能）：
├── 任务 6: 后端 - 新增 Agents API 端点 [unspecified-high]
├── 任务 7: 前端 - AgentList 智能体列表功能 [visual-engineering]
├── 任务 8: 前端 - AgentActivity 活动详情功能 [visual-engineering]
├── 任务 9: 前端 - 修改 App.vue 三栏布局 [visual-engineering]
└── 任务 10: 前端 - 集成 WebSocket 实时更新 [unspecified-high]

Wave 3（Wave 2 完成后 - 边缘情况与优化）：
├── 任务 11: 后端 - 边缘情况处理（空 agent、长输出截断）[quick]
├── 任务 12: 前端 - 边缘情况 UI 处理 [quick]
└── 任务 13: 前端 - 单元测试 [unspecified-high]

Wave FINAL（所有任务完成后 - 4 个并行审查）：
├── 任务 F1: 计划合规审查 (oracle)
├── 任务 F2: 代码质量审查 (unspecified-high)
├── 任务 F3: 真实手动 QA (unspecified-high)
└── 任务 F4: 范围忠诚度检查 (deep)
-> 呈现结果 -> 获取用户明确确认
```

### 依赖矩阵
- 任务 1-5：无依赖，可并行
- 任务 6：依赖任务 1
- 任务 7-9：依赖任务 3-5
- 任务 10：依赖任务 7-9
- 任务 11：依赖任务 6
- 任务 12：依赖任务 7-8
- 任务 13：依赖任务 7-12
- F1-F4：依赖所有实现任务

---

## 待办事项

- [x] 1. **后端 - 智能体提取工具函数**

  **实现内容**：
  - 创建 `backend/app/utils/agent_extractor.py`
  - 实现从事件中提取智能体信息的函数
  - 解析 `message.updated` 事件的 `metadata.properties.info.agent` 字段
  - 实现按智能体聚合事件的逻辑

  **禁止事项**：
  - 不创建新的数据库表
  - 不修改现有事件存储逻辑

  **推荐 Agent 类别**：
  - **分类**：`unspecified-high` - 需要理解现有事件数据结构和 JSON 解析
  - **技能**：无特殊技能需求
  - **评估但省略的技能**：无需省略

  **并行化**：
  - **可并行运行**：是
  - **并行组**：Wave 1（与任务 2-5 并行）
  - **阻塞**：无
  - **被阻塞**：任务 6

  **参考**：
  - `backend/app/storage/event_store.py` - 事件存储结构
  - 数据库查询示例：`SELECT metadata FROM events WHERE event_type = 'message.updated'`
  - metadata 字段结构：`data.properties.info.agent`

  **验收标准**：
  - [ ] 函数 `extract_agents(events)` 返回唯一的智能体名称列表
  - [ ] 函数 `get_agent_stats(events, agent_name)` 返回智能体事件统计
  - [ ] 处理 agent 字段为空的情况（返回空列表，不崩溃）
  - [ ] 单元测试通过

  **QA 场景**：
  ```
  场景：提取智能体信息
    工具：Bash (Python REPL)
    前提条件：已有测试事件数据
    步骤：
      1. 导入 agent_extractor 模块
      2. 调用 extract_agents(events) 函数
    预期结果：返回 ["Prometheus", "Metis"] 等智能体名称列表
    失败指示：返回空列表或抛出异常
    证据：.sisyphus/evidence/task-1-agent-extraction.json

  场景：空 agent 字段处理
    工具：Bash (Python REPL)
    前提条件：事件中 agent 字段为空
    步骤：
      1. 传入 agent 字段为 null 的事件
      2. 调用 extract_agents
    预期结果：返回空列表，不抛出异常
    失败指示：抛出 KeyError 或返回 null
    证据：.sisyphus/evidence/task-1-null-agent.json
  ```

  **提交**：是
  - 信息：`backend/app/utils/agent_extractor.py`
  - 提交前：pytest tests/


- [x] 2. **后端 - 修改 Sessions API 增加 agent_count**

  **实现内容**：
  - 修改 `backend/app/api/sessions.py` 中的 `get_sessions` 函数
  - 使用任务 1 的智能体提取函数
  - 为每个会话返回正确的 `agent_count`

  **禁止事项**：
  - 不修改数据库结构
  - 不改变 API 响应格式（保持向后兼容）

  **推荐 Agent 类别**：
  - **分类**：`quick` - 小修改，只需调用现有函数

  **并行化**：
  - **可并行运行**：是
  - **并行组**：Wave 1（与任务 1, 3-5 并行）
  - **阻塞**：无
  - **被阻塞**：任务 6

  **参考**：
  - `backend/app/api/sessions.py:46-77` - 现有 Sessions API 实现

  **验收标准**：
  - [ ] `GET /api/v1/sessions` 返回的每个会话包含 `agent_count > 0`
  - [ ] 对于无事件的会话，`agent_count = 0`

  **QA 场景**：
  ```
  场景：验证 agent_count 正确返回
    工具：Bash (curl)
    前提条件：后端服务运行中
    步骤：
      1. curl http://localhost:7000/api/v1/sessions
    预期结果：JSON 响应中每条会话记录包含 agent_count 字段，数值大于 0
    失败指示：agent_count 始终为 0
    证据：.sisyphus/evidence/task-2-agent-count.json
  ```

  **提交**：是
  - 文件：`backend/app/api/sessions.py`


- [x] 3. **前端 - 添加智能体类型定义**

  **实现内容**：
  - 在 `frontend/src/types/index.ts` 中添加：
    - `Agent` 类型：智能体信息（名称、事件数、状态）
    - `AgentActivity` 类型：智能体活动（操作类型、输入、输出、时间）

  **禁止事项**：
  - 不改变现有的类型定义

  **推荐 Agent 类别**：
  - **分类**：`quick` - 纯类型定义，简单任务

  **并行化**：
  - **可并行运行**：是
  - **并行组**：Wave 1（与任务 1-2, 4-5 并行）
  - **阻塞**：无
  - **被阻塞**：任务 7-8

  **参考**：
  - `frontend/src/types/index.ts` - 现有类型定义

  **验收标准**：
  - [x] `Agent` 类型包含：`name`, `eventCount`, `status`
  - [x] `AgentActivity` 类型包含：`type`, `input`, `output`, `timestamp`

  **QA 场景**：
  ```
  场景：类型定义正确
    工具：TypeScript 编译器
    前提条件：修改后的类型文件
    步骤：
      1. 运行 npx tsc --noEmit
    预期结果：无类型错误
    失败指示：类型错误
    证据：.sisyphus/evidence/task-3-types.txt
  ```

  **提交**：是
  - 文件：`frontend/src/types/index.ts`


- [x] 4. **前端 - AgentList 组件基础结构**

  **实现内容**：
  - 创建 `frontend/src/components/AgentList.vue`
  - 显示会话中的智能体列表
  - 显示智能体状态（运行中/空闲/已完成）
  - 显示事件数量

  **禁止事项**：
  - 不实现数据获取逻辑（任务 7 负责）

  **推荐 Agent 类别**：
  - **分类**：`visual-engineering` - UI 组件开发

  **并行化**：
  - **可并行运行**：是
  - **并行组**：Wave 1（与任务 1-3, 5 并行）
  - **阻塞**：无
  - **被阻塞**：任务 7, 9

  **参考**：
  - `frontend/src/components/SessionList.vue` - 类似的列表组件结构

  **验收标准**：
  - [x] 组件渲染智能体列表
  - [x] 显示智能体名称、状态、事件数
  - [x] 点击智能体时触发选择事件
  - [x] 空状态显示 "暂无智能体数据"

  **QA 场景**：
  ```
  场景：渲染智能体列表
    工具：Playwright
    前提条件：前端运行中，已选择一个会话
    步骤：
      1. 打开浏览器访问 http://localhost:5173
      2. 选择一个会话
      3. 验证中间栏显示智能体列表
    预期结果：显示智能体名称和状态
    失败指示：空白或错误
    证据：.sisyphus/evidence/task-4-agent-list.png
  ```

  **提交**：是
  - 文件：`frontend/src/components/AgentList.vue`


- [x] 5. **前端 - AgentActivity 组件基础结构**

  **实现内容**：
  - 创建 `frontend/src/components/AgentActivity.vue`
  - 显示选定智能体的活动详情
  - 显示操作类型、输入参数、输出内容
  - 按时间倒序排列

  **禁止事项**：
  - 不实现数据获取逻辑

  **推荐 Agent 类别**：
  - **分类**：`visual-engineering` - UI 组件开发

  **并行化**：
  - **可并行运行**：是
  - **并行组**：Wave 1（与任务 1-4 并行）
  - **阻塞**：无
  - **被阻塞**：任务 8, 9

  **参考**：
  - `frontend/src/components/EventList.vue` - 现有事件列表结构

  **验收标准**：
  - [x] 组件显示活动列表
  - [x] 显示操作类型、输入、输出
  - [x] 空状态显示 "请选择智能体"
  - [x] 超长输出截断显示（最多 1000 字符）

  **QA 场景**：
  ```
  场景：显示智能体活动
    工具：Playwright
    前提条件：前端运行中，已选择会话和智能体
    步骤：
      1. 选择一个会话
      2. 点击一个智能体
      3. 验证右侧栏显示该智能体的活动
    预期结果：显示操作列表，包含工具名、输入、输出
    失败指示：空白或显示错误
    证据：.sisyphus/evidence/task-5-agent-activity.png
  ```

  **提交**：是
  - 文件：`frontend/src/components/AgentActivity.vue`


- [x] 6. **后端 - 新增 Agents API 端点**

  **实现内容**：
  - 创建 `backend/app/api/agents.py`
  - 实现 `GET /api/v1/sessions/{session_id}/agents` - 获取智能体列表
  - 实现 `GET /api/v1/sessions/{session_id}/agents/{agent_name}/events` - 获取智能体活动

  **禁止事项**：
  - 不创建新的数据库表

  **推荐 Agent 类别**：
  - **分类**：`unspecified-high` - 需要设计 API 响应结构和查询逻辑

  **并行化**：
  - **可并行运行**：否
  - **并行组**：Wave 2（依赖任务 1）
  - **阻塞**：任务 1
  - **被阻塞**：任务 7-8

  **参考**：
  - `backend/app/api/sessions.py` - 现有 API 模式
  - `backend/app/utils/agent_extractor.py` - 任务 1 创建的工具

  **验收标准**：
  - [x] `GET /sessions/{id}/agents` 返回智能体列表
  - [x] `GET /sessions/{id}/agents/{name}/events` 返回该智能体的事件
  - [x] 智能体事件按时间倒序
  - [x] 工具输出截断到合理长度

  **QA 场景**：
  ```
  场景：获取智能体列表 API
    工具：Bash (curl)
    前提条件：后端运行中，已有测试会话数据
    步骤：
      1. curl http://localhost:7000/api/v1/sessions/{session_id}/agents
    预期结果：JSON 数组，每个元素包含 agent_name, event_count, status
    失败指示：返回空数组或错误
    证据：.sisyphus/evidence/task-6-agents-list.json

  场景：获取智能体活动 API
    工具：Bash (curl)
    前提条件：后端运行中
    步骤：
      1. curl http://localhost:7000/api/v1/sessions/{session_id}/agents/Prometheus/events
    预期结果：JSON 数组，包含该智能体的所有事件
    失败指示：返回空数组或错误
    证据：.sisyphus/evidence/task-6-agent-events.json
  ```

  **提交**：是
  - 文件：`backend/app/api/agents.py`


- [x] 7. **前端 - AgentList 智能体列表功能**

  **实现内容**：
  - 在 eventStore 中添加获取智能体列表的函数
  - 连接 AgentList 组件与后端 API
  - 实现实时更新（使用现有的 WebSocket）

  **禁止事项**：
  - 不修改现有的会话列表逻辑

  **推荐 Agent 类别**：
  - **分类**：`visual-engineering` - UI 集成

  **并行化**：
  - **可并行运行**：否
  - **并行组**：Wave 2（依赖任务 3, 4, 6）
  - **阻塞**：任务 3, 4, 6
  - **被阻塞**：任务 10

  **参考**：
  - `frontend/src/stores/eventStore.ts` - 现有 store 结构
  - `frontend/src/services/api.ts` - API 客户端

  **验收标准**：
  - [x] 选择会话后自动加载智能体列表
  - [x] 点击智能体触发选择事件
  - [x] 实时更新智能体状态

  **QA 场景**：
  ```
  场景：会话选择后加载智能体
    工具：Playwright
    前提条件：前端运行中
    步骤：
      1. 选择一个会话
      2. 等待 2 秒让 API 调用完成
      3. 验证中间栏显示智能体
    预期结果：智能体列表出现在中间栏
    失败指示：无智能体显示
    证据：.sisyphus/evidence/task-7-load-agents.png
  ```

  **提交**：是


- [x] 8. **前端 - AgentActivity 活动详情功能**

  **实现内容**：
  - 在 eventStore 中添加获取智能体活动的函数
  - 连接 AgentActivity 组件与后端 API
  - 实现实时更新

  **禁止事项**：
  - 不修改现有的事件列表逻辑

  **推荐 Agent 类别**：
  - **分类**：`visual-engineering` - UI 集成

  **并行化**：
  - **可并行运行**：否
  - **并行组**：Wave 2（依赖任务 3, 5, 6）
  - **阻塞**：任务 3, 5, 6
  - **被阻塞**：任务 10

  **参考**：
  - `frontend/src/components/EventList.vue` - 类似实现

  **验收标准**：
  - [x] 选择智能体后显示活动列表
  - [x] 显示操作类型、输入参数、输出内容
  - [x] 实时更新活动

  **QA 场景**：
  ```
  场景：点击智能体显示活动
    工具：Playwright
    前提条件：前端运行中，已加载智能体列表
    步骤：
      1. 选择会话（已有智能体）
      2. 点击一个智能体
      3. 验证右侧栏显示活动详情
    预期结果：右侧显示工具调用记录
    失败指示：空白或错误
    证据：.sisyphus/evidence/task-8-show-activity.png
  ```

  **提交**：是


- [x] 9. **前端 - 修改 App.vue 三栏布局**

  **实现内容**：
  - 修改 `frontend/src/App.vue`
  - 将现有双栏布局改为三栏：
    - 左侧（250px）：会话列表
    - 中间（300px）：智能体列表
    - 右侧（自适应）：智能体活动详情

  **禁止事项**：
  - 不改变统计面板位置
  - 不添加新的顶部导航

  **推荐 Agent 类别**：
  - **分类**：`visual-engineering` - 布局调整

  **并行化**：
  - **可并行运行**：否
  - **并行组**：Wave 2（依赖任务 4, 5）
  - **阻塞**：任务 4, 5
  - **被阻塞**：任务 10

  **参考**：
  - `frontend/src/App.vue` - 现有布局

  **验收标准**：
  - [x] 三栏布局正确显示
  - [x] 各栏宽度正确
  - [x] 响应式：在小屏幕上自动折叠

  **QA 场景**：
  ```
  场景：三栏布局显示
    工具：Playwright
    前提条件：前端运行
    步骤：
      1. 打开浏览器访问 http://localhost:5173
      2. 选择一个会话
      3. 截图
    预期结果：三栏清晰可见：左会话列表，中智能体列表，右活动详情
    失败指示：布局错乱
    证据：.sisyphus/evidence/task-9-layout.png
  ```

  **提交**：是


- [x] 10. **前端 - 集成 WebSocket 实时更新**

  **实现内容**：
  - 在 eventStore 中处理新的 WebSocket 消息类型
  - 添加 `agent_update` 事件处理
  - 确保选择会话/智能体后实时更新

  **禁止事项**：
  - 不修改现有的 WebSocket 连接逻辑

  **推荐 Agent 类别**：
  - **分类**：`unspecified-high` - 需要理解现有的 WebSocket 处理

  **并行化**：
  - **可并行运行**：否
  - **并行组**：Wave 2（依赖任务 7-9）
  - **阻塞**：任务 7-9
  - **被阻塞**：任务 13, F1-F4

  **参考**：
  - `frontend/src/stores/eventStore.ts:184-216` - 现有 WebSocket 处理

  **验收标准**：
  - [x] 新事件到达时智能体列表自动更新
  - [x] 新事件到达时活动详情自动更新

  **QA 场景**：
  ```
  场景：实时更新
    工具：Playwright
    前提条件：前端运行，已有会话和智能体
    步骤：
      1. 打开浏览器，选择会话和智能体
      2. 触发新事件（在 OpenCode 中执行操作）
      3. 等待 3 秒
      4. 验证新活动出现在列表中
    预期结果：新活动自动显示
    失败指示：无更新
    证据：.sisyphus/evidence/task-10-realtime.png
  ```

  **提交**：是


- [ ] 11. **后端 - 边缘情况处理**

  **实现内容**：
  - 处理 agent 字段为空的情况
  - 处理工具输出过长的情况（截断到 5000 字符）
  - 处理无效的 metadata JSON

  **禁止事项**：
  - 不改变 API 响应格式

  **推荐 Agent 类别**：
  - **分类**：`quick` - 小的修复

  **并行化**：
  - **可并行运行**：否
  - **并行组**：Wave 3（依赖任务 6）
  - **阻塞**：任务 6
  - **被阻塞**：F1-F4

  **验收标准**：
  - [ ] 空 agent 返回空列表
  - [ ] 超长输出被截断
  - [ ] 无效 JSON 不崩溃

  **QA 场景**：
  ```
  场景：空 agent 处理
    工具：Bash (curl)
    前提条件：后端运行
    步骤：
      1. 创建包含空 agent 的测试事件
      2. 调用 /agents API
    预期结果：正常返回，不崩溃
    证据：.sisyphus/evidence/task-11-null-agent.json
  ```

  **提交**：是


- [ ] 12. **前端 - 边缘情况 UI 处理**

  **实现内容**：
  - 智能体列表空状态
  - 活动详情空状态
  - 超长输出显示 "点击查看更多"
  - 加载状态显示

  **禁止事项**：
  - 不改变功能逻辑

  **推荐 Agent 类别**：
  - **分类**：`quick` - UI 调整

  **并行化**：
  - **可并行运行**：否
  - **并行组**：Wave 3（依赖任务 7-8）
  - **阻塞**：任务 7-8
  - **被阻塞**：F1-F4

  **验收标准**：
  - [ ] 空状态正确显示
  - [ ] 超长输出有截断提示
  - [ ] 加载状态显示 spinner

  **QA 场景**：
  ```
  场景：空状态显示
    工具：Playwright
    前提条件：前端运行
    步骤：
      1. 不选择会话，查看各栏
    预期结果：显示 "请选择会话" 等提示
    证据：.sisyphus/evidence/task-12-empty.png
  ```

  **提交**：是


- [ ] 13. **前端 - 单元测试**

  **实现内容**：
  - 为 AgentList 组件编写单元测试
  - 为 AgentActivity 组件编写单元测试
  - 为 eventStore 新函数编写单元测试

  **禁止事项**：
  - 不添加集成测试（任务 F3 负责）

  **推荐 Agent 类别**：
  - **分类**：`unspecified-high` - 需要编写测试用例

  **并行化**：
  - **可并行运行**：否
  - **并行组**：Wave 3（依赖任务 7-12）
  - **阻塞**：任务 7-12
  - **被阻塞**：F1-F4

  **验收标准**：
  - [ ] AgentList 组件测试通过
  - [ ] AgentActivity 组件测试通过
  - [ ] eventStore 新函数测试通过

  **QA 场景**：
  ```
  场景：运行单元测试
    工具：Bash
    前提条件：测试文件存在
    步骤：
      1. npm run test
    预期结果：所有测试通过
    失败指示：有失败的测试
    证据：.sisyphus/evidence/task-13-test-results.txt
  ```

  **提交**：是

---

## 最终验证阶段

> 4 个审查代理并行运行。全部批准后，向用户展示合并结果并获取明确的"确认"，然后完成工作。
>
> **自动验证后不要继续。等待用户明确批准后再标记工作完成。**
> **如果被拒绝或用户有反馈 -> 修复 -> 重新运行 -> 再次展示 -> 等待批准。**

- [ ] F1. **计划合规审查** — `oracle`
  从头到尾阅读计划。对于每个"必须有"：验证实现存在（读取文件、curl 端点、运行命令）。对于每个"禁止有"：搜索代码库中是否存在禁止的模式 — 如果发现则拒绝并指出文件:行号。检查证据文件是否存在于 .sisyphus/evidence/。对比交付物与计划。
  输出：`必须有 [N/N] | 禁止有 [N/N] | 任务 [N/N] | 评审结果：批准/拒绝`

- [ ] F2. **代码质量审查** — `unspecified-high`
  运行 `tsc --noEmit` + linter + `bun test`。审查所有更改的文件是否有：`as any`/`@ts-ignore`、空 catch、console.log 生产日志、注释掉的代码、未使用的导入。检查 AI 垃圾：过度注释、过度抽象、通用名称（data/result/item/temp）。
  输出：`构建 [通过/失败] | Lint [通过/失败] | 测试 [N 通过/N 失败] | 文件 [N 清洁/N 问题] | 评审结果`

- [ ] F3. **真实手动 QA** — `unspecified-high`（如果 UI）
  从干净状态开始。执行每个任务中的每个 QA 场景 — 遵循确切步骤，捕获证据。测试跨任务集成（功能协同工作，而非隔离）。测试边缘情况：空状态、无效输入、快速操作。保存到 `.sisyphus/evidence/final-qa/`。
  输出：`场景 [N/N 通过] | 集成 [N/N] | 边缘情况 [N 已测试] | 评审结果`

- [ ] F4. **范围忠诚度检查** — `deep`
  对于每个任务：读取"做什么"，读取实际 diff（git log/diff）。验证 1:1 — 规范中的所有内容都已构建（无遗漏），规范外的任何内容都已构建（无蔓延）。检查"禁止事项"合规。检测跨任务污染：任务 N 触碰任务 M 的文件。标记未计入的更改。
  输出：`任务 [N/N 合规] | 污染 [清洁/N 问题] | 未计入 [清洁/N 文件] | 评审结果`

---

## 提交策略

- **提交 1**：`backend/app/utils/agent_extractor.py` - 智能体提取工具函数
  
- **提交 2**：`backend/app/api/sessions.py` - 修改 Sessions API

- **提交 3**：`frontend/src/types/index.ts` - 添加类型定义

- **提交 4**：`frontend/src/components/AgentList.vue` - 智能体列表组件

- **提交 5**：`frontend/src/components/AgentActivity.vue` - 智能体活动组件

- **提交 6**：`backend/app/api/agents.py` - 新增 Agents API

- **提交 7**：`frontend/src/stores/eventStore.ts` + `frontend/src/services/api.ts` - 前端数据集成

- **提交 8**：`frontend/src/App.vue` - 三栏布局修改

- **提交 9**：`frontend/src/components/*.spec.ts` - 单元测试

---

## 成功标准

### 验证命令
```bash
# 后端 API 测试
curl http://localhost:7000/api/v1/sessions
# 预期：返回会话列表，每条包含正确的 agent_count

curl http://localhost:7000/api/v1/sessions/{session_id}/agents
# 预期：返回智能体列表，例如 [{"agent_name": "Prometheus", "event_count": 10, "status": "busy"}]

# 前端 UI 测试
# 1. 打开浏览器访问 http://localhost:5173
# 2. 点击一个会话
# 3. 验证中间栏显示智能体列表
# 4. 点击一个智能体
# 5. 验证右侧栏显示该智能体的活动
```

### 最终检查清单
- [ ] 所有 "Must Have" 都已实现
- [ ] 所有 "Must NOT Have" 都未实现
- [ ] 测试通过
- [ ] 边缘情况已处理