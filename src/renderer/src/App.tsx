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

  // Dashboard视图内容
  const renderDashboard = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0d1117]">
      {/* 第一行：统计面板 + 工具性能 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#161b22] rounded-lg border border-[#30363d] p-4">
          <h3 className="text-sm font-medium text-[#c9d1d9] mb-4">快速统计</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#21262d] p-3 rounded text-center">
              <div className="text-2xl text-[#a371f7]">
                {activities.filter(a => a.type === 'tool').length}
              </div>
              <div className="text-xs text-[#8b949e]">工具调用</div>
            </div>
            <div className="bg-[#21262d] p-3 rounded text-center">
              <div className="text-2xl text-[#f85149]">
                {activities.filter(a => a.status === 'error' || a.error).length}
              </div>
              <div className="text-xs text-[#8b949e]">错误</div>
            </div>
            <div className="bg-[#21262d] p-3 rounded text-center">
              <div className="text-2xl text-[#ff7b72]">
                {activities.filter(a => a.toolName?.startsWith('context7_') || a.toolName?.startsWith('websearch_')).length}
              </div>
              <div className="text-xs text-[#8b949e]">MCP调用</div>
            </div>
          </div>
        </div>
        <ToolPerformance />
      </div>

      {/* 第二行：Token趋势 + MCP健康度 */}
      <div className="grid grid-cols-2 gap-4">
        <TokenTrend />
        <MCPHealth />
      </div>

      {/* 第三行：错误日志（宽度占满） */}
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