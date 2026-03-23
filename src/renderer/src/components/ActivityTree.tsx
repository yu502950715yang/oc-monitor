import { useCallback } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  Connection,
  addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export interface SessionNode {
  id: string
  name: string
  status: 'running' | 'waiting' | 'completed' | 'error'
  parentId?: string | null
  level: number
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
  
  return (
    <div className="px-3 py-2 rounded-lg border-2 min-w-[120px] text-center"
      style={{
        backgroundColor: '#21262d',
        borderColor: colors.bg,
      }}
    >
      <div className="text-sm font-medium text-[#c9d1d9] truncate max-w-[140px]">
        {data.name}
      </div>
      <div className="text-xs mt-1" style={{ color: colors.bg }}>
        {data.status === 'running' ? '运行中' : 
         data.status === 'waiting' ? '等待中' : 
         data.status === 'completed' ? '已完成' : '错误'}
      </div>
    </div>
  )
}

const nodeTypes = {
  session: SessionNodeComponent,
}

export default function ActivityTree({ sessions }: ActivityTreeProps) {
  // 将 sessions 转换为节点
  const initialNodes: Node[] = sessions.map((session) => ({
    id: session.id,
    type: 'session',
    position: { x: session.level * 200, y: sessions.filter(s => s.level === session.level).indexOf(session) * 80 },
    data: session,
  }))

  // 将 sessions 转换为边
  const initialEdges: Edge[] = sessions
    .filter(session => session.parentId)
    .map(session => ({
      id: `${session.parentId}-${session.id}`,
      source: session.parentId!,
      target: session.id,
      type: 'smoothstep',
      style: { stroke: '#30363d', strokeWidth: 2 },
      animated: session.status === 'running',
    }))

  const [nodes, setNodes] = useNodesState(initialNodes)
  const [edges, setEdges] = useEdgesState(initialEdges)

  const onNodesChange = useCallback(
    (changes: any[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  )

  const onEdgesChange = useCallback(
    (changes: any[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  )

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  if (sessions.length === 0) {
    return (
      <div className="flex-1 bg-[#0d1117] flex flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between flex-shrink-0">
          <h2 className="font-medium text-[#c9d1d9]">活动树</h2>
          <span className="text-xs text-[#8b949e]">T13</span>
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
        <span className="text-xs text-[#8b949e]">T13</span>
      </div>

      {/* 流程图 */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
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
    </div>
  )
}