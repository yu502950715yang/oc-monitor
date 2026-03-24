import { useMemo } from 'react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { useApp } from '../context/AppContext'

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
    <div className="bg-gradient-to-br from-[#161b22] to-[#1c2128] rounded-xl border border-[#30363d] p-6 shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-[#c9d1d9] flex items-center gap-2">
          <span className="w-1 h-5 bg-[#58a6ff] rounded-full"></span>
          Token消耗趋势
        </h3>
        <span className="text-xs text-[#8b949e] bg-[#21262d] px-3 py-1 rounded-full">
          {tokenData.length} 条记录
        </span>
      </div>

      {tokenData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-3 opacity-50">📊</div>
            <div className="text-[#8b949e]">暂无Token数据</div>
            <div className="text-xs text-[#6e7681] mt-1">Token数据需要在API增强后获取</div>
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
                <XAxis dataKey="time" stroke="#6e7681" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6e7681" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
                labelStyle={{ color: '#c9d1d9', fontWeight: 600 }}
                itemStyle={{ fontSize: 12 }}
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
            <div className="bg-gradient-to-br from-[#58a6ff]/10 to-[#58a6ff]/5 rounded-xl p-3 border border-[#58a6ff]/20">
              <div className="text-xs text-[#8b949e] mb-1">总Token</div>
              <div className="text-lg font-bold text-[#58a6ff]">{totalTokens.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-[#3fb950]/10 to-[#3fb950]/5 rounded-xl p-3 border border-[#3fb950]/20">
              <div className="text-xs text-[#8b949e] mb-1">输入</div>
              <div className="text-lg font-bold text-[#3fb950]">{tokenData.reduce((s, d) => s + d.input, 0).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-[#d29922]/10 to-[#d29922]/5 rounded-xl p-3 border border-[#d29922]/20">
              <div className="text-xs text-[#8b949e] mb-1">输出</div>
              <div className="text-lg font-bold text-[#d29922]">{tokenData.reduce((s, d) => s + d.output, 0).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-[#f85149]/10 to-[#f85149]/5 rounded-xl p-3 border border-[#f85149]/20">
              <div className="text-xs text-[#8b949e] mb-1">推理</div>
              <div className="text-lg font-bold text-[#f85149]">{tokenData.reduce((s, d) => s + d.reasoning, 0).toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-[#a371f7]/10 to-[#a371f7]/5 rounded-xl p-3 border border-[#a371f7]/20">
              <div className="text-xs text-[#8b949e] mb-1">缓存</div>
              <div className="text-lg font-bold text-[#a371f7]">{tokenData.reduce((s, d) => s + d.cache, 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}