import { ReactNode, useState, useEffect } from 'react'
import { Moon, Sun, Wifi } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

type Theme = 'dark' | 'light'

export default function Layout({ children }: LayoutProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as Theme
      if (saved) return saved
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] flex flex-col overflow-hidden">
      {/* 头部导航 */}
      <header className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[var(--color-primary)]">OC 监控助手</h1>
            <span className="text-xs px-2 py-0.5 bg-[var(--color-bg-tertiary)] rounded text-[var(--color-text-secondary)]">T9</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--color-text-secondary)]">实时监控</span>
            
            {/* 主题切换按钮 */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
              aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[var(--color-text-secondary)]" />
              ) : (
                <Moon className="w-4 h-4 text-[var(--color-text-secondary)]" />
              )}
            </button>
            
            <div className="flex items-center gap-2">
              <Wifi className="w-3 h-3 text-[var(--color-success)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">已连接</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>

      {/* 底部状态栏 */}
      <footer className="bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
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