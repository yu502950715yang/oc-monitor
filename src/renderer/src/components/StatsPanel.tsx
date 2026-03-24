import { useMemo } from 'react'
import { useApp } from '../context/AppContext'

// 专业SVG彩色图标组件
const TokenIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" clipRule="evenodd" />
  </svg>
)

const ToolIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
  </svg>
)

const MCPIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
)

const SkillIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z" />
  </svg>
)

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
    
    // Skill调用统计
    const skillActivities = toolActivities.filter(a => a.toolName === 'skill')
    const skillCount = skillActivities.length
    
    // 按skill名称分组统计
    const skillCountMap: Record<string, number> = {}
    skillActivities.forEach(call => {
      const skillName = (call as any).skillName || 'unknown'
      skillCountMap[skillName] = (skillCountMap[skillName] || 0) + 1
    })
    
    // 获取Top Skills
    const topSkills = Object.entries(skillCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    
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
      skillCount,
      topSkills,
    }
  }, [sessions, activities])

  // 卡片颜色配置
  const cardColors: Record<string, { from: string; to: string; border: string; hover: string; text: string }> = {
    '总Token': { from: 'from-[#fbbf24]/20', to: 'to-[#fbbf24]/5', border: 'border-[#fbbf24]/20', hover: 'hover:border-[#fbbf24]/40', text: 'text-[#fbbf24]' },
    '工具调用': { from: 'from-[#3b82f6]/20', to: 'to-[#3b82f6]/5', border: 'border-[#3b82f6]/20', hover: 'hover:border-[#3b82f6]/40', text: 'text-[#3b82f6]' },
    'Skills调用': { from: 'from-[#a855f7]/20', to: 'to-[#a855f7]/5', border: 'border-[#a855f7]/20', hover: 'hover:border-[#a855f7]/40', text: 'text-[#a855f7]' },
    'MCP调用': { from: 'from-[#06b6d4]/20', to: 'to-[#06b6d4]/5', border: 'border-[#06b6d4]/20', hover: 'hover:border-[#06b6d4]/40', text: 'text-[#06b6d4]' },
    '错误': { from: 'from-[#f85149]/20', to: 'to-[#f85149]/5', border: 'border-[#f85149]/20', hover: 'hover:border-[#f85149]/40', text: 'text-[#f85149]' },
  }

  const statCards = [
    {
      label: '总Token',
      value: stats.totalTokens > 0 ? stats.totalTokens.toLocaleString() : '-',
      icon: <TokenIcon />,
    },
    {
      label: '工具调用',
      value: stats.totalTools,
      icon: <ToolIcon />,
    },
    {
      label: 'Skills调用',
      value: stats.skillCount,
      icon: <SkillIcon />,
    },
    {
      label: 'MCP调用',
      value: stats.mcpCount,
      icon: <MCPIcon />,
    },
    {
      label: '错误',
      value: stats.errorCount,
      icon: <span className="text-lg">⚠</span>,
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
        {statCards.map((card, index) => {
          const colors = cardColors[card.label] || { from: 'from-[#30363d]/20', to: 'to-[#30363d]/5', border: 'border-[#30363d]/20', hover: 'hover:border-[#30363d]/40', text: 'text-[#8b949e]' }
          return (
            <div
              key={index}
              className={`relative overflow-hidden p-4 rounded-xl border ${colors.border} bg-gradient-to-br ${colors.from} ${colors.to} ${colors.hover} transition-all duration-300 group`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#8b949e]">{card.label}</span>
                <span className={`text-lg ${colors.text}`}>{card.icon}</span>
              </div>
              <div className={`text-2xl font-semibold ${colors.text}`}>
                {card.value}
              </div>
            </div>
          )
        })}
        
        {/* Top Skills 列表 */}
        {stats.topSkills.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#30363d]">
            <div className="text-xs text-[#8b949e] mb-2">Top Skills</div>
            {stats.topSkills.map((skill, idx) => (
              <div key={idx} className="flex items-center justify-between py-1">
                <span className="text-xs text-[#a855f7]">{skill.name}</span>
                <span className="text-xs text-[#8b949e]">{skill.count}</span>
              </div>
            ))}
          </div>
        )}
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