/**
 * Mock 数据 fixtures - 用于测试 4 种视图
 * 
 * 包含:
 * - mockSessionTree: 会话树数据 (SessionTreeNode)
 * - mockAgentTree: 智能体树数据 (PartMeta with subagentType)
 * - mockTaskFlow: 任务流数据 (PlanProgress)
 * - mockToolChain: 工具链数据 (PartMeta with type='tool')
 */

// ============ 类型定义 ============

export interface SessionTreeNode {
  id: string
  title: string
  projectID: string
  parentID?: string
  createdAt?: string
  updatedAt?: string
  children: SessionTreeNode[]
}

export interface PartMeta {
  id: string
  messageID: string
  sessionID: string
  type: string
  tool?: string
  subagentType?: string
  action?: string
  status?: string
  timeStart?: number
  timeEnd?: number
  error?: string
  data?: any
  input?: string
  output?: string
  createdAt: string
}

export interface PlanProgress {
  total: number
  completed: number
  percentage: number
  items: { content: string; completed: boolean; line: number }[]
}

// ============ 1. 会话树 Mock 数据 ============

/** 正常会话树数据 - 包含父子层级结构 */
export const mockSessionTree: SessionTreeNode = {
  id: 'ses_root_001',
  title: '主会话 - 用户登录功能开发',
  projectID: 'proj_login_123',
  createdAt: '2026-03-30T10:00:00Z',
  updatedAt: '2026-03-31T09:30:00Z',
  children: [
    {
      id: 'ses_child_001',
      title: '子会话 - 数据库设计',
      projectID: 'proj_login_123',
      parentID: 'ses_root_001',
      createdAt: '2026-03-30T11:00:00Z',
      updatedAt: '2026-03-30T14:00:00Z',
      children: [
        {
          id: 'ses_grandchild_001',
          title: '孙会话 - 用户表结构',
          projectID: 'proj_login_123',
          parentID: 'ses_child_001',
          createdAt: '2026-03-30T11:30:00Z',
          updatedAt: '2026-03-30T12:00:00Z',
          children: []
        },
        {
          id: 'ses_grandchild_002',
          title: '孙会话 - 权限表结构',
          projectID: 'proj_login_123',
          parentID: 'ses_child_001',
          createdAt: '2026-03-30T12:30:00Z',
          updatedAt: '2026-03-30T13:00:00Z',
          children: []
        }
      ]
    },
    {
      id: 'ses_child_002',
      title: '子会话 - 前端界面',
      projectID: 'proj_login_123',
      parentID: 'ses_root_001',
      createdAt: '2026-03-30T15:00:00Z',
      updatedAt: '2026-03-31T09:30:00Z',
      children: []
    }
  ]
}

/** 空会话树数据 - 无子会话 */
export const mockSessionTreeEmpty: SessionTreeNode = {
  id: 'ses_empty_001',
  title: '独立会话 - 无子会话',
  projectID: 'proj_test_456',
  createdAt: '2026-03-31T08:00:00Z',
  updatedAt: '2026-03-31T10:00:00Z',
  children: []
}

// ============ 2. 智能体树 Mock 数据 ============

/** 正常智能体树数据 - 包含各种 subagentType */
export const mockAgentTree: PartMeta[] = [
  {
    id: 'part_001',
    messageID: 'msg_001',
    sessionID: 'ses_root_001',
    type: 'subagent',
    subagentType: 'explore',
    action: 'explore_codebase',
    status: 'completed',
    timeStart: 1700000000000,
    timeEnd: 1700000100000,
    createdAt: '2026-03-30T10:05:00Z'
  },
  {
    id: 'part_002',
    messageID: 'msg_002',
    sessionID: 'ses_root_001',
    type: 'subagent',
    subagentType: 'librarian',
    action: 'search_docs',
    status: 'completed',
    timeStart: 1700000200000,
    timeEnd: 1700000300000,
    createdAt: '2026-03-30T10:10:00Z'
  },
  {
    id: 'part_003',
    messageID: 'msg_003',
    sessionID: 'ses_root_001',
    type: 'subagent',
    subagentType: 'oracle',
    action: 'analyze_architecture',
    status: 'completed',
    timeStart: 1700000400000,
    timeEnd: 1700000500000,
    createdAt: '2026-03-30T10:15:00Z'
  },
  {
    id: 'part_004',
    messageID: 'msg_004',
    sessionID: 'ses_root_001',
    type: 'subagent',
    subagentType: 'build',
    action: 'implement_feature',
    status: 'running',
    timeStart: 1700000600000,
    createdAt: '2026-03-30T10:20:00Z'
  },
  {
    id: 'part_005',
    messageID: 'msg_005',
    sessionID: 'ses_root_001',
    type: 'subagent',
    subagentType: 'metis',
    action: 'refactor_code',
    status: 'pending',
    createdAt: '2026-03-30T10:25:00Z'
  },
  {
    id: 'part_006',
    messageID: 'msg_006',
    sessionID: 'ses_root_001',
    type: 'subagent',
    subagentType: 'hephaestus',
    action: 'run_tests',
    status: 'completed',
    timeStart: 1700000800000,
    timeEnd: 1700000900000,
    createdAt: '2026-03-30T10:30:00Z'
  },
  {
    id: 'part_007',
    messageID: 'msg_007',
    sessionID: 'ses_root_001',
    type: 'subagent',
    subagentType: 'momus',
    action: 'debug_issue',
    status: 'error',
    error: 'Test failed: assertion error',
    timeStart: 1700001000000,
    timeEnd: 1700001100000,
    createdAt: '2026-03-30T10:35:00Z'
  }
]

/** 空智能体树数据 - 无智能体调用记录 */
export const mockAgentTreeEmpty: PartMeta[] = []

// ============ 3. 任务流 Mock 数据 ============

/** 正常任务流数据 - 包含多个任务项 */
export const mockTaskFlow: PlanProgress = {
  total: 8,
  completed: 5,
  percentage: 62.5,
  items: [
    { content: '设计数据库架构', completed: true, line: 10 },
    { content: '实现用户认证模块', completed: true, line: 25 },
    { content: '创建用户表结构', completed: true, line: 40 },
    { content: '编写登录 API 接口', completed: true, line: 55 },
    { content: '实现会话管理', completed: true, line: 70 },
    { content: '添加前端登录页面', completed: false, line: 85 },
    { content: '集成第三方登录 (OAuth)', completed: false, line: 100 },
    { content: '编写单元测试', completed: false, line: 115 }
  ]
}

/** 空任务流数据 - 无任务项 */
export const mockTaskFlowEmpty: PlanProgress = {
  total: 0,
  completed: 0,
  percentage: 0,
  items: []
}

/** 部分完成的任务流数据 */
export const mockTaskFlowPartial: PlanProgress = {
  total: 5,
  completed: 2,
  percentage: 40,
  items: [
    { content: '任务 A', completed: true, line: 5 },
    { content: '任务 B', completed: true, line: 10 },
    { content: '任务 C', completed: false, line: 15 },
    { content: '任务 D', completed: false, line: 20 },
    { content: '任务 E', completed: false, line: 25 }
  ]
}

// ============ 4. 工具链 Mock 数据 ============

/** 正常工具链数据 - 按时间正序排列的工具调用 */
export const mockToolChain: PartMeta[] = [
  {
    id: 'tool_001',
    messageID: 'msg_t001',
    sessionID: 'ses_root_001',
    type: 'tool',
    tool: 'read',
    status: 'completed',
    input: '/src/utils/auth.ts',
    output: 'export function login() {...}',
    timeStart: 1700000000000,
    timeEnd: 1700000010000,
    createdAt: '2026-03-30T10:00:10Z'
  },
  {
    id: 'tool_002',
    messageID: 'msg_t002',
    sessionID: 'ses_root_001',
    type: 'tool',
    tool: 'grep',
    status: 'completed',
    input: 'password',
    output: 'Found 3 matches',
    timeStart: 1700000020000,
    timeEnd: 1700000030000,
    createdAt: '2026-03-30T10:00:20Z'
  },
  {
    id: 'tool_003',
    messageID: 'msg_t003',
    sessionID: 'ses_root_001',
    type: 'tool',
    tool: 'edit',
    status: 'completed',
    input: 'add validation logic',
    output: 'File modified successfully',
    timeStart: 1700000040000,
    timeEnd: 1700000050000,
    createdAt: '2026-03-30T10:00:30Z'
  },
  {
    id: 'tool_004',
    messageID: 'msg_t004',
    sessionID: 'ses_root_001',
    type: 'tool',
    tool: 'write',
    status: 'completed',
    input: '/src/utils/session.ts',
    output: 'File created successfully',
    timeStart: 1700000060000,
    timeEnd: 1700000070000,
    createdAt: '2026-03-30T10:00:40Z'
  },
  {
    id: 'tool_005',
    messageID: 'msg_t005',
    sessionID: 'ses_root_001',
    type: 'tool',
    tool: 'bash',
    status: 'completed',
    input: 'npm run build',
    output: 'Build completed successfully',
    timeStart: 1700000080000,
    timeEnd: 1700000200000,
    createdAt: '2026-03-30T10:00:50Z'
  },
  {
    id: 'tool_006',
    messageID: 'msg_t006',
    sessionID: 'ses_root_001',
    type: 'tool',
    tool: 'mcp',
    subagentType: 'mcp_server_github',
    status: 'completed',
    input: 'GET /repos/owner/repo',
    output: '{"name": "repo", "private": false}',
    timeStart: 1700000220000,
    timeEnd: 1700000230000,
    createdAt: '2026-03-30T10:01:00Z'
  },
  {
    id: 'tool_007',
    messageID: 'msg_t007',
    sessionID: 'ses_root_001',
    type: 'tool',
    tool: 'skill',
    subagentType: 'skill:vue',
    status: 'error',
    input: 'create component',
    error: 'Template validation failed',
    timeStart: 1700000240000,
    timeEnd: 1700000250000,
    createdAt: '2026-03-30T10:01:10Z'
  },
  {
    id: 'tool_008',
    messageID: 'msg_t008',
    sessionID: 'ses_root_001',
    type: 'tool',
    tool: 'glob',
    status: 'completed',
    input: '**/*.test.ts',
    output: '["src/auth.test.ts", "src/session.test.ts"]',
    timeStart: 1700000260000,
    timeEnd: 1700000270000,
    createdAt: '2026-03-30T10:01:20Z'
  }
]

/** 空工具链数据 - 无工具调用记录 */
export const mockToolChainEmpty: PartMeta[] = []

// ============ 导出所有 Mock 数据 ============

export const mockActivityData = {
  // 会话树
  sessionTree: mockSessionTree,
  sessionTreeEmpty: mockSessionTreeEmpty,
  
  // 智能体树
  agentTree: mockAgentTree,
  agentTreeEmpty: mockAgentTreeEmpty,
  
  // 任务流
  taskFlow: mockTaskFlow,
  taskFlowEmpty: mockTaskFlowEmpty,
  taskFlowPartial: mockTaskFlowPartial,
  
  // 工具链
  toolChain: mockToolChain,
  toolChainEmpty: mockToolChainEmpty
}

export default mockActivityData