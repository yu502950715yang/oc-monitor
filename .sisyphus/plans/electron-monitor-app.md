# OC 监控助手 - Electron 桌面应用开发计划

## TL;DR

> **快速摘要**: 基于 Electron + React 构建的桌面应用程序，实时监控 OpenCode 智能体活动，提供全中文界面，类似 OCWatch 但以独立安装包形式分发，便于普通用户一键部署。

> **交付产物**:
> - Windows 安装包 (.exe)
> - macOS 安装包 (.dmg)
> - 全中文界面
> - 实时活动监控功能

> **预估工作量**: 中等
> **并行执行**: 是 - 多阶段并行
> **关键路径**: 项目搭建 → 后端服务 → 前端 UI → IPC 集成 → 打包发布

---

## 背景

### 原始需求
用户想要构建一个类似 OCWatch 的应用，用于监控 OpenCode 智能体活动。OCWatch 项目位于 `E:\code\oc-monitor-java\ocwatch-main`，采用 Bun + Hono + React + Vite 技术栈。

### 用户明确的需求
- **核心功能**: 实时监控 OpenCode 智能体活动
- **目标用户**: 普通个人用户（非技术人员）
- **数据来源**: 本地文件系统（从 `~/.local/share/opencode/storage/` 读取 JSON 文件）
- **目标平台**: Windows + macOS
- **界面风格**: 简洁现代，深色主题，全中文界面

### 用户明确排除的功能
- ❌ 系统托盘（关闭即退出）
- ❌ 自动更新（手动更新）
- ❌ 开机自启

### 研究发现

**OCWatch 项目结构**（参考）:
- 后端: Bun + Hono，REST API，fs.watch 文件监控
- 前端: React 19 + Vite + Tailwind CSS
- 可视化: @xyflow/react 活动树
- 数据流: 文件监控 → 缓存失效 → SSE/轮询 → 客户端更新

**Electron 最佳实践**:
- 使用 electron-builder 打包（更可控）
- 嵌入式 HTTP 服务（主进程内运行 Hono）
- contextBridge + IPC 通信
- chokidar 跨平台文件监控

---

## 工作目标

### 核心目标
构建一个易于部署的 Electron 桌面应用，实时监控 OpenCode 智能体活动，展示会话、工具调用和计划进度。

### 具体交付物

| 交付物 | 说明 |
|--------|------|
| Windows 安装包 | `.exe` NSIS 安装程序 |
| macOS 安装包 | `.dmg` 磁盘映像 |
| 项目源码 | 完整的 Electron + React 项目 |

### 完成定义
- [ ] Windows 上双击 .exe 可正常安装运行
- [ ] macOS 上双击 .dmg 可安装运行
- [ ] 应用启动后自动读取 OpenCode 存储数据
- [ ] 界面显示活动会话列表
- [ ] 界面显示实时活动流
- [ ] 所有界面文字为中文

### 必须包含的功能
1. **会话列表**: 显示当前和历史 OpenCode 会话
2. **活动流**: 实时展示智能体操作
3. **计划进度**: 显示当前计划的任务完成状态
4. **中文界面**: 所有 UI 文字使用简体中文

### 禁止包含的功能（Guardrails）
- ❌ 系统托盘功能
- ❌ 自动更新机制
- ❌ 开机自启选项
- ❌ 修改 OpenCode 数据（仅读取）
- ❌ 控制智能体（仅监控）

---

## 验证策略

### 测试决策
- **测试框架**: bun test + Vitest（前端组件测试）
- **测试策略**: 测试后置（实现完成后添加基本测试）
- **E2E 测试**: Playwright（打包后验证）

### QA 策略
每个任务必须包含可执行的 QA 场景：
- **启动测试**: electron-builder 打包的应用可正常运行，无控制台错误
- **数据读取测试**: 能成功读取 OpenCode 存储目录的 JSON 文件
- **UI 测试**: 所有界面文字显示为中文，无英文残留
- **窗口测试**: 最小化、最大化、关闭按钮正常工作

---

## 执行策略

### 并行执行阶段

**第一阶段：项目搭建（并行）**
```
├── T1: 初始化 Electron + Vite + React 项目
├── T2: 配置 Tailwind CSS 和深色主题
├── T3: 配置 electron-builder 跨平台打包
└── T4: 配置 electron-log 日志系统
```

**第二阶段：后端服务（并行）**
```
├── T5: 搭建嵌入式 Hono 服务器
├── T6: 实现 OpenCode 存储文件解析器
├── T7: 实现 chokidar 文件监控服务
└── T8: 实现 REST API 端点
```

**第三阶段：前端 UI（并行）**
```
├── T9: 实现主界面布局和中文本地化
├── T10: 实现会话列表组件
├── T11: 实现活动流组件
├── T12: 实现计划进度组件
└── T13: 实现活动树可视化（@xyflow/react）
```

**第四阶段：IPC 集成**
```
├── T14: 实现 Preload 脚本和 contextBridge API
├── T15: 连接后端服务和前端 UI
├── T16: 实现实时数据更新（轮询）
└── T17: 添加错误处理和空状态
```

**第五阶段：打包发布**
```
├── T18: 配置 Windows 打包（NSIS）
├── T19: 配置 macOS 打包（DMG）
├── T20: 测试打包产物
└── T21: 生成正式发布版本
```

---

## TODOs

---

- [x] 1. 初始化 Electron + Vite + React 项目

  **要做的事情**:
  - 创建项目目录结构
  - 安装 Electron、Vite、React 依赖
  - 配置 TypeScript 和路径别名
  - 验证空项目可运行

  **禁止做的事情**:
  - 不要添加不必要的依赖
  - 不要预设复杂的目录结构

  **推荐使用**:
  > 类型: `visual-engineering`
  > 原因: 前端项目搭建和配置是基础，需要仔细设置开发环境和构建流程

  **并行化**:
  - 可以并行运行: T2, T3, T4
  - 阻塞: T5-T21

  **引用**:
  - OCWatch client: `E:\code\oc-monitor-java\ocwatch-main\src\client\package.json` - React 19, Vite 配置参考
  - Electron 官方文档: 最佳实践 - contextIsolation, nodeIntegration 配置

  **Acceptance Criteria**:
  - [ ] `npm run dev` 启动开发服务器
  - [ ] 浏览器访问 http://localhost:5173 显示空白 React 页面
  - [ ] 无 TypeScript 编译错误

  **QA 场景**:
  ```
  场景: 验证开发服务器正常运行
    工具: Bash
    步骤:
      1. cd 到项目目录
      2. 运行 npm run dev
      3. 等待服务启动
      4. 访问 http://localhost:5173
    预期结果: 页面加载成功，React 应用渲染
    证据: .sisyphus/evidence/task-1-dev-server.png
  ```

  **提交**: 是
  - 消息: `feat: 初始化 Electron + Vite + React 项目`
  - 文件: `package.json`, `vite.config.ts`, `electron/**/*`, `src/renderer/**/*`

---

- [x] 2. 配置 Tailwind CSS 和深色主题

  **要做的事情**:
  - 安装 Tailwind CSS、PostCSS、Autoprefixer
  - 配置深色主题配色（参考 OCWatch: #0d1117 背景, #58a6ff 强调色）
  - 设置全局样式
  - 创建 Tailwind 配置文件

  **禁止做的事情**:
  - 不要添加多个主题支持（仅深色）
  - 不要使用其他 CSS 框架

  **推荐使用**:
  > 类型: `visual-engineering`
  > 原因: UI 样式配置，需要匹配 OCWatch 的简洁现代风格

  **并行化**:
  - 可以并行运行: T1, T3, T4
  - 阻塞: T9-T13（前端 UI 组件）

  **引用**:
  - OCWatch tailwind: `E:\code\oc-monitor-java\ocwatch-main\src\client\tailwind.config.js` - 深色主题配置参考
  - OCWatch 样式: `E:\code\oc-monitor-java\ocwatch-main\src\client\src\styles\index.css`

  **Acceptance Criteria**:
  - [ ] Tailwind CSS 正确配置
  - [ ] 深色主题生效（#0d1117 背景）
  - [ ] 组件可使用 Tailwind 类名

  **QA 场景**:
  ```
  场景: 验证深色主题样式
    工具: Playwright
    步骤:
      1. 启动开发服务器
      2. 打开浏览器访问页面
      3. 检查 body 背景色
    预期结果: 背景色为深色 (#0d1117)
    证据: .sisyphus/evidence/task-2-dark-theme.png
  ```

  **提交**: 是（可与 T1 合并）

---

- [x] 3. 配置 electron-builder 跨平台打包

  **要做的事情**:
  - 安装 electron-builder
  - 创建 electron-builder.yml 配置文件
  - 配置 Windows (NSIS) 和 macOS (DMG) 打包
  - 配置应用图标和元信息

  **禁止做的事情**:
  - 不要配置自动更新（用户已排除）
  - 不要配置代码签名（开发阶段）

  **推荐使用**:
  > 类型: `quick`
  > 原因: 配置文件编写，较为直接

  **并行化**:
  - 可以并行运行: T1, T2, T4

  **引用**:
  - electron-builder 文档: Windows NSIS, macOS DMG 配置示例

  **Acceptance Criteria**:
  - [ ] electron-builder.yml 配置文件存在
  - [ ] 可执行 `npm run build:win` 生成 Windows 安装包
  - [ ] 可执行 `npm run build:mac` 生成 macOS 安装包

  **QA 场景**:
  ```
  场景: 验证打包配置
    工具: Bash
    步骤:
      1. 运行 npm run build:win
      2. 检查 dist 目录
    预期结果: 生成 Windows 安装包
    证据: .sisyphus/evidence/task-3-build-win.png
  ```

  **提交**: 是（可与 T1 合并）

---

- [x] 4. 配置 electron-log 日志系统

  **要做的事情**:
  - 安装 electron-log
  - 在主进程配置日志输出
  - 配置日志文件位置和轮转
  - 添加全局异常处理

  **禁止做的事情**:
  - 不要在渲染进程使用 console.log
  - 不要将日志输出到控制台（生产环境）

  **推荐使用**:
  > 类型: `quick`
  > 原因: 日志配置是标准操作

  **并行化**:
  - 可以并行运行: T1, T2, T3

  **引用**:
  - electron-log 文档: 日志配置和轮转设置

  **Acceptance Criteria**:
  - [ ] electron-log 正确配置
  - [ ] 应用运行日志写入文件
  - [ ] 未捕获异常被记录

  **QA 场景**:
  ```
  场景: 验证日志写入
    工具: Bash
    步骤:
      1. 运行打包后的应用
      2. 检查日志文件
    预期结果: 日志文件存在且包含启动日志
    证据: .sisyphus/evidence/task-4-log.png
  ```

  **提交**: 是（可与 T1 合并）

---

- [x] 5. 搭建嵌入式 Hono 服务器
- [x] 6. 实现 OpenCode 存储文件解析器
- [x] 7. 实现 chokidar 文件监控服务
- [x] 8. 实现 REST API 端点

  **要做的事情**:
  - 实现 /api/health 健康检查
  - 实现 /api/sessions 会话列表
  - 实现 /api/sessions/:id 会话详情
  - 实现 /api/sessions/:id/activity 活动数据
  - 实现 /api/plan 计划进度

  **禁止做的事情**:
  - 不要实现不需要的端点
  - 不要返回敏感信息

  **推荐使用**:
  > 类型: `unspecified-high`
  > 原因: API 端点实现，需要与前端对接

  **并行化**:
  - 可以并行运行: T5, T6, T7
  - 依赖: T6（存储解析器）

  **引用**:
  - OCWatch routes: `E:\code\oc-monitor-java\ocwatch-main\src\server\routes\` - API 端点参考

  **Acceptance Criteria**:
  - [ ] 所有端点返回有效 JSON
  - [ ] 端点响应时间 < 500ms
  - [ ] 错误情况返回适当错误码

  **QA 场景**:
  ```
  场景: 验证 API 端点
    工具: Bash (curl)
    步骤:
      1. curl http://localhost:50234/api/sessions
      2. curl http://localhost:50234/api/plan
    预期结果: 返回有效 JSON 数据
    证据: .sisyphus/evidence/task-8-api-endpoints.png
  ```

  **提交**: 是
  - 消息: `feat: 实现 REST API 端点`
  - 文件: `electron/main/routes/*.ts`

---

- [x] 9. 实现主界面布局和中文本地化
- [x] 10. 实现会话列表组件
- [x] 11. 实现活动流组件
- [x] 12. 实现计划进度组件
- [x] 13. 实现活动树可视化（@xyflow/react）

  **要做的事情**:
  - 安装 @xyflow/react
  - 创建活动树组件
  - 显示父子会话关系
  - 支持节点交互（展开/折叠）

  **禁止做的事情**:
  - 不要添加复杂的编辑功能（仅监控）
  - 不要显示太多层级

  **推荐使用**:
  > 类型: `visual-engineering`
  > 原因: 可视化组件，需要良好的交互体验

  **并行化**:
  - 可以并行运行: T9, T10, T11, T12

  **引用**:
  - OCWatch GraphView: `E:\code\oc-monitor-java\ocwatch-main\src\client\src\components\graph\GraphView.tsx`

  **Acceptance Criteria**:
  - [ ] 活动树正确渲染
  - [ ] 节点可交互
  - [ ] 边连接正确

  **QA 场景**:
  ```
  场景: 验证活动树
    工具: Playwright
    步骤:
      1. 打开应用
      2. 选择一个会话
      3. 检查活动树渲染
    预期结果: 显示活动树结构
    证据: .sisyphus/evidence/task-13-activity-tree.png
  ```

  **提交**: 是
  - 消息: `feat: 实现活动树可视化`
  - 文件: `src/renderer/src/components/ActivityTree.tsx`

---

- [x] 14. 实现 Preload 脚本和 contextBridge API

  **要做的事情**:
  - 创建 preload 脚本
  - 使用 contextBridge 暴露安全的 API
  - 定义类型安全的接口
  - 处理 IPC 通信

  **禁止做的事情**:
  - 不要暴露 ipcRenderer 全部功能
  - 不要启用 nodeIntegration

  **推荐使用**:
  > 类型: `quick`
  > 原因: 标准 Electron 安全模式配置

  **并行化**:
  - 阻塞: T15-T17（IPC 集成）
  - 依赖: T5（Hono 服务器）

  **引用**:
  - Electron 官方文档: contextBridge 最佳实践

  **Acceptance Criteria**:
  - [ ] preload 脚本正确加载
  - [ ] contextBridge API 可用
  - [ ] 无安全警告

  **QA 场景**:
  ```
  场景: 验证 Preload 脚本
    工具: Playwright
    步骤:
      1. 打开开发者工具
      2. 检查 console 是否有安全警告
    预期结果: 无 contextIsolation 警告
    证据: .sisyphus/evidence/task-14-preload.png
  ```

  **提交**: 是
  - 消息: `feat: 实现 Preload 脚本和 contextBridge API`
  - 文件: `electron/preload/index.ts`

---

- [x] 15. 连接后端服务和前端 UI

  **要做的事情**:
  - 在前端调用 Hono API
  - 处理数据获取和状态管理
  - 实现错误处理
  - 添加加载状态

  **禁止做的事情**:
  - 不要使用 console.log
  - 不要忽略错误情况

  **推荐使用**:
  > 类型: `unspecified-high`
  > 原因: 前后端集成，需要处理异步数据和状态

  **并行化**:
  - 阻塞: T16, T17
  - 依赖: T14（Preload）

  **引用**:
  - OCWatch hooks: `E:\code\oc-monitor-java\ocwatch-main\src\client\src\hooks\` - 数据获取逻辑参考

  **Acceptance Criteria**:
  - [ ] 前端成功获取后端数据
  - [ ] 数据显示正确
  - [ ] 错误情况正确处理

  **QA 场景**:
  ```
  场景: 验证前后端连接
    工具: Playwright
    步骤:
      1. 打开应用
      2. 验证数据加载
    预期结果: 界面显示后端数据
    证据: .sisyphus/evidence/task-15-connection.png
  ```

  **提交**: 是
  - 消息: `feat: 连接后端服务和前端 UI`
  - 文件: `src/renderer/src/hooks/useApi.ts`, `src/renderer/src/stores/*.ts`

---

- [x] 16. 实现实时数据更新（轮询）

  **要做的事情**:
  - 实现定时轮询（2-5秒间隔）
  - 处理数据更新和合并
  - 添加手动刷新按钮
  - 优化性能（避免不必要的渲染）

  **禁止做的事情**:
  - 不要轮询太频繁（< 2秒）
  - 不要忽略性能

  **推荐使用**:
  > 类型: `quick`
  > 原因: 数据更新逻辑，相对直接

  **并行化**:
  - 阻塞: T17
  - 依赖: T15（连接）

  **引用**:
  - OCWatch useSSE: `E:\code\oc-monitor-java\ocwatch-main\src\client\src\hooks\useSSE.ts` - 实时更新参考
  - OCWatch usePolling: `E:\code\oc-monitor-java\ocwatch-main\src\client\src\hooks\usePolling.ts`

  **Acceptance Criteria**:
  - [ ] 数据定时更新
  - [ ] 手动刷新可用
  - [ ] 性能良好

  **QA 场景**:
  ```
  场景: 验证实时更新
    工具: Playwright
    步骤:
      1. 打开应用
      2. 等待数据更新
      3. 验证界面更新
    预期结果: 界面自动更新数据
    证据: .sisyphus/evidence/task-16-polling.png
  ```

  **提交**: 是
  - 消息: `feat: 实现实时数据更新`
  - 文件: `src/renderer/src/hooks/usePolling.ts`

---

- [x] 17. 添加错误处理和空状态

  **要做的事情**:
  - 处理无数据情况（显示友好提示）
  - 处理读取错误（显示错误信息）
  - 处理网络错误
  - 添加重试机制

  **禁止做的事情**:
  - 不要显示技术性错误信息
  - 不要让应用崩溃

  **推荐使用**:
  > 类型: `quick`
  > 原因: 错误处理是基本要求

  **并行化**:
  - 依赖: T16（轮询）

  **引用**:
  - OCWatch EmptyState: `E:\code\oc-monitor-java\ocwatch-main\src\client\src\components\EmptyState.tsx`

  **Acceptance Criteria**:
  - [ ] 无数据时显示友好提示
  - [ ] 错误时显示错误信息
  - [ ] 应用不崩溃

  **QA 场景**:
  ```
  场景: 验证错误处理
    工具: Playwright
    步骤:
      1. 模拟无数据情况
      2. 检查界面显示
    预期结果: 显示友好提示
    证据: .sisyphus/evidence/task-17-error-handling.png
  ```

  **提交**: 是
  - 消息: `feat: 添加错误处理和空状态`
  - 文件: `src/renderer/src/components/ErrorBoundary.tsx`, `src/renderer/src/components/EmptyState.tsx`

---

- [x] 18. 配置 Windows 打包（NSIS）
- [x] 19. 配置 macOS 打包（DMG）
- [x] 20. 测试打包产物
- [x] 21. 生成正式发布版本

  **要做的事情**:
  - 清理不必要的文件
  - 生成最终版本号
  - 创建发布说明
  - 输出安装包

  **禁止做的事情**:
  - 不要包含调试代码

  **推荐使用**:
  > 类型: `quick`
  > 原因: 发布准备

  **并行化**:
  - 依赖: T20（测试完成）

  **Acceptance Criteria**:
  - [ ] 生成最终安装包
  - [ ] 版本号正确
  - [ ] 文件结构清晰

  **QA 场景**:
  ```
  场景: 验证发布版本
    工具: Bash
    步骤:
      1. 检查最终输出目录
      2. 验证安装包存在
    预期结果: 准备就绪的安装包
    证据: .sisyphus/evidence/task-21-release.png
  ```

  **提交**: 是
  - 消息: `feat: 生成正式发布版本`
  - 文件: `dist/**/*`

---

## 最终验证阶段

### 验证任务

- [x] F1. **计划合规审计** — `oracle`
  读取完整计划，验证每个"必须有"都有对应实现，每个"不能有"都被避免。检查证据文件是否存在。

- [x] F2. **代码质量审查** — `unspecified-high`
  运行 `npm run build`，检查是否有 TypeScript 错误、lint 警告。检查是否有不安全的代码模式。

- [x] F3. **真实手动测试** — `unspecified-high` + `playwright`
  从头开始测试整个应用：安装、启动、查看会话、验证中文界面。

- [x] F4. **范围忠诚度检查** — `deep`
  对比计划中的"必须包含"和"禁止包含"，验证实现没有偏离。

---

## 提交策略

所有提交遵循以下格式：
- `feat: 新功能`
- `fix: 修复问题`
- `chore: 配置更新`

每个原子提交包含：
- 功能实现
- 对应的测试（如果有）
- 简短的提交消息

---

## 成功标准

### 验证命令

```bash
# Windows 打包
npm run build:win
# 预期: dist/ 目录生成 .exe 安装包

# macOS 打包（在 macOS 上）
npm run build:mac
# 预期: dist/ 目录生成 .dmg 安装包
```

### 最终检查清单

- [ ] 所有"必须包含"功能已实现
- [ ] 所有"禁止包含"功能已排除
- [ ] Windows 安装包可正常安装运行
- [ ] macOS 安装包可正常安装运行
- [ ] 全中文界面
- [ ] 无控制台错误
- [ ] 项目代码结构清晰