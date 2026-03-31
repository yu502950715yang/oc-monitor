import { useMemo, useState, useCallback } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
} from '@xyflow/react'
import { Bot, GitBranch, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'
import '@xyflow/react/dist/style.css'
import { mockAgentTree, type PartMeta } from '../__tests__/fixtures/mockActivityData'

// ============ 类型定义 ============

/** 智能体类型映射 */
export type AgentType = 'task' | 'agent' | 'subtask'

/** 智能体节点数据 */
export interface AgentNodeData {
  id: string
  name: string
  agentType: AgentType
  subagentType: string
  action: string
  status: 'completed' | 'running' | 'pending' | 'error'
  duration: number
  error?: string
  parentId?: string | null
}

// ============ 智能体类型配置 ============

const agentTypeConfig: Record<AgentType, { label: string; color: string; bgColor: string }> = {
  task: { label: '任务委托', color: '#a371f7', bgColor: 'rgba(163, 113, 247, 0.15)' },
  agent: { label: '智能体调用', color: '#58a6ff', bgColor: 'rgba(88, 166, 255, 0.15)' },
  subtask: { label: '子任务', color: '#3fb950', bgColor: 'rgba(63, 185, 80, 0.15)' },
}

const subagentTypeColors: Record<string, string> = {
  explore: '#58a6ff',
  librarian: '#a371f7',
  oracle: '#d29922',
  build: '#3fb950',
  metis: '#39d2c0',
  hephaestus: '#f85149',
  momus: '#e3b341',
}

// ============ 工具函数 ============

/** 格式化耗时 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}m ${sec}s`
}

/** 根据 subagentType 确定智能体类型 */
function getAgentType(subagentType?: string): AgentType {
  // 已知的主智能体类型
  const mainAgents = ['explore', 'librarian', 'oracle', 'build', 'metis', 'hephaestus', 'momus']
  if (subagentType && mainAgents.includes(subagentType)) {
    return 'agent'
  }
  return 'task' // 默认作为任务委托处理
}

/** 构建智能体树节点 */
function buildAgentTree(parts: PartMeta[]) {
  const nodes: AgentNodeData[] = parts.map((part, index) => {
    const duration = part.timeEnd && part.timeStart 
      ? part.timeEnd - part.timeStart 
      : 0
    
    return {
      id: part.id,
      name: part.subagentType || 'unknown',
      agentType: getAgentType(part.subagentType),
      subagentType: part.subagentType || 'unknown',
      action: part.action || '',
      status: (part.status as AgentNodeData['status']) || 'pending',
      duration,
      error: part.error,
      // 简单层级关系：第一个是根，其他是子节点
      parentId: index === 0 ? null : parts[0]?.id,
    }
  })
  
  return nodes
}

// ============ 自定义节点组件 ============

function AgentNodeComponent({ data }: { data: AgentNodeData }) {
  const [showDetails, setShowDetails] = useState(false)
  const config = agentTypeConfig[data.agentType]
  const subagentColor = subagentTypeColors[data.subagentType] || config.color
  
  // 状态图标和颜色
  const statusConfig = {
    completed: { icon: CheckCircle2, color: 'var(--color-success)' },
    running: { icon: Loader2, color: 'var(--color-warning)' },
    pending: { icon: Clock, color: 'var(--color-text-muted)' },
    error: { icon: AlertCircle, color: 'var(--color-error)' },
  }
  const StatusIcon = statusConfig[data.status].icon
  
  return (
    <>
      <button
        type="button"
        className="relative min-w-[160px] cursor-pointer"
        onMouseEnter={() => setShowDetails(true)}
        onMouseLeave={() => setShowDetails(false)}
        aria-label={`智能体 ${data.subagentType} 详情`}
      >
        {/* 连接线 Handle - 左侧输入 */}
        <Handle 
          type="target" 
          position={Position.Left} 
          style={{ background: 'var(--color-border)' }} 
        />
        
        <div 
          className="px-3 py-2.5 rounded-lg border-2 bg-[var(--color-bg-tertiary)] transition-all hover:shadow-md"
          style={{ borderColor: subagentColor }}
        >
          {/* 智能体类型标签 */}
          <div 
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium mb-2"
            style={{ 
              backgroundColor: config.bgColor, 
              color: config.color 
            }}
          >
            <Bot className="w-3 h-3" />
            {config.label}
          </div>
          
          {/* 智能体名称 */}
          <div className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" style={{ color: subagentColor }} />
            <span>{data.subagentType}</span>
          </div>
          
          {/* 动作描述 */}
          <div className="text-xs text-[var(--color-text-secondary)] mt-1 truncate max-w-[140px]" title={data.action}>
            {data.action}
          </div>
          
          {/* 底部状态和耗时 */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-1" style={{ color: statusConfig[data.status].color }}>
              <StatusIcon className={`w-3 h-3 ${data.status === 'running' ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-medium">
                {data.status === 'completed' ? '已完成' : 
                 data.status === 'running' ? '运行中' : 
                 data.status === 'pending' ? '等待中' : '错误'}
              </span>
            </div>
            {data.duration > 0 && (
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {formatDuration(data.duration)}
              </span>
            )}
          </div>
        </div>
        
        {/* 连接线 Handle - 右侧输出 */}
        <Handle 
          type="source" 
          position={Position.Right} 
          style={{ background: 'var(--color-border)' }} 
        />
      </button>
      
      {/* 详情弹窗 */}
      {showDetails && (
        <div 
          className="fixed z-50 w-64 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg"
          style={{ 
            // 计算位置避免溢出
            left: '50%',
            transform: 'translateX(-50%)',
            top: '100%',
            marginTop: '8px'
          }}
        >
          <div className="text-xs space-y-2">
            <div>
              <span className="text-[var(--color-text-secondary)]">智能体: </span>
              <span className="text-[var(--color-text-primary)] font-medium">{data.subagentType}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">动作: </span>
              <span className="text-[var(--color-text-primary)]">{data.action}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">类型: </span>
              <span style={{ color: config.color }}>{config.label}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">状态: </span>
              <span style={{ color: statusConfig[data.status].color }}>
                {data.status === 'completed' ? '已完成' : 
                 data.status === 'running' ? '运行中' : 
                 data.status === 'pending' ? '等待中' : '错误'}
              </span>
            </div>
            {data.duration > 0 && (
              <div>
                <span className="text-[var(--color-text-secondary)]">耗时: </span>
                <span className="text-[var(--color-text-primary)]">{formatDuration(data.duration)}</span>
              </div>
            )}
            {data.error && (
              <div className="p-2 bg-[var(--color-error-bg)] rounded border border-[var(--color-error)]">
                <span className="text-[var(--color-error)] text-[10px]">{data.error}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const nodeTypes = {
  agent: AgentNodeComponent,
}

// ============ 主组件 ============

interface AgentTreeViewProps {
  /** 智能体数据，默认使用 mock 数据 */
  data?: PartMeta[]
  /** 是否显示空状态 */
  emptyText?: string
}

export default function AgentTreeView({ 
  data = mockAgentTree,
  emptyText = '暂无智能体调用记录'
}: AgentTreeViewProps) {
  // 构建节点数据
  const nodes = useMemo(() => {
    const agentNodes = buildAgentTree(data)
    
    return agentNodes.map((node, index) => ({
      id: node.id,
      type: 'agent',
      position: { x: index * 220, y: 50 },
      data: node as unknown as Record<string, unknown>,
    })) as any
  }, [data])
  
  // 构建边（连接父子节点）
  const edges = useMemo(() => {
    const agentNodes = buildAgentTree(data)
    return agentNodes
      .filter(node => node.parentId)
      .map(node => ({
        id: `${node.parentId}-${node.id}`,
        source: node.parentId!,
        target: node.id,
        type: 'smoothstep',
        style: { stroke: 'var(--color-border)', strokeWidth: 2 },
        animated: node.status === 'running',
      }))
  }, [data])
  
  // 禁止用户拖拽
  const onNodesChange = useCallback(() => {}, [])
  const onEdgesChange = useCallback(() => {}, [])
  
  // 空状态
  if (nodes.length === 0) {
    return (
      <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">智能体树</h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            展示智能体调用层级结构
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Bot className="w-12 h-12 mx-auto text-[var(--color-text-muted)] mb-3" />
            <p className="text-sm text-[var(--color-text-secondary)]">{emptyText}</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col h-full overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">智能体树</h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
          展示智能体调用层级结构 (共 {nodes.length} 个)
        </p>
      </div>
      
      {/* 流程图 */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="var(--color-border)" gap={20} />
          <Controls 
            style={{ 
              backgroundColor: 'var(--color-bg-tertiary)', 
              borderColor: 'var(--color-border)',
              fill: 'var(--color-text-primary)'
            }} 
          />
        </ReactFlow>
      </div>
    </div>
  )
}

// ============ 导出类型 ============

