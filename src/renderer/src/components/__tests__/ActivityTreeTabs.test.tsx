/**
 * ActivityTreeTabs 组件测试
 * 
 * 测试内容:
 * - Tab 切换功能
 * - localStorage 持久化
 * - 刷新按钮状态
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ActivityTreeTabs from '../ActivityTreeTabs'

describe('ActivityTreeTabs', () => {
  // 存储 mock localStorage
  let localStorageMock: Record<string, string> = {}
  
  beforeEach(() => {
    // 模拟 localStorage
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value
      },
      removeItem: (key: string) => {
        delete localStorageMock[key]
      },
      clear: () => {
        localStorageMock = {}
      }
    })
  })
  
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('渲染', () => {
    it('应该渲染活动树标题', () => {
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={() => {}}
          onRefresh={() => {}}
        />
      )
      
      expect(screen.getByText('活动树')).toBeInTheDocument()
    })

    it('应该渲染所有 4 个 Tab 选项', () => {
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={() => {}}
          onRefresh={() => {}}
        />
      )
      
      expect(screen.getByText('会话树')).toBeInTheDocument()
      expect(screen.getByText('智能体树')).toBeInTheDocument()
      expect(screen.getByText('任务树')).toBeInTheDocument()
      expect(screen.getByText('工具链')).toBeInTheDocument()
    })

    it('应该渲染刷新按钮', () => {
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={() => {}}
          onRefresh={() => {}}
        />
      )
      
      expect(screen.getByText('刷新')).toBeInTheDocument()
    })

    it('应该渲染刷新中状态', () => {
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={() => {}}
          onRefresh={() => {}}
          isRefreshing={true}
        />
      )
      
      expect(screen.getByText('刷新中...')).toBeInTheDocument()
    })
  })

  describe('Tab 切换', () => {
    it('点击 Tab 应该触发 onViewChange 回调', () => {
      const onViewChange = vi.fn()
      
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={onViewChange}
          onRefresh={() => {}}
        />
      )
      
      fireEvent.click(screen.getByText('智能体树'))
      
      expect(onViewChange).toHaveBeenCalledWith('agent')
    })

    it('点击不同 Tab 应该正确切换视图', () => {
      const onViewChange = vi.fn()
      
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={onViewChange}
          onRefresh={() => {}}
        />
      )
      
      // 切换到任务树
      fireEvent.click(screen.getByText('任务树'))
      expect(onViewChange).toHaveBeenCalledWith('task')
      
      // 切换到工具链
      fireEvent.click(screen.getByText('工具链'))
      expect(onViewChange).toHaveBeenCalledWith('tool')
      
      // 切换回会话树
      fireEvent.click(screen.getByText('会话树'))
      expect(onViewChange).toHaveBeenCalledWith('session')
    })

    it('当前激活的 Tab 应该有正确的样式', () => {
      render(
        <ActivityTreeTabs
          view="agent"
          onViewChange={() => {}}
          onRefresh={() => {}}
        />
      )
      
      // 检查智能体树按钮是否有激活样式
      const agentButton = screen.getByText('智能体树')
      expect(agentButton).toHaveClass('bg-[var(--color-primary)]')
    })
  })

  describe('localStorage 持久化', () => {
    it('Tab 切换时应该保存到 localStorage', () => {
      const onViewChange = vi.fn()
      
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={onViewChange}
          onRefresh={() => {}}
        />
      )
      
      fireEvent.click(screen.getByText('工具链'))
      
      expect(localStorageMock['activity-tree-view-mode']).toBe('tool')
    })

    it('组件挂载时应该从 localStorage 恢复视图模式', async () => {
      // 预先设置 localStorage
      localStorageMock['activity-tree-view-mode'] = 'task'
      
      const onViewChange = vi.fn()
      
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={onViewChange}
          onRefresh={() => {}}
        />
      )
      
      // 等待 useEffect 执行
      await waitFor(() => {
        expect(onViewChange).toHaveBeenCalledWith('task')
      })
    })

    it('无效的 localStorage 值应该使用默认会话视图', async () => {
      localStorageMock['activity-tree-view-mode'] = 'invalid-value'
      
      const onViewChange = vi.fn()
      
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={onViewChange}
          onRefresh={() => {}}
        />
      )
      
      // 不应该调用 onViewChange，因为使用的是默认值
      await waitFor(() => {
        expect(onViewChange).not.toHaveBeenCalled()
      })
    })
  })

  describe('刷新功能', () => {
    it('点击刷新按钮应该触发 onRefresh 回调', () => {
      const onRefresh = vi.fn()
      
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={() => {}}
          onRefresh={onRefresh}
        />
      )
      
      fireEvent.click(screen.getByText('刷新'))
      
      expect(onRefresh).toHaveBeenCalled()
    })

    it('刷新按钮禁用时不应该触发 onRefresh', () => {
      const onRefresh = vi.fn()
      
      render(
        <ActivityTreeTabs
          view="session"
          onViewChange={() => {}}
          onRefresh={onRefresh}
          isRefreshing={true}
        />
      )
      
      const refreshButton = screen.getByText('刷新中...')
      expect(refreshButton).toBeDisabled()
    })
  })
})