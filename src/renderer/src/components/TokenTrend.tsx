import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
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
  const totalCost = tokenData.reduce((a, b) => a + b.cost, 0)

  return (
    <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#c9d1d9]">Token消耗趋势</h3>
      </div>

      {tokenData.length === 0 ? (
        <div className="text-center text-[#8b949e] py-8 text-sm">
          暂无Token数据
          <div className="text-xs mt-2 text-[#8b949e]/60">
            Token数据需要在API增强后获取
          </div>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={tokenData}>
              <XAxis dataKey="time" stroke="#8b949e" fontSize={10} />
              <YAxis stroke="#8b949e" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#21262d',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: '#c9d1d9' }}
              />
              <Area type="monotone" dataKey="total" stackId="1" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.3} name="总Token" />
              <Area type="monotone" dataKey="input" stackId="2" stroke="#3fb950" fill="#3fb950" fillOpacity={0.3} name="输入" />
              <Area type="monotone" dataKey="output" stackId="3" stroke="#d29922" fill="#d29922" fillOpacity={0.3} name="输出" />
              <Area type="monotone" dataKey="reasoning" stackId="4" stroke="#f85149" fill="#f85149" fillOpacity={0.3} name="推理" />
              <Area type="monotone" dataKey="cache" stackId="5" stroke="#a371f7" fill="#a371f7" fillOpacity={0.3} name="缓存" />
            </AreaChart>
          </ResponsiveContainer>

          {/* 统计摘要 */}
          <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
            <div className="bg-[#21262d] p-2 rounded">
              <div className="text-[#8b949e]">总Token</div>
              <div className="text-[#58a6ff] font-medium">{totalTokens.toLocaleString()}</div>
            </div>
            <div className="bg-[#21262d] p-2 rounded">
              <div className="text-[#8b949e]">输入</div>
              <div className="text-[#3fb950] font-medium">{tokenData.reduce((s, d) => s + d.input, 0).toLocaleString()}</div>
            </div>
            <div className="bg-[#21262d] p-2 rounded">
              <div className="text-[#8b949e]">输出</div>
              <div className="text-[#d29922] font-medium">{tokenData.reduce((s, d) => s + d.output, 0).toLocaleString()}</div>
            </div>
            <div className="bg-[#21262d] p-2 rounded">
              <div className="text-[#8b949e]">推理</div>
              <div className="text-[#f85149] font-medium">{tokenData.reduce((s, d) => s + d.reasoning, 0).toLocaleString()}</div>
            </div>
            <div className="bg-[#21262d] p-2 rounded">
              <div className="text-[#8b949e]">缓存</div>
              <div className="text-[#a371f7] font-medium">{tokenData.reduce((s, d) => s + d.cache, 0).toLocaleString()}</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}