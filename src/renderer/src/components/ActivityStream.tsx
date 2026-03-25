import { useState, useCallback } from 'react'
import { formatRelativeTime } from '@/utils/format'
import { 
  Terminal, FileText, CheckSquare, ArrowRightCircle, 
  XCircle, Brain, ChevronDown, ChevronRight, Activity
} from 'lucide-react'

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
  skillName?: string
  userMessage?: string
  
}

interface ActivityStreamProps {
  activities: Activity[]
}

// 工具类型对应的颜色 - 使用设计系统变量
const toolTypeColors: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  read: { label: '读取', color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info-bg)]', Icon: FileText },
  write: { label: '写入', color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-bg)]', Icon: FileText },
  edit: { label: '编辑', color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-bg)]', Icon: Terminal },
  bash: { label: '运行', color: 'text-[var(--color-error)]', bg: 'bg-[var(--color-error-bg)]', Icon: Terminal },
  grep: { label: '搜索', color: 'text-[#a371f7]', bg: 'bg-[#a371f7]/10', Icon: Terminal },
  glob: { label: '查找', color: 'text-[#79c0ff]', bg: 'bg-[#79c0ff]/10', Icon: Terminal },
  skill: { label: '技能', color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/10', Icon: Brain },
  task: { label: '委托', color: 'text-[#d2a8ff]', bg: 'bg-[#d2a8ff]/10', Icon: ArrowRightCircle },
  webfetch: { label: '获取', color: 'text-[#ffa657]', bg: 'bg-[#ffa657]/10', Icon: Terminal },
  'context7_query-docs': { label: 'MCP', color: 'text-[#ff7b72]', bg: 'bg-[#ff7b72]/10', Icon: Terminal },
  'context7_resolve-library-id': { label: 'MCP', color: 'text-[#ff7b72]', bg: 'bg-[#ff7b72]/10', Icon: Terminal },
  'websearch_web_search_exa': { label: 'MCP', color: 'text-[#ff7b72]', bg: 'bg-[#ff7b72]/10', Icon: Terminal },
}

const typeIconMap = {
  tool: { label: '工具', color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary-bg)]', Icon: Terminal },
  message: { label: '消息', color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info-bg)]', Icon: FileText },
  plan: { label: '计划', color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-bg)]', Icon: CheckSquare },
  task: { label: '任务', color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-bg)]', Icon: ArrowRightCircle },
  error: { label: '错误', color: 'text-[var(--color-error)]', bg: 'bg-[var(--color-error-bg)]', Icon: XCircle },
  reasoning: { label: '推理', color: 'text-[#79c0ff]', bg: 'bg-[#79c0ff]/10', Icon: Brain },
}

export default function ActivityStream({ activities }: ActivityStreamProps) {
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
    <div className="flex-1 bg-[var(--color-bg-primary)] flex flex-col min-h-0">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
        <h2 className="font-medium text-[var(--color-text-primary)]">活动流</h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse"></span>
          <span className="text-xs text-[var(--color-text-secondary)]">实时</span>
        </div>
      </div>

      {/* 活动列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activities.length === 0 ? (
          <div className="text-center text-[var(--color-text-secondary)] text-sm py-8">
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
            
            const TypeIcon = typeInfo.Icon || Activity
            
            // 格式化耗时
            const formatDuration = (ms?: number) => {
              if (!ms) return null
              if (ms < 1000) return `${ms}ms`
              if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
              return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
            }
            
            // 判断是否可展开
            const canExpand = activity.input || activity.output || activity.reasoningContent
            const isExpanded = expandedIds.has(activity.id)
            
            return (
              <div
                key={activity.id}
                className={`p-3 rounded-lg ${typeInfo.bg} border border-[var(--color-border)] cursor-pointer hover:opacity-80 transition-all duration-[var(--transition-base)]`}
                onClick={() => toggleExpand(activity.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TypeIcon className={`w-3.5 h-3.5 ${typeInfo.color}`} />
                    <span className={`text-xs font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    {/* 角色/智能体 */}
                    {activity.role && (
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {activity.role === 'user' ? '用户' : activity.role === 'assistant' ? '助手' : activity.role}
                        {activity.agent && ` · ${activity.agent}`}
                      </span>
                    )}
                    {/* Skill 工具调用显示 */}
                    {activity.skillName && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#a855f7]/20 text-[#a855f7]">
                        [Skill] {activity.skillName}
                      </span>
                    )}
                    {activity.toolName && activity.type === 'tool' && (
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        · {activity.toolName}
                      </span>
                    )}
                    {activity.status && activity.type === 'tool' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        activity.status === 'completed' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
                        activity.status === 'running' || activity.status === 'in_progress' ? 'bg-[var(--color-info-bg)] text-[var(--color-info)]' :
                        activity.status === 'error' ? 'bg-[var(--color-error-bg)] text-[var(--color-error)]' :
                        'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                      }`}>
                        {activity.status}
                      </span>
                    )}
                    {activity.sessionName && (
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        · {activity.sessionName}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                    {formatDuration(activity.duration) && (
                      <span className="text-[var(--color-warning)]">{formatDuration(activity.duration)}</span>
                    )}
                    {formatRelativeTime(activity.timestamp)}
                    {canExpand && (
                      <span className="ml-1 transition-transform duration-[var(--transition-base)]">
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </span>
                    )}
                  </span>
                </div>
                {/* 推理内容单独展示 */}
                {activity.type === 'reasoning' && activity.reasoningContent ? (
                  <p className="text-sm text-[#79c0ff] italic break-all">{activity.reasoningContent.slice(0, 200)}{activity.reasoningContent.length > 200 ? '...' : ''}</p>
                ) : (
                  <p className="text-sm text-[var(--color-text-primary)] break-all">{activity.summary || activity.content}</p>
                )}
                <div className={`overflow-hidden transition-all duration-[var(--transition-base)] ${isExpanded ? 'mt-3 pt-3 border-t border-[var(--color-border)]' : 'max-h-0'}`}>
                  {/* 推理内容详情 */}
                  {activity.type === 'reasoning' && activity.reasoningContent && (
                    <div className="mb-3">
                      <div className="text-xs text-[var(--color-text-secondary)] mb-1">推理过程</div>
                      <pre className="text-xs text-[#79c0ff] bg-[var(--color-bg-secondary)] p-2 rounded overflow-x-auto whitespace-pre-wrap italic">
                        {activity.reasoningContent}
                      </pre>
                    </div>
                  )}
                  {/* 元信息 */}
                  {(activity.role || activity.agent || activity.messageId) && (
                    <div className="mb-3 text-xs text-[var(--color-text-secondary)] space-y-1">
                      {activity.role && <div>角色: {activity.role}</div>}
                      {activity.agent && <div>智能体: {activity.agent}</div>}
                      {activity.messageId && <div>消息ID: {activity.messageId}</div>}
                      {activity.duration && <div>耗时: {formatDuration(activity.duration)}</div>}
                    </div>
                  )}
                  {activity.input && (
                    <div className="mb-2">
                      <div className="text-xs text-[var(--color-text-secondary)] mb-1">输入</div>
                      <pre className="text-xs text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {activity.input}
                      </pre>
                    </div>
                  )}
                  {activity.output && (
                    <div>
                      <div className="text-xs text-[var(--color-text-secondary)] mb-1">输出</div>
                      <pre className="text-xs text-[var(--color-text-primary)] bg-[var(--color-bg-secondary)] p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {activity.output}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}