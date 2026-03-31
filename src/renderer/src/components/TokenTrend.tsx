import { useMemo } from 'react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useTokenHistory } from '../hooks/useApi'
import { useApp } from '../context/AppContext'
import { TrendingUp, BarChart3, Loader2 } from 'lucide-react'

export default function TokenTrend() {
  const { selectedSessionId } = useApp()
  const { data, loading } = useTokenHistory(selectedSessionId)

  // 后端已排序，直接使用 data.tokenHistory 数组
  const tokenData = useMemo(() => {
    if (!data?.tokenHistory) return []
    
    // 取最近20条（后端已排序）
    return data.tokenHistory
      .slice(-20)
      .map((t, index) => ({
        index,
        time: new Date(t.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        total: t.total,
        input: t.input,
        output: t.output,
        reasoning: t.reasoning,
        cache: t.cache,
        cost: 0, // 如需计算可添加
      }))
  }, [data])

  // 使用完整数据计算各项统计
  const tokenStats = useMemo(() => {
    const history = data?.tokenHistory || []
    return {
      total: history.reduce((a, b) => a + b.total, 0),
      input: history.reduce((a, b) => a + b.input, 0),
      output: history.reduce((a, b) => a + b.output, 0),
      reasoning: history.reduce((a, b) => a + b.reasoning, 0),
      cache: history.reduce((a, b) => a + b.cache, 0),
    }
  }, [data])

  return (
    <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-lg flex flex-col h-full overflow-visible">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[var(--color-accent-blue)]" />
          Token消耗趋势
        </h3>
        <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-3 py-1 rounded-full">
          最近 {tokenData.length} 条记录
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-3 text-[var(--color-accent-blue)] animate-spin" />
            <div className="text-[var(--color-text-secondary)]">加载中...</div>
          </div>
        </div>
      ) : tokenData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)] opacity-50" />
            <div className="text-[var(--color-text-secondary)]">暂无Token数据</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-1">Token数据需要在API增强后获取</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 relative">
          <div className="flex-1 min-h-0 relative z-20">
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
                    <stop offset="5%" stopColor="#f778ba" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f778ba" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCache" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
<XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  isAnimationActive={false}
                  contentStyle={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 99999,
                  }}
                  labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--color-text-secondary)', fontSize: 12 }}
                />
<Area type="monotone" dataKey="total" stackId="1" stroke="#58a6ff" fill="url(#colorTotal)" name="总Token" strokeWidth={2} />
                <Area type="monotone" dataKey="input" stackId="2" stroke="#3fb950" fill="url(#colorInput)" name="输入" strokeWidth={2} />
                <Area type="monotone" dataKey="output" stackId="3" stroke="#d29922" fill="url(#colorOutput)" name="输出" strokeWidth={2} />
                <Area type="monotone" dataKey="reasoning" stackId="4" stroke="#f778ba" fill="url(#colorReasoning)" name="推理" strokeWidth={2} />
                <Area type="monotone" dataKey="cache" stackId="5" stroke="#a855f7" fill="url(#colorCache)" name="缓存" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 统计摘要 */}
          <div className="mt-4 grid grid-cols-5 gap-3 flex-shrink-0 relative z-0">
            <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-accent-blue)]/40 transition-all duration-300">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">总Token</div>
              <div className="text-lg font-bold text-[var(--color-accent-blue)]">{tokenStats.total.toLocaleString()}</div>
            </div>
            <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-success)]/40 transition-all duration-300">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">输入</div>
              <div className="text-lg font-bold text-[var(--color-success)]">{tokenStats.input.toLocaleString()}</div>
            </div>
            <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-accent-yellow)]/40 transition-all duration-300">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">输出</div>
              <div className="text-lg font-bold text-[var(--color-accent-yellow)]">{tokenStats.output.toLocaleString()}</div>
            </div>
            <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[#f778ba]/40 transition-all duration-300">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">推理</div>
              <div className="text-lg font-bold text-[#f778ba]">{tokenStats.reasoning.toLocaleString()}</div>
            </div>
            <div className="relative overflow-hidden bg-[var(--color-bg-tertiary)] rounded-xl p-3 border border-[var(--color-border)] hover:border-[var(--color-accent-purple)]/40 transition-all duration-300">
              <div className="text-xs text-[var(--color-text-secondary)] mb-1">缓存</div>
              <div className="text-lg font-bold text-[var(--color-accent-purple)]">{tokenStats.cache.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}