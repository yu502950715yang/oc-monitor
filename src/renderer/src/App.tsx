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
import { Sparkles } from 'lucide-react'
import MCPHealth from './components/MCPHealth'

function AppContent() {
  const { 
    sessions, 
    totalSessions,
    runningSessions,
    activities, 
    selectedSessionId, 
    activeView,
    setSelectedSession,
    setActiveView,
    getSessionNodes,
    loadMoreSessions,
    sessionStats
  } = useApp()

  // 计算所有 Skills（优先使用 sessionStats，否则从 activities 过滤）
  const allSkills = useMemo(() => {
    // 优先使用 sessionStats
    if (sessionStats?.topSkills && sessionStats.topSkills.length > 0) {
      return sessionStats.topSkills.slice(0, 5)
    }
    
    // 回退到从 activities 计算
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
  }, [activities, sessionStats])
  
  // Dashboard视图内容
  const renderDashboard = () => (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--color-bg-primary)]">
      {/* Token趋势（独占一行） */}
      <div className="flex-none" style={{ height: '320px' }}>
        <TokenTrend />
      </div>

      {/* 第三行：工具性能（独占一行） */}
      <div className="flex-1 min-h-[280px]">
        <ToolPerformance />
      </div>

      {/* 第三行：Top Skills + MCP健康度 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Skills 独立卡片 - 重新设计 */}
        <div className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--color-accent-purple)]" />
              Top Skills
            </h3>
            <span className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded-full">
              {(sessionStats?.topSkills || allSkills).length} 个技能
            </span>
          </div>
          {(sessionStats?.topSkills || allSkills).length > 0 ? (
            <div className="space-y-4">
              {(sessionStats?.topSkills || allSkills).map((skill, idx) => (
                <div key={idx} className="group relative overflow-hidden bg-[var(--color-bg-tertiary)]/50 rounded-lg p-3 hover:bg-[var(--color-bg-hover)] transition-all duration-300">
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-[var(--color-accent-yellow)]/20 text-[var(--color-accent-yellow)]' :
                        idx === 1 ? 'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]' :
                        idx === 2 ? 'bg-amber-700/20 text-amber-700' :
                        'bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className="text-sm text-[var(--color-text-primary)] font-medium">{skill.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[var(--color-accent-purple)] to-purple-500 rounded-full"
                          style={{ width: `${(skill.count / ((sessionStats?.topSkills || allSkills)[0]?.count || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-[var(--color-accent-purple)] font-semibold w-8 text-right">{skill.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-secondary)] opacity-50" />
              <div className="text-[var(--color-text-secondary)]">暂无 Skills 调用数据</div>
              <div className="text-xs text-[var(--color-text-muted)] mt-1">调用的 Skills 将在这里显示</div>
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
        totalSessions={totalSessions}
        runningSessions={runningSessions}
        selectedId={selectedSessionId || undefined}
        onSelect={setSelectedSession}
        onLoadMore={loadMoreSessions}
      />

      {/* 中间主区域 */}
      <div className="flex-1 flex flex-col h-full">
        {/* 视图切换标签 */}
        <div className="px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] flex gap-2">
          <button
            onClick={() => setActiveView('stream')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeView === 'stream'
                ? 'bg-[#58a6ff] text-white font-medium'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
            }`}
          >
            活动流
          </button>
          <button
            onClick={() => setActiveView('tree')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeView === 'tree'
                ? 'bg-[#58a6ff] text-white font-medium'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
            }`}
          >
            活动树
          </button>
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeView === 'dashboard'
                ? 'bg-[#58a6ff] text-white font-medium'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
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