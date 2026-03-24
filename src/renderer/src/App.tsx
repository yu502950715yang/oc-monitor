import { useMemo } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/Layout'
import SessionList from './components/SessionList'
import ActivityStream from './components/ActivityStream'
import StatsPanel from './components/StatsPanel'
import ActivityTree from './components/ActivityTree'
import ToolPerformance from './components/ToolPerformance'
import ErrorLog from './components/ErrorLog'
import TokenTrend from './components/TokenTrend'
import MCPHealth from './components/MCPHealth'

function AppContent() {
  const { 
    sessions, 
    activities, 
    selectedSessionId, 
    activeView,
    setSelectedSession,
    setActiveView,
    getSessionNodes
  } = useApp()

  // 计算所有 Skills（仅从工具调用中获取）
  const allSkills = useMemo(() => {
    const skillCountMap: Record<string, number> = {}
    
    // 工具调用中的 skill（toolName === 'skill'）
    const toolSkillActivities = activities.filter(a => a.toolName === 'skill')
    toolSkillActivities.forEach(call => {
      const skillName = (call as any).skillName || 'unknown'
      skillCountMap[skillName] = (skillCountMap[skillName] || 0) + 1
    })
    
    return Object.entries(skillCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
  }, [activities])
  
  // 计算总Token
  const totalTokens = useMemo(() => {
    const messageActivities = activities.filter(a => a.type === 'message' && a.tokens)
    return messageActivities.reduce((sum, m) => sum + (m.tokens?.total || 0), 0)
  }, [activities])

  // Dashboard视图内容
  const renderDashboard = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0d1117]">
      {/* 第一行：快速统计（全宽）- 重新设计 */}
      <div className="bg-gradient-to-br from-[#161b22] to-[#1c2128] rounded-xl border border-[#30363d] p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-[#c9d1d9]">快速统计</h3>
          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
            <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse"></span>
            实时更新
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {/* 总Token */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#fbbf24]/20 to-[#fbbf24]/5 rounded-xl p-4 border border-[#fbbf24]/20 hover:border-[#fbbf24]/40 transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#fbbf24]/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="text-3xl font-bold text-[#fbbf24] mb-1">
                {totalTokens > 0 ? totalTokens.toLocaleString() : '-'}
              </div>
              <div className="text-sm text-[#8b949e] flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11a1 1 0 11-2 0 1 1 0 012 0zm0-3a1 1 0 01-2 0V7a1 1 0 112 0v4z"/></svg>
                总Token
              </div>
            </div>
          </div>
          {/* 工具调用 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#3b82f6]/20 to-[#3b82f6]/5 rounded-xl p-4 border border-[#3b82f6]/20 hover:border-[#3b82f6]/40 transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#3b82f6]/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="text-3xl font-bold text-[#3b82f6] mb-1">
                {activities.filter(a => a.type === 'tool').length}
              </div>
              <div className="text-sm text-[#8b949e] flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                工具调用
              </div>
            </div>
          </div>
          {/* Skills调用 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#a855f7]/20 to-[#a855f7]/5 rounded-xl p-4 border border-[#a855f7]/20 hover:border-[#a855f7]/40 transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#a855f7]/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="text-3xl font-bold text-[#a855f7] mb-1">
                {activities.filter(a => a.toolName === 'skill').length}
              </div>
              <div className="text-sm text-[#8b949e] flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                Skills调用
              </div>
            </div>
          </div>
          {/* MCP调用 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#06b6d4]/20 to-[#06b6d4]/5 rounded-xl p-4 border border-[#06b6d4]/20 hover:border-[#06b6d4]/40 transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#06b6d4]/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="text-3xl font-bold text-[#06b6d4] mb-1">
                {activities.filter(a => a.toolName?.startsWith('context7_') || a.toolName?.startsWith('websearch_')).length}
              </div>
              <div className="text-sm text-[#8b949e] flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                MCP调用
              </div>
            </div>
          </div>
          {/* 错误 */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#f85149]/20 to-[#f85149]/5 rounded-xl p-4 border border-[#f85149]/20 hover:border-[#f85149]/40 transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#f85149]/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative">
              <div className="text-3xl font-bold text-[#f85149] mb-1">
                {activities.filter(a => a.status === 'error' || a.error).length}
              </div>
              <div className="text-sm text-[#8b949e] flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                错误
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 第二行：Token趋势 + 工具性能 */}
      <div className="grid grid-cols-2 gap-6 items-stretch">
        <div className="min-h-[480px]"><TokenTrend /></div>
        <div className="min-h-[480px]"><ToolPerformance /></div>
      </div>

      {/* 第三行：Top Skills + MCP健康度 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Skills 独立卡片 - 重新设计 */}
        <div className="bg-gradient-to-br from-[#161b22] to-[#1c2128] rounded-xl border border-[#30363d] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#c9d1d9] flex items-center gap-2">
              <span className="text-xl">🔮</span>
              Top Skills
            </h3>
            <span className="text-xs text-[#8b949e] bg-[#21262d] px-2 py-1 rounded-full">
              {allSkills.length} 个技能
            </span>
          </div>
          {allSkills.length > 0 ? (
            <div className="space-y-4">
              {allSkills.map((skill, idx) => (
                <div key={idx} className="group relative overflow-hidden bg-[#21262d]/50 rounded-lg p-3 hover:bg-[#21262d] transition-all duration-300">
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-[#fbbf24]/20 text-[#fbbf24]' :
                        idx === 1 ? 'bg-[#94a3b8]/20 text-[#94a3b8]' :
                        idx === 2 ? 'bg-[#cd7c2e]/20 text-[#cd7c2e]' :
                        'bg-[#a855f7]/20 text-[#a855f7]'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className="text-sm text-[#c9d1d9] font-medium">{skill.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-[#30363d] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#a855f7] to-[#8b5cf6] rounded-full"
                          style={{ width: `${(skill.count / (allSkills[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-[#a855f7] font-semibold w-8 text-right">{skill.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-4xl mb-3 opacity-50">🔮</div>
              <div className="text-[#8b949e]">暂无 Skills 调用数据</div>
              <div className="text-xs text-[#6e7681] mt-1">调用的 Skills 将在这里显示</div>
            </div>
          )}
        </div>
        <MCPHealth />
      </div>

      {/* 第四行：错误日志（宽度占满） */}
      <ErrorLog />
    </div>
  )

  return (
    <Layout>
      {/* 左侧会话列表 */}
      <SessionList
        sessions={sessions}
        selectedId={selectedSessionId || undefined}
        onSelect={setSelectedSession}
      />

      {/* 中间主区域 */}
      <div className="flex-1 flex flex-col h-full">
        {/* 视图切换标签 */}
        <div className="px-4 py-2 bg-[#161b22] border-b border-[#30363d] flex gap-2">
          <button
            onClick={() => setActiveView('stream')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeView === 'stream'
                ? 'bg-[#58a6ff] text-white'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
            }`}
          >
            活动流
          </button>
          <button
            onClick={() => setActiveView('tree')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeView === 'tree'
                ? 'bg-[#58a6ff] text-white'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
            }`}
          >
            活动树
          </button>
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeView === 'dashboard'
                ? 'bg-[#58a6ff] text-white'
                : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
            }`}
          >
            监控看板
          </button>
        </div>

        {/* 内容区域 */}
        {activeView === 'stream' ? (
          <ActivityStream activities={activities} />
        ) : activeView === 'tree' ? (
          <ActivityTree sessions={getSessionNodes()} />
        ) : (
          renderDashboard()
        )}
      </div>

      {/* 右侧监控统计 */}
      <StatsPanel />
    </Layout>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App