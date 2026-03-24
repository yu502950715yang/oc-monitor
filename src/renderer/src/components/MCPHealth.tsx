import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useApp } from '../context/AppContext'

const MCP_COLORS = ['#ff7b72', '#ffa657', '#a371f7', '#79c0ff']

export default function MCPHealth() {
  const { activities } = useApp()

  const mcpStats = useMemo(() => {
    const toolActivities = activities.filter(a => 
      a.type === 'tool' && 
      a.toolName && 
      (a.toolName.startsWith('context7_') || a.toolName.startsWith('websearch_'))
    )

    // 按MCP工具分组
    const mcpMap = new Map<string, { total: number; completed: number; errors: number; durations: number[] }>()
    
    toolActivities.forEach(a => {
      const tool = a.toolName!
      // 提取MCP工具基础名
      const baseTool = tool.replace(/^mcp_/, '')
      if (!mcpMap.has(baseTool)) {
        mcpMap.set(baseTool, { total: 0, completed: 0, errors: 0, durations: [] })
      }
      const stats = mcpMap.get(baseTool)!
      stats.total++
      if (a.status === 'completed') stats.completed++
      if (a.status === 'error' || a.error) stats.errors++
      if (a.duration) stats.durations.push(a.duration)
    })

    // 转换为图表数据
    return Array.from(mcpMap.entries()).map(([tool, stats]) => {
      const avgDuration = stats.durations.length > 0
        ? Math.round(stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length)
        : 0
      const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      
      return {
        tool: tool.replace('context7_', '').replace('websearch_', ''),
        toolFull: tool,
        total: stats.total,
        completed: stats.completed,
        errors: stats.errors,
        avgDuration,
        successRate,
      }
    }).sort((a, b) => b.total - a.total)
  }, [activities])

  const totalCalls = mcpStats.reduce((a, b) => a + b.total, 0)
  const totalErrors = mcpStats.reduce((a, b) => a + b.errors, 0)
  const successRate = totalCalls > 0 ? Math.round(((totalCalls - totalErrors) / totalCalls) * 100) : 0
  const successColor = successRate >= 80 ? 'text-[#3fb950]' : 'text-[#f85149]'

  return (
    <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#c9d1d9]">MCP健康度</h3>
      </div>

      {mcpStats.length === 0 ? (
        <div className="text-center text-[#8b949e] py-8 text-sm">
          暂无MCP工具调用
          <div className="text-xs mt-2 text-[#8b949e]/60">
            MCP工具调用会显示为 context7_* 或 websearch_*
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mcpStats}>
              <XAxis dataKey="tool" stroke="#8b949e" fontSize={10} />
              <YAxis stroke="#8b949e" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#21262d',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: '#c9d1d9' }}
              />
              <Bar dataKey="total" name="调用次数" radius={[4, 4, 0, 0]}>
                {mcpStats.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={MCP_COLORS[index % MCP_COLORS.length]} />
                ))}
              </Bar>
              <Bar dataKey="errors" name="错误" fill="#f85149" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* 健康度指标 */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-[#21262d] p-2 rounded">
              <div className="text-[#8b949e]">总调用</div>
              <div className="text-[#ff7b72] font-medium">{totalCalls}</div>
            </div>
            <div className="bg-[#21262d] p-2 rounded">
              <div className="text-[#8b949e]">成功率</div>
              <div className={successColor + " font-medium"}>{successRate}%</div>
            </div>
            <div className="bg-[#21262d] p-2 rounded">
              <div className="text-[#8b949e]">错误数</div>
              <div className="text-[#f85149] font-medium">{totalErrors}</div>
            </div>
          </div>

          {/* 详细列表 */}
          <div className="mt-3 space-y-1">
            {mcpStats.map(mcp => (
              <div key={mcp.toolFull} className="flex items-center justify-between text-xs bg-[#21262d] px-2 py-1 rounded">
                <span className="text-[#c9d1d9]">{mcp.toolFull}</span>
                <div className="flex gap-3">
                  <span className="text-[#8b949e]">{mcp.total}次</span>
                  <span className={mcp.successRate >= 80 ? "text-[#3fb950]" : "text-[#f85149]"}>
                    {mcp.successRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}