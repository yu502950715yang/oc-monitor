/**
 * SessionTreeView - 会话树视图组件
 * 使用 React Flow 展示会话层级树，节点显示详细信息
 * 
 * 基于 ActivityTree.tsx 的节点渲染逻辑重构
 */

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
} from '@xyflow/react'
import { RefreshCw, FolderTree } from 'lucide-react'
import '@xyflow/react/dist/style.css'

// 导入 mock 数据用于测试
import { 
  mockSessionTree, 
  mockSessionTreeEmpty,
  type SessionTreeNode 
} from '../__tests__/fixtures/mockActivityData'

// ============ 类型定义 ============

type SessionStatus = 'running' | 'waiting' | 'completed' | 'error'

interface SessionNodeData {
  id: string
  title: string
  projectID: string
  status: SessionStatus
  parentId?: string | null
  level: number
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown // 兼容 React Flow 的 Node data
}

// ============ 工具函数 ============

/** 基于 updatedAt 推断会话状态 */
function inferStatus(updatedAt?: string): SessionStatus {
  if (!updatedAt) return 'completed'
  
  const date = new Date(updatedAt)
  if (isNaN(date.getTime())) return 'completed'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  
  if (diffHours < 1) return 'running'      // 1小时内 = 运行中
  if (diffHours < 24) return 'waiting'     // 1-24小时 = 等待中
  return 'completed'                        // 超过24小时 = 已完成
}

/** 格式化时间 */
function formatDateTime(isoString?: string) {
  if (!isoString) return '未知'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '未知'
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 相对时间格式化 */
function formatRelativeTime(isoString?: string) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin <= 60) return `${diffMin}分钟前`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}小时前`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}天前`
}

/** 状态中文映射 */
function getStatusText(status: SessionStatus): string {
  switch (status) {
    case 'running': return '运行中'
    case 'waiting': return '等待中'
    case 'completed': return '已完成'
    case 'error': return '错误'
    default: return '未知'
  }
}

// ============ 节点颜色配置 ============

const nodeColors: Record<SessionStatus, { bg: string; text: string }> = {
  running: { bg: 'var(--color-success)', text: '#ffffff' },
  waiting: { bg: 'var(--color-warning)', text: '#ffffff' },
  completed: { bg: 'var(--color-info)', text: '#ffffff' },
  error: { bg: 'var(--color-error)', text: '#ffffff' },
}

// ============ 自定义节点组件 ============

interface SessionNodeComponentProps {
  data: SessionNodeData
}

function SessionNodeComponent({ data }: SessionNodeComponentProps) {
  const colors = nodeColors[data.status]
  const [showTooltip, setShowTooltip] = useState(false)
  const nodeRef = useRef<HTMLButtonElement>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  
  // 计算 Tooltip 位置
  const updateTooltipPosition = useCallback(() => {
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect()
      setTooltipPosition({ 
        x: rect.right + 10, 
        y: rect.top 
      })
    }
  }, [])
  
  useEffect(() => {
    if (showTooltip) {
      updateTooltipPosition()
      window.addEventListener('scroll', updateTooltipPosition, true)
      return () => window.removeEventListener('scroll', updateTooltipPosition, true)
    }
  }, [showTooltip, updateTooltipPosition])
  
  // Portal 渲染的 Tooltip
  const tooltipPortal = showTooltip ? createPortal(
    <div 
      className="fixed z-[9999] w-56 max-w-[280px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg"
      style={{ 
        left: tooltipPosition.x, 
        top: tooltipPosition.y 
      }}
    >
      <div className="text-xs space-y-1">
        <div className="font-medium text-[var(--color-text-primary)] truncate">{data.title}</div>
        <div className="text-[var(--color-text-secondary)]">
          状态: <span style={{ color: colors.bg }}>{getStatusText(data.status)}</span>
        </div>
        {data.projectID && (
          <div className="text-[var(--color-text-secondary)] break-all">项目: {data.projectID}</div>
        )}
        {data.createdAt && (
          <div className="text-[var(--color-text-secondary)]">创建: {formatDateTime(data.createdAt)}</div>
        )}
        {data.updatedAt && (
          <div className="text-[var(--color-text-secondary)]">更新: {formatDateTime(data.updatedAt)}</div>
        )}
        <div className="text-[var(--color-text-secondary)] break-all">ID: {data.id}</div>
      </div>
    </div>,
    document.body
  ) : null
  
  return (
    <>
      {tooltipPortal}
      <button
        ref={nodeRef}
        type="button"
        className="relative bg-transparent border-none cursor-pointer"
        onMouseEnter={() => { setShowTooltip(true); updateTooltipPosition() }}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* 连接线 Handle */}
        <Handle type="target" position={Position.Left} style={{ background: 'var(--color-border)' }} />
        
        <div className="px-3 py-2 rounded-lg border-2 min-w-[160px] text-center"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderColor: colors.bg,
          }}
        >
          {/* 会话名称 */}
          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[160px]" title={data.title}>
            {data.title}
          </div>
          
          {/* 状态 */}
          <div className="text-xs mt-1" style={{ color: colors.bg }}>
            {getStatusText(data.status)}
          </div>
          
          {/* 项目ID */}
          {data.projectID && (
            <div className="text-[10px] text-[var(--color-text-muted)] mt-1 truncate max-w-[160px]" title={data.projectID}>
              {data.projectID}
            </div>
          )}
          
          {/* 显示相对时间 */}
          {data.updatedAt && (
            <div className="text-[10px] text-[var(--color-text-secondary)] mt-1">
              {formatRelativeTime(data.updatedAt)}
            </div>
          )}
        </div>
        
        <Handle type="source" position={Position.Right} style={{ background: 'var(--color-border)' }} />
      </button>
    </>
  )
}

const nodeTypes = {
  session: SessionNodeComponent,
}

// ============ 会话树转换函数 ============

/**
 * 将嵌套的 SessionTreeNode 转换为 React Flow 节点数组
 */
function flattenSessionTree(
  node: SessionTreeNode, 
  level: number = 0,
  parentId?: string
): SessionNodeData[] {
  const result: SessionNodeData[] = []
  
  const sessionNode: SessionNodeData = {
    id: node.id,
    title: node.title,
    projectID: node.projectID,
    status: inferStatus(node.updatedAt),
    parentId: parentId || null,
    level,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  }
  
  result.push(sessionNode)
  
  // 递归处理子节点
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      result.push(...flattenSessionTree(child, level + 1, node.id))
    }
  }
  
  return result
}

// ============ 主组件 ============

interface SessionTreeViewProps {
  /** 会话树数据，如果不提供则使用 mock 数据 */
  sessionTree?: SessionTreeNode | null
  /** 是否显示刷新按钮 */
  showRefresh?: boolean
  /** 刷新回调 */
  onRefresh?: () => void
}

export default function SessionTreeView({ 
  sessionTree: propSessionTree,
  showRefresh = false,
  onRefresh,
}: SessionTreeViewProps) {
  // 使用 prop 数据或 mock 数据
  const sessionTree = propSessionTree ?? mockSessionTree
  const [selectedNode, setSelectedNode] = useState<SessionNodeData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // 刷新处理
  const handleRefresh = useCallback(() => {
    if (!onRefresh) return
    setIsRefreshing(true)
    onRefresh()
    setTimeout(() => setIsRefreshing(false), 500)
  }, [onRefresh])
  
  // 点击节点处理
  const onNodeClick = useCallback((_: unknown, node: { data: SessionNodeData }) => {
    setSelectedNode(node.data)
  }, [])
  
  // 关闭详情面板
  const closePanel = useCallback(() => {
    setSelectedNode(null)
  }, [])
  
  // 转换会话树为节点数组
  const sessions = useMemo(() => {
    if (!sessionTree) return []
    return flattenSessionTree(sessionTree)
  }, [sessionTree])
  
  // 计算节点位置
  const nodes = useMemo(() => {
    const levelGroups = new Map<number, number>()
    sessions.forEach(s => {
      const count = levelGroups.get(s.level) || 0
      levelGroups.set(s.level, count + 1)
    })
    const levelIndex = new Map<number, number>()
    
    return sessions.map((session) => {
      const idx = levelIndex.get(session.level) || 0
      levelIndex.set(session.level, idx + 1)
      return {
        id: session.id,
        type: 'session',
        position: { x: session.level * 220, y: idx * 100 },
        data: session,
      }
    })
  }, [sessions])
  
  // 计算边
  const edges = useMemo(() => sessions
    .filter(session => session.parentId)
    .map(session => ({
      id: `${session.parentId}-${session.id}`,
      source: session.parentId!,
      target: session.id,
      type: 'smoothstep',
      style: { stroke: 'var(--color-border)', strokeWidth: 2 },
      animated: session.status === 'running',
    })), [sessions])
  
  // 禁止用户拖拽
  const onNodesChange = useCallback(() => {}, [])
  const onEdgesChange = useCallback(() => {}, [])
  
  const showEmpty = sessions.length === 0
  
  // 空状态
  if (showEmpty) {
    return (
      <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col h-full overflow-hidden">
        {/* 标题栏 */}
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <h2 className="text-sm font-medium text-[var(--color-text-primary)]">会话树</h2>
          </div>
          {showRefresh && onRefresh && (
            <button 
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              title="刷新"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        
        {/* 空状态显示 */}
        <div className="flex-1 flex items-center justify-center text-[var(--color-text-secondary)] text-sm">
          暂无会话数据
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col h-full overflow-hidden">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-bg-secondary)]">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <h2 className="text-sm font-medium text-[var(--color-text-primary)]">会话树</h2>
          <span className="text-xs text-[var(--color-text-muted)]">({sessions.length} 个会话)</span>
        </div>
        {showRefresh && onRefresh && (
          <button 
            type="button"
            onClick={handleRefresh}
            className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
      
      {/* 内容区域 */}
      <div className="flex-1 flex">
        {/* 流程图 */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
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
        
        {/* 详情面板 */}
        {selectedNode && (
          <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
              <h3 className="font-medium text-[var(--color-text-primary)]">会话详情</h3>
              <button 
                type="button"
                onClick={closePanel}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-sm">
                <div className="text-[var(--color-text-secondary)] mb-1">会话名称</div>
                <div className="text-[var(--color-text-primary)] font-medium">{selectedNode.title}</div>
              </div>
              <div className="text-sm">
                <div className="text-[var(--color-text-secondary)] mb-1">状态</div>
                <div style={{ color: nodeColors[selectedNode.status].bg }}>
                  {getStatusText(selectedNode.status)}
                </div>
              </div>
              {selectedNode.projectID && (
                <div className="text-sm">
                  <div className="text-[var(--color-text-secondary)] mb-1">项目ID</div>
                  <div className="text-[var(--color-text-primary)]">{selectedNode.projectID}</div>
                </div>
              )}
              <div className="text-sm">
                <div className="text-[var(--color-text-secondary)] mb-1">创建时间</div>
                <div className="text-[var(--color-text-primary)]">{formatDateTime(selectedNode.createdAt)}</div>
              </div>
              <div className="text-sm">
                <div className="text-[var(--color-text-secondary)] mb-1">更新时间</div>
                <div className="text-[var(--color-text-primary)]">{formatDateTime(selectedNode.updatedAt)}</div>
              </div>
              <div className="text-sm">
                <div className="text-[var(--color-text-secondary)] mb-1">会话ID</div>
                <div className="text-[var(--color-text-primary)] text-xs break-all">{selectedNode.id}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============ 导出 ============

export { mockSessionTree, mockSessionTreeEmpty }
export type { SessionTreeNode, SessionNodeData, SessionStatus }