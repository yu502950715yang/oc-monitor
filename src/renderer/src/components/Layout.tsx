import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col overflow-hidden">
      {/* 头部导航 */}
      <header className="bg-[#161b22] border-b border-[#30363d] px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#58a6ff]">OC 监控助手</h1>
            <span className="text-xs px-2 py-0.5 bg-[#21262d] rounded text-[#8b949e]">T9</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#8b949e]">实时监控</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse"></span>
              <span className="text-sm text-[#8b949e]">已连接</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>

      {/* 底部状态栏 */}
      <footer className="bg-[#161b22] border-t border-[#30363d] px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-[#8b949e]">
          <div className="flex items-center gap-4">
            <span>状态: 就绪</span>
            <span>|</span>
            <span>API: http://localhost:50234</span>
          </div>
          <span>OpenCode 存储路径: ~/.local/share/opencode/storage/</span>
        </div>
      </footer>
    </div>
  )
}