import { useMemo } from 'react'
import { Coins, Wrench, Network, Sparkles, AlertTriangle, DollarSign } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useTokenPrices } from '@/hooks/useTokenPrices'

export default function StatsPanel() {
  const { sessions, activities, sessionStats } = useApp()
  const { findConfigByModelId } = useTokenPrices()

  const stats = useMemo(() => {
    const totalSessions = sessions.length
    
    // 优先使用后端统计
    if (sessionStats && sessionStats.totalTools > 0) {
      // 直接使用后端返回的费用数据
      const totalCost = (sessionStats.tokens as any)?.cost || 0
      const costCurrency = (sessionStats.tokens as any)?.currency || '¥'
      
      return {
        totalSessions,
        totalTools: sessionStats.totalTools,
        errorCount: sessionStats.errorCount,
        mcpCount: sessionStats.mcpCount,
        totalTokens: sessionStats.totalTokens,
        totalCost,
        costCurrency,
        errorRate: sessionStats.errorRate,
        skillCount: sessionStats.skillCount,
        topSkills: sessionStats.topSkills || [],
      }
    }
    
    // 回退到前端计算（当后端统计不可用时）
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
    
    // Token统计 - 从消息 activities 中计算
    const messageActivities = activities.filter(a => a.type === 'message' && a.tokens)
    const totalTokens = messageActivities.reduce((sum, m) => sum + (m.tokens?.total || 0), 0)
    
    // 费用计算 - 从消息 activities 中提取 token 并匹配价格配置
    let totalCost = 0
    let costCurrency = '¥'
    messageActivities.forEach(m => {
      const modelId = m.modelID || 'minimax-m2.5'
      const config = findConfigByModelId(modelId)
      if (config) {
        const tokens = (m.tokens as any) || {}
        const inputTokens = tokens.input || tokens.prompt || 0
        const outputTokens = tokens.output || tokens.completion || 0
        const cacheTokens = tokens.cache || 0
        // 费用 = 缓存token * 缓存单价 + 输入token * 输入单价 + 输出token * 输出单价
        const cost = cacheTokens * config.cachePrice + 
                     inputTokens * config.inputPrice + 
                     outputTokens * config.outputPrice
        totalCost += cost
        costCurrency = config.currency
      }
    })
    
    // 计算错误率
    const errorRate = totalTools > 0 ? Math.round((errorCount / totalTools) * 100) : 0
    
    return {
      totalSessions,
      totalTools,
      errorCount,
      mcpCount,
      totalTokens,
      totalCost,
      costCurrency,
      errorRate,
      skillCount,
      topSkills,
    }
  }, [sessions, activities, sessionStats, findConfigByModelId])

  // 格式化费用显示
  const formatCost = (cost: number, currency: string) => {
    if (cost <= 0) return '-'
    if (cost < 0.01) {
      return `${currency}${cost.toFixed(6)}`
    } else if (cost < 1) {
      return `${currency}${cost.toFixed(4)}`
    } else {
      return `${currency}${cost.toFixed(2)}`
    }
  }

  // 卡片颜色配置 - 使用设计系统变量，支持深色/浅色模式
  const cardColors: Record<string, { accentBg: string; text: string; accent: string }> = {
    '总Token': { accentBg: 'var(--color-accent-yellow-bg)', text: 'var(--color-accent-yellow)', accent: 'var(--color-accent-yellow)' },
    '工具调用': { accentBg: 'var(--color-accent-blue-bg)', text: 'var(--color-accent-blue)', accent: 'var(--color-accent-blue)' },
    'Skills调用': { accentBg: 'var(--color-accent-purple-bg)', text: 'var(--color-accent-purple)', accent: 'var(--color-accent-purple)' },
    'MCP调用': { accentBg: 'var(--color-accent-cyan-bg)', text: 'var(--color-accent-cyan)', accent: 'var(--color-accent-cyan)' },
    '错误': { accentBg: 'var(--color-error-bg)', text: 'var(--color-error)', accent: 'var(--color-error)' },
    '费用': { accentBg: 'var(--color-accent-green-bg)', text: 'var(--color-accent-green)', accent: 'var(--color-accent-green)' },
  }

  const statCards = [
    {
      label: '总Token',
      value: stats.totalTokens > 0 ? stats.totalTokens.toLocaleString() : '-',
      icon: <Coins className="w-5 h-5" />,
    },
    {
      label: '费用',
      value: formatCost(stats.totalCost, stats.costCurrency),
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      label: '工具调用',
      value: stats.totalTools,
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      label: 'Skills调用',
      value: stats.skillCount,
      icon: <Sparkles className="w-5 h-5" />,
    },
    {
      label: 'MCP调用',
      value: stats.mcpCount,
      icon: <Network className="w-5 h-5" />,
    },
    {
      label: '错误',
      value: stats.errorCount,
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  ]

  return (
    <div className="w-80 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="font-medium text-[var(--color-text-primary)]">监控统计</h2>
      </div>

      {/* 统计卡片列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {statCards.map((card, index) => {
          const colors = cardColors[card.label] || { accentBg: 'var(--color-bg-tertiary)', text: 'var(--color-text-secondary)', accent: 'var(--color-text-secondary)' }
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-lg p-3 border border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-border)] hover:shadow-md transition-all duration-200"
              style={{ backgroundColor: colors.accentBg }}
            >
              {/* 左侧色条装饰 */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                style={{ backgroundColor: colors.accent }}
              />
              <div className="flex items-center justify-between pl-3">
                <div className="flex-1">
                  <div className="text-xs text-[var(--color-text-secondary)] mb-0.5">{card.label}</div>
                  <div 
                    className="text-xl font-semibold"
                    style={{ color: colors.text }}
                  >
                    {card.value}
                  </div>
                </div>
                <div 
                  className="p-2 rounded-lg"
                  style={{ 
                    backgroundColor: 'var(--color-bg-primary)',
                    color: colors.text 
                  }}
                >
                  {card.icon}
                </div>
              </div>
            </div>
          )
        })}
        
        {/* Top Skills 列表 */}
        {stats.topSkills.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
            <div className="text-xs text-[var(--color-text-secondary)] mb-2">Top Skills</div>
            {stats.topSkills.map((skill, idx) => (
              <div key={idx} className="flex items-center justify-between py-1">
                <span className="text-xs text-[var(--color-accent-purple)]">{skill.name}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{skill.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 汇总信息 */}
      <div className="px-4 py-3 border-t border-[var(--color-border)]">
        <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
          <div className="flex items-center justify-between">
            <span>工具调用</span>
            <span className="text-[var(--color-accent-purple)]">{stats.totalTools}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>错误率</span>
            <span 
              className="font-medium"
              style={{ color: stats.errorRate > 0 ? 'var(--color-error)' : 'var(--color-success)' }}
            >
              {stats.errorRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}