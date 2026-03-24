import { useMemo } from 'react'
import { useApp } from '../context/AppContext'

export default function StatsPanel() {
  const { sessions, activities } = useApp()

  const stats = useMemo(() => {
    const totalSessions = sessions.length
    
    // 工具调用统计
    const toolActivities = activities.filter(a => a.type === 'tool')
    const totalTools = toolActivities.length
    
    // 错误工具调用
    const errorTools = toolActivities.filter(a => a.status === 'error' || a.error)
    const errorCount = errorTools.length
    
    // MCP工具调用 (通过工具名前缀识别)
    const mcpTools = toolActivities.filter(a => 
      a.toolName && (a.toolName.startsWith('context7_') || a.toolName.startsWith('websearch_'))
    )
    const mcpCount = mcpTools.length
    
    // Token统计
    const messageActivities = activities.filter(a => a.type === 'message' && a.tokens)
    const totalTokens = messageActivities.reduce((sum, m) => sum + (m.tokens?.total || 0), 0)
    
    // 计算错误率
    const errorRate = totalTools > 0 ? Math.round((errorCount / totalTools) * 100) : 0
    
    return {
      totalSessions,
      totalTools,
      errorCount,
      mcpCount,
      totalTokens,
      errorRate,
    }
  }, [sessions, activities])

  const statCards = [
    {
      label: '总Token',
      value: stats.totalTokens > 0 ? stats.totalTokens.toLocaleString() : '-',
      color: 'text-[#3fb950]',
      bg: 'bg-[#3fb950]/10',
      icon: '🪙',
    },
    {
      label: '工具调用',
      value: stats.totalTools,
      color: 'text-[#a371f7]',
      bg: 'bg-[#a371f7]/10',
      icon: '🔧',
    },
    {
      label: 'MCP调用',
      value: stats.mcpCount,
      color: 'text-[#ff7b72]',
      bg: 'bg-[#ff7b72]/10',
      icon: '🔗',
    },
  ]

  return (
    <div className="w-80 bg-[#161b22] border-l border-[#30363d] flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
        <h2 className="font-medium text-[#c9d1d9]">监控统计</h2>
        <span className="text-xs text-[#8b949e]">实时</span>
      </div>

      {/* 统计卡片列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {statCards.map((card, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border border-[#30363d] ${card.bg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#8b949e]">{card.label}</span>
              <span className="text-lg">{card.icon}</span>
            </div>
            <div className={`text-2xl font-semibold ${card.color}`}>
              {card.value}
            </div>
            {card.label === '错误调用' && stats.totalTools > 0 && (
              <div className="text-xs text-[#8b949e] mt-1">
                错误率: {stats.errorRate}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 汇总信息 */}
      <div className="px-4 py-3 border-t border-[#30363d]">
        <div className="text-xs text-[#8b949e] space-y-1">
          <div className="flex items-center justify-between">
            <span>工具调用</span>
            <span className="text-[#a371f7]">{stats.totalTools}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>错误率</span>
            <span className={stats.errorRate > 0 ? 'text-[#f85149]' : 'text-[#3fb950]'}>
              {stats.errorRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}