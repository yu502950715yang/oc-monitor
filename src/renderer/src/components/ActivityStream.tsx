import { useState, useCallback, useMemo } from 'react'
import { formatRelativeTime } from '@/utils/format'
import { 
  Terminal, FileText, CheckSquare, ArrowRightCircle, 
  XCircle, Brain, ChevronDown, ChevronRight, Activity, X
} from 'lucide-react'

// 筛选参数接口
interface ActivityFilters {
  type?: string[]
  tool?: string[]
  status?: string[]
  role?: string[]
  agent?: string[]
  subagentType?: string[]
}

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
  // 增强字段：Agent 信息
  subagentType?: string  // 子 agent 类型（task/agent/subtask 调用时）
}

interface ActivityStreamProps {
  activities: Activity[]
  sessionId?: string | null
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

export default function ActivityStream({ activities, sessionId }: ActivityStreamProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<ActivityFilters>({})
  const [showClearButton, setShowClearButton] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState<Record<string, boolean>>({})

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

  // 从活动数据中提取下拉选项
  const filterOptions = useMemo(() => {
    const types = new Set<string>()
    const tools = new Set<string>()
    const statuses = new Set<string>()
    const roles = new Set<string>()
    const agents = new Set<string>()
    const subagentTypes = new Set<string>()

    activities.forEach(activity => {
      if (activity.type) types.add(activity.type)
      if (activity.toolName) tools.add(activity.toolName)
      if (activity.status) statuses.add(activity.status)
      if (activity.role) roles.add(activity.role)
      if (activity.agent) agents.add(activity.agent)
      if (activity.subagentType) subagentTypes.add(activity.subagentType)
    })

    return {
      type: Array.from(types).sort(),
      tool: Array.from(tools).sort(),
      status: Array.from(statuses).sort(),
      role: Array.from(roles).sort(),
      agent: Array.from(agents).sort(),
      subagentType: Array.from(subagentTypes).sort(),
    }
  }, [activities])

  // 处理筛选变更
  const handleFilterChange = useCallback((key: keyof ActivityFilters, value: string) => {
    setFilters(prev => {
      const current = prev[key] || []
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      
      const newFilters = newValues.length > 0
        ? { ...prev, [key]: newValues }
        : { ...prev }
      delete newFilters[key]
      
      return newFilters
    })
    setShowClearButton(true)
  }, [])

  // 清除所有筛选
  const clearFilters = useCallback(() => {
    setFilters({})
    setShowClearButton(false)
  }, [])

  // 切换下拉菜单
  const toggleDropdown = useCallback((key: string) => {
    setIsDropdownOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // 关闭所有下拉菜单
  const closeAllDropdowns = useCallback(() => {
    setIsDropdownOpen({})
  }, [])

  // 前端筛选活动数据
  const displayActivities = useMemo(() => {
    if (Object.keys(filters).length === 0) {
      return activities
    }

    return activities.filter(activity => {
      // 类型筛选（工具调用）
      if (filters.type?.length && activity.type) {
        if (!filters.type.includes(activity.type)) return false
      }
      // 工具筛选
      if (filters.tool?.length && activity.toolName) {
        if (!filters.tool.includes(activity.toolName)) return false
      }
      // 状态筛选
      if (filters.status?.length && activity.status) {
        if (!filters.status.includes(activity.status)) return false
      }
      // 角色筛选（消息）
      if (filters.role?.length && activity.role) {
        if (!filters.role.includes(activity.role)) return false
      }
      // 智能体筛选
      if (filters.agent?.length && activity.agent) {
        if (!filters.agent.includes(activity.agent)) return false
      }
      // 子智能体筛选
      if (filters.subagentType?.length && activity.subagentType) {
        if (!filters.subagentType.includes(activity.subagentType)) return false
      }
      return true
    })
  }, [activities, filters])

  // 下拉选项映射
  const filterConfig: { key: keyof ActivityFilters; label: string; options: string[] }[] = [
    { key: 'type', label: '类型', options: filterOptions.type },
    { key: 'tool', label: '工具', options: filterOptions.tool },
    { key: 'status', label: '状态', options: filterOptions.status },
    { key: 'role', label: '角色', options: filterOptions.role },
    { key: 'agent', label: '智能体', options: filterOptions.agent },
    { key: 'subagentType', label: '子智能体', options: filterOptions.subagentType },
  ]

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

      {/* 筛选栏 */}
      {sessionId && (
        <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center gap-2 flex-shrink-0 overflow-x-auto">
          {filterConfig.map(({ key, label, options }) => (
            options.length > 0 && (
              <div key={key} className="relative flex-shrink-0">
                <button
                  onClick={() => toggleDropdown(key)}
                  className={`px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${
                    filters[key]?.length
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  {label}
                  {filters[key] && filters[key].length > 0 && (
                    <span className="ml-0.5 w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center">
                      {filters[key]?.length}
                    </span>
                  )}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen[key] ? 'rotate-180' : ''}`} />
                </button>
                {isDropdownOpen[key] && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg shadow-lg py-1 min-w-[120px] max-h-[200px] overflow-y-auto">
                    {options.map(option => (
                      <label
                        key={option}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters[key]?.includes(option) || false}
                          onChange={() => handleFilterChange(key, option)}
                          className="w-3 h-3 rounded border-[var(--color-border)]"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          ))}
          
          {/* 清除筛选按钮 */}
          {showClearButton && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error-bg)] transition-colors flex-shrink-0"
            >
              <X className="w-3 h-3" />
              清除筛选
            </button>
          )}
        </div>
      )}

      {/* 点击外部关闭下拉 */}
      {Object.values(isDropdownOpen).some(v => v) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={closeAllDropdowns}
        />
      )}

      {/* 活动列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {displayActivities.length === 0 ? (
          showClearButton ? (
            <div className="text-center py-8">
              <div className="text-[var(--color-text-secondary)] text-sm mb-3">无匹配结果</div>
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-xs rounded bg-[var(--color-primary)] text-white hover:opacity-80 transition-opacity"
              >
                清除筛选
              </button>
            </div>
          ) : (
            <div className="text-center text-[var(--color-text-secondary)] text-sm py-8">
              暂无活动
            </div>
          )
        ) : (
          displayActivities.map((activity) => {
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
                    {/* Agent 信息（工具调用时显示） */}
                    {!activity.role && activity.agent && (
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        · {activity.agent}
                      </span>
                    )}
                    {/* Subagent 信息（task/agent/subtask 调用时显示） */}
                    {activity.subagentType && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-[#d2a8ff]/20 text-[#d2a8ff]">
                        → {activity.subagentType}
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
                  {(activity.role || activity.agent || activity.messageId || activity.subagentType) && (
                    <div className="mb-3 text-xs text-[var(--color-text-secondary)] space-y-1">
                      {activity.role && <div>角色: {activity.role}</div>}
                      {activity.agent && <div>智能体: {activity.agent}</div>}
                      {activity.subagentType && <div>子智能体: {activity.subagentType}</div>}
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