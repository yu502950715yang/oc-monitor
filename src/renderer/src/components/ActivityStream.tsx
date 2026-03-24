import { useState, useCallback } from 'react'

// Token信息接口
export interface TokenInfo {
  total: number
  input: number
  output: number
  reasoning: number
  cache?: { read: number; write: number }
}

export interface Activity {
  id: string
  type: 'tool' | 'message' | 'plan' | 'task' | 'error' | 'reasoning'
  content: string
  summary?: string
  timestamp: string
  sessionId?: string
  sessionName?: string
  toolName?: string
  status?: string
  // 详细信息字段
  input?: string
  output?: string
  messageId?: string
  role?: string
  agent?: string
  // 增强字段：时间信息
  timeStart?: number
  timeEnd?: number
  duration?: number          // 耗时（毫秒）
  // 增强字段：错误信息
  error?: string
  // 增强字段：完整数据对象（包含tokens等）
  data?: any
  // 增强字段：Token和费用信息（仅message类型）
  tokens?: TokenInfo
  cost?: number
  modelID?: string
  providerID?: string
  finish?: string
  // 增强字段：推理过程
  reasoningContent?: string  // 推理过程内容
}

// 相对时间格式化函数
function formatRelativeTime(isoString: string): string {
  if (!isoString) return '未知'
  
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return '未知'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)

  if (diffSec < 60) return '刚刚'
  if (diffMin <= 5) return `${diffMin}分钟前`
  // 超过5分钟显示具体时间
  return date.toLocaleString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

interface ActivityStreamProps {
  activities: Activity[]
}

// 工具类型对应的颜色
const toolTypeColors: Record<string, { label: string; color: string; bg: string }> = {
  read: { label: '读取', color: 'text-[#58a6ff]', bg: 'bg-[#58a6ff]/10' },
  write: { label: '写入', color: 'text-[#3fb950]', bg: 'bg-[#3fb950]/10' },
  edit: { label: '编辑', color: 'text-[#d29922]', bg: 'bg-[#d29922]/10' },
  bash: { label: '运行', color: 'text-[#f85149]', bg: 'bg-[#f85149]/10' },
  grep: { label: '搜索', color: 'text-[#a371f7]', bg: 'bg-[#a371f7]/10' },
  glob: { label: '查找', color: 'text-[#79c0ff]', bg: 'bg-[#79c0ff]/10' },
  task: { label: '委托', color: 'text-[#d2a8ff]', bg: 'bg-[#d2a8ff]/10' },
  webfetch: { label: '获取', color: 'text-[#ffa657]', bg: 'bg-[#ffa657]/10' },
  'context7_query-docs': { label: 'MCP', color: 'text-[#ff7b72]', bg: 'bg-[#ff7b72]/10' },
  'context7_resolve-library-id': { label: 'MCP', color: 'text-[#ff7b72]', bg: 'bg-[#ff7b72]/10' },
  'websearch_web_search_exa': { label: 'MCP', color: 'text-[#ff7b72]', bg: 'bg-[#ff7b72]/10' },
}

const typeIconMap = {
  tool: { label: '工具', color: 'text-[#a371f7]', bg: 'bg-[#a371f7]/10' },
  message: { label: '消息', color: 'text-[#58a6ff]', bg: 'bg-[#58a6ff]/10' },
  plan: { label: '计划', color: 'text-[#3fb950]', bg: 'bg-[#3fb950]/10' },
  task: { label: '任务', color: 'text-[#d29922]', bg: 'bg-[#d29922]/10' },
  error: { label: '错误', color: 'text-[#f85149]', bg: 'bg-[#f85149]/10' },
  reasoning: { label: '推理', color: 'text-[#79c0ff]', bg: 'bg-[#79c0ff]/10' },
}

export default function ActivityStream({ activities }: ActivityStreamProps) {
  // 详细调试
  const toolActivities = activities?.filter((a: any) => a.type === 'tool') || []
  console.log('[ActivityStream] 总数:', activities?.length, '工具类型:', toolActivities.length, '前3个工具:', toolActivities.slice(0, 3).map(a => ({ id: a.id, summary: a.summary, type: a.type })))
  
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return (
    <div className="flex-1 bg-[#0d1117] flex flex-col min-h-0">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between flex-shrink-0">
        <h2 className="font-medium text-[#c9d1d9]">活动流</h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse"></span>
          <span className="text-xs text-[#8b949e]">实时</span>
          <span className="text-xs text-[#8b949e] ml-2">T11</span>
        </div>
      </div>

      {/* 活动列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activities.length === 0 ? (
          <div className="text-center text-[#8b949e] text-sm py-8">
            暂无活动
          </div>
        ) : (
          activities.map((activity) => {
            // 如果是工具调用，根据工具类型显示不同颜色
            let typeInfo = typeIconMap[activity.type]
            if (activity.type === 'tool' && activity.toolName) {
              const toolColor = toolTypeColors[activity.toolName]
              if (toolColor) {
                typeInfo = toolColor
              }
            }
            
            // 格式化耗时
            const formatDuration = (ms?: number) => {
              if (!ms) return null
              if (ms < 1000) return `${ms}ms`
              if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
              return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
            }
            
            // 判断是否可展开
            const canExpand = activity.input || activity.output || activity.reasoningContent
            
            return (
              <div
                key={activity.id}
                className={`p-3 rounded-lg ${typeInfo.bg} border border-[#30363d] cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => toggleExpand(activity.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {/* 角色/智能体 */}
                    {activity.role && (
                      <span className="text-xs text-[#8b949e]">
                        {activity.role === 'user' ? '用户' : activity.role === 'assistant' ? '助手' : activity.role}
                        {activity.agent && ` · ${activity.agent}`}
                      </span>
                    )}
                    {activity.toolName && activity.type === 'tool' && (
                      <span className="text-xs text-[#8b949e]">
                        · {activity.toolName}
                      </span>
                    )}
                    {activity.status && activity.type === 'tool' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        activity.status === 'completed' ? 'bg-[#3fb950]/20 text-[#3fb950]' :
                        activity.status === 'running' || activity.status === 'in_progress' ? 'bg-[#58a6ff]/20 text-[#58a6ff]' :
                        activity.status === 'error' ? 'bg-[#f85149]/20 text-[#f85149]' :
                        'bg-[#8b949e]/20 text-[#8b949e]'
                      }`}>
                        {activity.status}
                      </span>
                    )}
                    {activity.sessionName && (
                      <span className="text-xs text-[#8b949e]">
                        · {activity.sessionName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#8b949e] flex items-center gap-1">
                    {formatDuration(activity.duration) && (
                      <span className="text-[#d29922]">{formatDuration(activity.duration)}</span>
                    )}
                    {formatRelativeTime(activity.timestamp)}
                    {canExpand && (
                      <span className="ml-1">{expandedIds.has(activity.id) ? '▼' : '▶'}</span>
                    )}
                  </span>
                </div>
                {/* 推理内容单独展示 */}
                {activity.type === 'reasoning' && activity.reasoningContent ? (
                  <p className="text-sm text-[#79c0ff] italic break-all">{activity.reasoningContent.slice(0, 200)}{activity.reasoningContent.length > 200 ? '...' : ''}</p>
                ) : (
                  <p className="text-sm text-[#c9d1d9] break-all">{activity.summary || activity.content}</p>
                )}
                {expandedIds.has(activity.id) && (
                  <div className="mt-3 pt-3 border-t border-[#30363d]">
                    {/* 推理内容详情 */}
                    {activity.type === 'reasoning' && activity.reasoningContent && (
                      <div className="mb-3">
                        <div className="text-xs text-[#8b949e] mb-1">推理过程</div>
                        <pre className="text-xs text-[#79c0ff] bg-[#161b22] p-2 rounded overflow-x-auto whitespace-pre-wrap italic">
                          {activity.reasoningContent}
                        </pre>
                      </div>
                    )}
                    {/* 元信息 */}
                    {(activity.role || activity.agent || activity.messageId) && (
                      <div className="mb-3 text-xs text-[#8b949e] space-y-1">
                        {activity.role && <div>角色: {activity.role}</div>}
                        {activity.agent && <div>智能体: {activity.agent}</div>}
                        {activity.messageId && <div>消息ID: {activity.messageId}</div>}
                        {activity.duration && <div>耗时: {formatDuration(activity.duration)}</div>}
                      </div>
                    )}
                    {activity.input && (
                      <div className="mb-2">
                        <div className="text-xs text-[#8b949e] mb-1">输入</div>
                        <pre className="text-xs text-[#c9d1d9] bg-[#161b22] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {activity.input}
                        </pre>
                      </div>
                    )}
                    {activity.output && (
                      <div>
                        <div className="text-xs text-[#8b949e] mb-1">输出</div>
                        <pre className="text-xs text-[#c9d1d9] bg-[#161b22] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {activity.output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}