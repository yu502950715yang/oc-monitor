import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ReactFlow,
  Controls,
  Background,
  Handle,
  Position,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useApp } from '../context/AppContext'

export interface SessionNode {
  id: string
  name: string
  status: 'running' | 'waiting' | 'completed' | 'error'
  parentId?: string | null
  level: number
  createdAt?: string
  updatedAt?: string
  projectID?: string
}

// 格式化时间
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

// 相对时间
function formatRelativeTime(isoString?: string) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin <= 5) return `${diffMin}分钟前`
  // 超过5分钟显示具体时间
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ActivityTreeProps {
  sessions: SessionNode[]
}

const nodeColors = {
  running: { bg: '#3fb950', text: '#ffffff' },
  waiting: { bg: '#d29922', text: '#ffffff' },
  completed: { bg: '#58a6ff', text: '#ffffff' },
  error: { bg: '#f85149', text: '#ffffff' },
}

function SessionNodeComponent({ data }: { data: SessionNode }) {
  const colors = nodeColors[data.status]
  const [showTooltip, setShowTooltip] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
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
  
  // Portal 渲染的 Tooltip - 避免被遮挡
  const tooltipPortal = showTooltip ? createPortal(
    <div 
      className="fixed z-[9999] w-56 max-w-[280px] bg-[#161b22] border border-[#30363d] rounded-lg p-3 shadow-lg"
      style={{ 
        left: tooltipPosition.x, 
        top: tooltipPosition.y 
      }}
    >
      <div className="text-xs space-y-1">
        <div className="font-medium text-[#c9d1d9] truncate">{data.name}</div>
        <div className="text-[#8b949e]">
          状态: <span style={{ color: colors.bg }}>{data.status === 'running' ? '运行中' : data.status === 'waiting' ? '等待中' : data.status === 'completed' ? '已完成' : '错误'}</span>
        </div>
        {data.projectID && (
          <div className="text-[#8b949e] break-all">项目: {data.projectID}</div>
        )}
        {data.createdAt && (
          <div className="text-[#8b949e]">创建: {formatDateTime(data.createdAt)}</div>
        )}
        {data.updatedAt && (
          <div className="text-[#8b949e]">更新: {formatDateTime(data.updatedAt)}</div>
        )}
        <div className="text-[#8b949e] break-all">ID: {data.id}</div>
      </div>
    </div>,
    document.body
  ) : null
  
  return (
    <>
      {tooltipPortal}
      <div 
        ref={nodeRef}
        className="relative"
        onMouseEnter={() => { setShowTooltip(true); updateTooltipPosition() }}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* 连接线 Handle */}
        <Handle type="target" position={Position.Left} style={{ background: '#30363d' }} />
        
        <div className="px-3 py-2 rounded-lg border-2 min-w-[140px] text-center"
          style={{
            backgroundColor: '#21262d',
            borderColor: colors.bg,
          }}
        >
          <div className="text-sm font-medium text-[#c9d1d9] truncate max-w-[140px]" title={data.name}>
            {data.name}
          </div>
          <div className="text-xs mt-1" style={{ color: colors.bg }}>
            {data.status === 'running' ? '运行中' : 
             data.status === 'waiting' ? '等待中' : 
             data.status === 'completed' ? '已完成' : '错误'}
          </div>
          {/* 显示相对时间 */}
          {data.updatedAt && (
            <div className="text-[10px] text-[#8b949e] mt-1">
              {formatRelativeTime(data.updatedAt)}
            </div>
          )}
        </div>
        
        <Handle type="source" position={Position.Right} style={{ background: '#30363d' }} />
      </div>
    </>
  )
}

const nodeTypes = {
  session: SessionNodeComponent,
}

export default function ActivityTree({ sessions }: ActivityTreeProps) {
  const [selectedNode, setSelectedNode] = useState<SessionNode | null>(null)
  const { refreshSessionTree } = useApp()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // 手动刷新活动树
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    refreshSessionTree()
    // 短暂延迟后恢复按钮状态（让用户知道点击生效了）
    setTimeout(() => setIsRefreshing(false), 500)
  }, [refreshSessionTree])
  
  // 点击节点处理
  const onNodeClick = useCallback((_: any, node: any) => {
    setSelectedNode(node.data)
  }, [])
  
  // 关闭详情面板
  const closePanel = useCallback(() => {
    setSelectedNode(null)
  }, [])
  
  // 使用 useMemo 确保引用稳定
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes = useMemo(() => {
    // 按 level 分组计算 Y 坐标，保持稳定
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
        position: { x: session.level * 200, y: idx * 80 },
        data: session,
      } as any
    })
  }, [sessions])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edges = useMemo(() => sessions
    .filter(session => session.parentId)
    .map(session => ({
      id: `${session.parentId}-${session.id}`,
      source: session.parentId!,
      target: session.id,
      type: 'smoothstep',
      style: { stroke: '#30363d', strokeWidth: 2 },
      animated: session.status === 'running',
    })) as any, [sessions])

  // 直接使用受控模式，不使用 useNodesState 的 setter
  const onNodesChange = useCallback(
    (_changes: any) => {
      // 禁止用户拖拽修改，保持静态展示
    },
    []
  )

  const onEdgesChange = useCallback(
    (_changes: any) => {
      // 禁止用户修改连线
    },
    []
  )

  const onConnect = useCallback(
    (_params: Connection) => {
      // 禁止连接
    },
    []
  )

  // 使用 nodes 判断，因为 sessions 可能短暂为空
  const showEmpty = nodes.length === 0
  
  if (showEmpty) {
    return (
      <div className="flex-1 bg-[#0d1117] flex flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between flex-shrink-0">
          <h2 className="font-medium text-[#c9d1d9]">活动树</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-xs px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] disabled:opacity-50 transition-colors"
            >
              {isRefreshing ? '刷新中...' : '🔄 刷新'}
            </button>
            <span className="text-xs text-[#8b949e]">T13</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-[#8b949e] text-sm">
          暂无会话数据
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col h-full overflow-hidden">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between flex-shrink-0">
        <h2 className="font-medium text-[#c9d1d9]">活动树</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] disabled:opacity-50 transition-colors"
          >
            {isRefreshing ? '刷新中...' : '🔄 刷新'}
          </button>
          <span className="text-xs text-[#8b949e]">T13</span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex">
        {/* 流程图 */}
        <div className="flex-1">
          <ReactFlow
            key={nodes.map(n => n.id).join(',') || 'empty'}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            attributionPosition="bottom-left"
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#30363d" gap={20} />
            <Controls 
              style={{ 
                backgroundColor: '#21262d', 
                borderColor: '#30363d',
                fill: '#c9d1d9'
              }} 
            />
          </ReactFlow>
        </div>
        
        {/* 活动详情面板 */}
        {selectedNode && (
          <div className="w-80 border-l border-[#30363d] bg-[#161b22] flex flex-col">
            <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
              <h3 className="font-medium text-[#c9d1d9]">会话详情</h3>
              <button 
                onClick={closePanel}
                className="text-[#8b949e] hover:text-[#c9d1d9] text-sm"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-sm">
                <div className="text-[#8b949e] mb-1">会话名称</div>
                <div className="text-[#c9d1d9] font-medium">{selectedNode.name}</div>
              </div>
              <div className="text-sm">
                <div className="text-[#8b949e] mb-1">状态</div>
                <div className={selectedNode.status === 'running' ? 'text-[#3fb950]' : selectedNode.status === 'waiting' ? 'text-[#d29922]' : selectedNode.status === 'completed' ? 'text-[#58a6ff]' : 'text-[#f85149]'}>
                  {selectedNode.status === 'running' ? '运行中' : selectedNode.status === 'waiting' ? '等待中' : selectedNode.status === 'completed' ? '已完成' : '错误'}
                </div>
              </div>
              {selectedNode.projectID && (
                <div className="text-sm">
                  <div className="text-[#8b949e] mb-1">项目ID</div>
                  <div className="text-[#c9d1d9]">{selectedNode.projectID}</div>
                </div>
              )}
              <div className="text-sm">
                <div className="text-[#8b949e] mb-1">创建时间</div>
                <div className="text-[#c9d1d9]">{formatDateTime(selectedNode.createdAt)}</div>
              </div>
              <div className="text-sm">
                <div className="text-[#8b949e] mb-1">更新时间</div>
                <div className="text-[#c9d1d9]">{formatDateTime(selectedNode.updatedAt)}</div>
              </div>
              <div className="text-sm">
                <div className="text-[#8b949e] mb-1">会话ID</div>
                <div className="text-[#c9d1d9] text-xs break-all">{selectedNode.id}</div>
              </div>
              <div className="mt-4 p-3 bg-[#21262d] rounded-lg">
                <div className="text-xs text-[#8b949e]">
                  💡 点击会话节点可查看详情，要查看该会话的活动流，请在左侧"活动流"视图中选择对应会话。
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}