# 活动流详细信息展开功能

## TL;DR

> **快速摘要**: 为活动流列表添加点击展开功能，显示工具调用的输入输出等详细信息

> **交付物**:
> - 修改 Activity 类型定义，添加详细信息字段
> - 修改 AppContext 数据转换逻辑
> - 修改 ActivityStream 组件，添加可展开的详情面板

> **预估工作量**: 小
> **并行执行**: 否（单一组件修改）

---

## Context

### 用户原始请求
"我的活动流列表中的每条数据都想看到详细信息"

### 需求分析
用户希望点击活动流中的每条记录时，能够展开查看详细信息，包括：
- 工具调用的输入参数（input）
- 工具调用的输出结果（output）
- 完整的消息内容
- 其他元数据

### 技术背景
后端 API `/api/sessions/:id/activity` 已经返回了以下字段：
- `input`: 工具输入参数
- `output`: 工具输出结果（已截断到200字符）
- `status`: 工具状态

但前端目前没有使用这些字段。

---

## Work Objectives

### 核心目标
为活动流添加点击展开详情的功能

### 具体交付物
1. **Activity 类型扩展** (`ActivityStream.tsx`)
   - 添加 `input`, `output`, `messageId`, `role`, `agent` 字段

2. **AppContext 数据转换** (`AppContext.tsx`)
   - 从 API 响应中提取 `input`, `output` 等字段
   - 传递给 Activity 对象

3. **ActivityStream UI 组件** (`ActivityStream.tsx`)
   - 添加展开/收起状态管理
   - 点击卡片展开显示详细信息
   - 详细信息区域显示 input/output
   - 添加展开/收起的动画效果

### 定义完成
- [ ] 点击活动项可以展开/收起详情
- [ ] 展开后显示 input 和 output（如果有）
- [ ] 展开/收起有平滑的过渡动画
- [ ] 编译通过，无错误

---

## Verification Strategy

### 测试决策
- **基础设施**: 已有
- **自动化测试**: 否（UI 功能手动验证）
- **框架**: React/Vue（项目使用 React）

### QA 策略
每个任务都包含 Agent-Executed QA 场景：
- **Frontend/UI**: Playwright - 打开应用，点击活动项，验证详情展开

---

## Execution Strategy

### 执行流程（单一任务，无需分波）
修改单个组件文件，无需并行执行

---

## TODOs

- [x] 1. 修改 Activity 类型定义

  **操作内容**:
  - 在 `src/renderer/src/components/ActivityStream.tsx` 中
  - 在 `Activity` 接口中添加可选字段：
    ```typescript
    input?: string
    output?: string
    messageId?: string
    role?: string
    agent?: string
    ```

  **QA 场景**:
  - 场景: 类型定义正确
    - Tool: lsp_diagnostics
    - 验证: `npx tsc --noEmit` 无类型错误

- [x] 2. 修改 AppContext 数据转换逻辑

  **操作内容**:
  - 在 `src/renderer/src/context/AppContext.tsx` 中
  - 找到 `apiActivity` 处理逻辑（在 useEffect 中）
  - 在构建 Activity 对象时添加字段：
    - 对于 parts (工具调用): 添加 `input`, `output`, `toolName`
    - 对于 messages: 添加 `role`, `agent`, `messageId`

  **QA 场景**:
  - 场景: 数据正确传递
    - Tool: lsp_diagnostics
    - 验证: `npx tsc --noEmit` 无类型错误
  - 场景: 运行应用，API 数据正确解析
    - Tool: Bash
    - 命令: `npm run dev`

- [x] 3. 修改 ActivityStream 组件添加展开功能

  **操作内容**:
  - 在 `src/renderer/src/components/ActivityStream.tsx` 中
  - 添加 state 管理展开状态：`const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())`
  - 添加展开/收起处理函数：
    ```typescript
    const toggleExpand = (id: string) => {
      setExpandedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
        } else {
          next.add(id)
        }
        return next
      })
    }
    ```
  - 修改活动项渲染：点击整个卡片触发 toggleExpand
  - 展开时显示详情区域：
    ```tsx
    {expandedIds.has(activity.id) && (
      <div className="mt-3 pt-3 border-t border-[#30363d]">
        {activity.input && (
          <div className="mb-2">
            <div className="text-xs text-[#8b949e] mb-1">输入</div>
            <pre className="text-xs text-[#c9d1d9] bg-[#161b22] p-2 rounded overflow-x-auto">
              {activity.input}
            </pre>
          </div>
        )}
        {activity.output && (
          <div>
            <div className="text-xs text-[#8b949e] mb-1">输出</div>
            <pre className="text-xs text-[#c9d1d9] bg-[#161b22] p-2 rounded overflow-x-auto">
              {activity.output}
            </pre>
          </div>
        )}
      </div>
    )}
    ```
  - 添加展开指示器（箭头图标或 "展开详情" 文字）

  **QA 场景**:
  - 场景: 组件编译通过
    - Tool: lsp_diagnostics
    - 验证: `npx tsc --noEmit` 无错误
  - 场景: 点击活动项展开详情
    - Tool: playwright
    - 步骤:
      1. 打开应用 http://localhost:5173
      2. 等待活动流加载
      3. 点击任意活动项
      4. 验证详情区域展开显示
      5. 再次点击，验证收起
    - 预期: 展开/收起动画平滑，input/output 正确显示

- [x] 4. 最终验证

  **操作内容**:
  - 运行完整构建: `npm run build`
  - 验证无错误

---

## Commit Strategy

- 任务 1-3 合并提交: `feat(activity-stream): 添加展开详情功能`

---

## Success Criteria

### 验证命令
```bash
npm run build  # 预期: 成功，无错误
```

### 最终检查清单
- [x] Activity 类型包含 input/output 字段
- [x] AppContext 正确传递这些字段
- [x] 点击活动项可以展开/收起详情
- [x] 展开后显示 input 和 output
- [x] 编译通过