import { useMemo } from 'react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useApp } from '../context/AppContext'
import { TrendingUp, BarChart3 } from 'lucide-react'

export default function TokenTrend() {
  const { activities } = useApp()

  const tokenData = useMemo(() => {
    // 查找包含tokens的消息
    const messagesWithTokens = activities.filter(a => 
      a.type === 'message' && a.tokens
    )

    // 按时间排序并限制最近20条
    return messagesWithTokens
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-20)
      .map((m, index) => ({
        index,
        time: new Date(m.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        total: m.tokens?.total || 0,
        input: m.tokens?.input || 0,
        output: m.tokens?.output || 0,
        reasoning: m.tokens?.reasoning || 0,
        cache: m.tokens?.cache?.read || 0,
        cost: m.cost || 0,
      }))
  }, [activities])

  const totalTokens = tokenData.reduce((a, b) => a + b.total, 0)

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--color-accent-blue)]" />
          Token消耗趋势
        </h3>
        <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-3 py-1 rounded-full">
          {tokenData.length} 条记录
        </span>
      </div>

      {tokenData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)] opacity-50" />
            <div className="text-[var(--color-text-secondary)]">暂无Token数据</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">Token数据需要在API增强后获取</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tokenData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#58a6ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#58a6ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3fb950" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3fb950" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d29922" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#d29922" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReasoning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f85149" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f85149" stopOpacity={0}/>
                  </linearGradient>
                </defs>
<XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                  labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--color-text-secondary)', fontSize: 12 }}
                />
              <Area type="monotone" dataKey="total" stackId="1" stroke="#58a6ff" fill="url(#colorTotal)" name="总Token" strokeWidth={2} />
              <Area type="monotone" dataKey="input" stackId="2" stroke="#3fb950" fill="url(#colorInput)" name="输入" strokeWidth={2} />
              <Area type="monotone" dataKey="output" stackId="3" stroke="#d29922" fill="url(#colorOutput)" name="输出" strokeWidth={2} />
              <Area type="monotone" dataKey="reasoning" stackId="4" stroke="#f85149" fill="url(#colorReasoning)" name="推理" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 统计摘要 */}
          <div className="mt-4 grid grid-cols-5 gap-3 flex-shrink-0">
            <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-accent-blue)]/40 transition-all duration-300">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">总Token</div>
              <div className="text-lg font-bold text-[var(--color-accent-blue)]">{totalTokens.toLocaleString()}</div>
            </div>
            <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-success)]/40 transition-all duration-300">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">输入</div>
              <div className="text-lg font-bold text-[var(--color-success)]">{tokenData.reduce((s, d) => s + d.input, 0).toLocaleString()}</div>
            </div>
            <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-accent-yellow)]/40 transition-all duration-300">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">输出</div>
              <div className="text-lg font-bold text-[var(--color-accent-yellow)]">{tokenData.reduce((s, d) => s + d.output, 0).toLocaleString()}</div>
            </div>
            <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-error)]/40 transition-all duration-300">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">推理</div>
              <div className="text-lg font-bold text-[var(--color-error)]">{tokenData.reduce((s, d) => s + d.reasoning, 0).toLocaleString()}</div>
            </div>
            <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-accent-purple)]/40 transition-all duration-300">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">缓存</div>
              <div className="text-lg font-bold text-[var(--color-accent-purple)]">{tokenData.reduce((s, d) => s + d.cache, 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}