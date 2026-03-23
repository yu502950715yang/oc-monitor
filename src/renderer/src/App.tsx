import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/Layout'
import SessionList from './components/SessionList'
import ActivityStream from './components/ActivityStream'
import PlanProgress from './components/PlanProgress'
import ActivityTree from './components/ActivityTree'

function AppContent() {
  const { 
    sessions, 
    activities, 
    plans, 
    selectedSessionId, 
    activeView,
    setSelectedSession,
    setActiveView,
    getSessionNodes
  } = useApp()

  return (
    <Layout>
      {/* 左侧会话列表 */}
      <SessionList
        sessions={sessions}
        selectedId={selectedSessionId || undefined}
        onSelect={setSelectedSession}
      />

      {/* 中间主区域 - 活动流或活动树 */}
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
        </div>

        {/* 内容区域 */}
        {activeView === 'stream' ? (
          <ActivityStream activities={activities} />
        ) : (
          <ActivityTree sessions={getSessionNodes()} />
        )}
      </div>

      {/* 右侧计划进度 */}
      <PlanProgress plans={plans} />
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