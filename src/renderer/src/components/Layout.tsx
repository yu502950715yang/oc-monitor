import { ReactNode, useState, useEffect, useCallback } from 'react'
import { Moon, Sun, Wifi, Settings } from 'lucide-react'
import SettingsPanel from './SettingsPanel'

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

  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const handleCloseSettings = useCallback(() => setShowSettings(false), []);
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
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--color-text-secondary)]">实时监控</span>
            
            {/* 主题切换按钮 */}
            <button
              type="button"
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

            {/* 设置按钮 */}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-md bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-elevated)] transition-colors"
              aria-label="打开设置"
            >
              <Settings className="w-4 h-4 text-[var(--color-text-secondary)]" />
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

      {/* 设置弹框 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()}>
            <SettingsPanel onClose={handleCloseSettings} />
          </div>
        </div>
      )}

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