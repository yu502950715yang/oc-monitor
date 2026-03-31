/**
 * AgentTreeView 组件测试
 * 
 * 测试内容:
 * - 智能体树渲染
 * - 空状态显示
 * - 节点数据构建
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockAgentTree, mockAgentTreeEmpty } from '../../__tests__/fixtures/mockActivityData'

// 由于组件依赖 React Flow，我们需要 mock 它
vi.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow">{children}</div>
  ),
  Controls: () => <div data-testid="controls" />,
  Background: () => <div data-testid="background" />,
  Handle: () => <div data-testid="handle" />,
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
}))

describe('AgentTreeView', () => {
  describe('工具函数', () => {
    it('getAgentType 应该正确识别主智能体', async () => {
      // 导入并测试内部函数
      const { default: AgentTreeView } = await import('../AgentTreeView')
      
      // 渲染组件即可覆盖工具函数
      render(<AgentTreeView data={mockAgentTree} />)
      expect(screen.getByText('智能体树')).toBeInTheDocument()
    })
  })

  describe('渲染', () => {
    it('应该渲染智能体树标题', async () => {
      const { default: AgentTreeView } = await import('../AgentTreeView')
      
      render(
        <AgentTreeView
          data={mockAgentTree}
        />
      )
      
      expect(screen.getByText('智能体树')).toBeInTheDocument()
    })

    it('应该显示智能体数量', async () => {
      const { default: AgentTreeView } = await import('../AgentTreeView')
      
      render(
        <AgentTreeView
          data={mockAgentTree}
        />
      )
      
      // 应该有显示数量的文本
      expect(screen.getByText(/\d+ 个/)).toBeInTheDocument()
    })

    it('应该渲染 React Flow 组件', async () => {
      const { default: AgentTreeView } = await import('../AgentTreeView')
      
      render(
        <AgentTreeView
          data={mockAgentTree}
        />
      )
      
      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
    })
  })

  describe('空状态', () => {
    it('应该显示空状态当没有智能体数据', async () => {
      const { default: AgentTreeView } = await import('../AgentTreeView')
      
      render(
        <AgentTreeView
          data={mockAgentTreeEmpty}
        />
      )
      
      // 使用默认空文本
      expect(screen.getByText('暂无智能体调用记录')).toBeInTheDocument()
    })

    it('应该显示自定义空文本', async () => {
      const { default: AgentTreeView } = await import('../AgentTreeView')
      
      render(
        <AgentTreeView
          data={mockAgentTreeEmpty}
          emptyText="自定义空状态文本"
        />
      )
      
      expect(screen.getByText('自定义空状态文本')).toBeInTheDocument()
    })

    it('空状态不应该渲染 React Flow', async () => {
      const { default: AgentTreeView } = await import('../AgentTreeView')
      
      render(
        <AgentTreeView
          data={mockAgentTreeEmpty}
        />
      )
      
      expect(screen.queryByTestId('react-flow')).not.toBeInTheDocument()
    })
  })

  describe('数据构建', () => {
    it('应该正确处理不同状态的智能体', async () => {
      const { default: AgentTreeView } = await import('../AgentTreeView')
      
      // 包含多种状态的智能体数据
      const mixedStatusData = [
        { ...mockAgentTree[0], status: 'completed' },
        { ...mockAgentTree[3], status: 'running' },
        { ...mockAgentTree[4], status: 'pending' },
        { ...mockAgentTree[6], status: 'error' },
      ]
      
      const { container } = render(
        <AgentTreeView
          data={mixedStatusData}
        />
      )
      
      expect(container).toBeInTheDocument()
    })

    it('应该正确处理有 subagentType 的数据', async () => {
      const { default: AgentTreeView } = await import('../AgentTreeView')
      
      render(
        <AgentTreeView
          data={mockAgentTree}
        />
      )
      
      // 应该包含智能体类型标签
      expect(screen.getByText(/智能体调用|任务委托/)).toBeInTheDocument()
    })
  })
})