/**
 * TaskFlowView 组件测试
 * 
 * 测试内容:
 * - 任务流渲染
 * - 分组显示（已完成/未完成）
 * - 空状态显示
 * - 刷新按钮功能
 * - 进度条显示
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { mockTaskFlow, mockTaskFlowEmpty, mockTaskFlowPartial } from '../../__tests__/fixtures/mockActivityData'

describe('TaskFlowView', () => {
  describe('渲染', () => {
    it('应该渲染任务流标题', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
        />
      )
      
      expect(screen.getByText('任务流')).toBeInTheDocument()
    })

    it('应该显示任务完成进度', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
        />
      )
      
      // 格式: (completed/total)
      expect(screen.getByText(/\(\d+\/\d+\)/)).toBeInTheDocument()
    })

    it('应该显示底部汇总信息', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
        />
      )
      
      // 应该显示总计和百分比
      expect(screen.getByText(/总计:/)).toBeInTheDocument()
      expect(screen.getByText(/\d+%/)).toBeInTheDocument()
    })

    it('应该显示进度条', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      const { container } = render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
        />
      )
      
      // 进度条应该存在且有正确的宽度样式
      const progressBar = container.querySelector('.bg-\\[var\\(--color-success\\)\\]')
      expect(progressBar).toBeInTheDocument()
    })
  })

  describe('分组显示', () => {
    it('应该显示已完成任务分组', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
        />
      )
      
      // 已完成任务分组
      expect(screen.getByText(/已完成 \(\d+\)/)).toBeInTheDocument()
    })

    it('应该显示未完成任务分组', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
        />
      )
      
      // 未完成任务分组
      expect(screen.getByText(/未完成 \(\d+\)/)).toBeInTheDocument()
    })

    it('应该正确显示已完成任务内容', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
        />
      )
      
      // 显示第一个已完成的任务
      expect(screen.getByText('设计数据库架构')).toBeInTheDocument()
    })

    it('应该正确显示未完成任务内容', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
        />
      )
      
      // 显示第一个未完成的任务
      expect(screen.getByText('添加前端登录页面')).toBeInTheDocument()
    })

    it('部分完成时应该同时显示两组', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlowPartial}
        />
      )
      
      expect(screen.getByText(/已完成/)).toBeInTheDocument()
      expect(screen.getByText(/未完成/)).toBeInTheDocument()
    })
  })

  describe('空状态', () => {
    it('应该显示空状态当任务总数为 0', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      // 使用 total=0 来触发空状态
      const emptyTaskFlow = {
        total: 0,
        completed: 0,
        percentage: 0,
        items: [],
      }
      
      render(
        <TaskFlowView
          taskFlow={emptyTaskFlow}
        />
      )
      
      expect(screen.getByText('暂无任务数据')).toBeInTheDocument()
    })

    it('应该显示空状态当没有 items', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlowEmpty}
        />
      )
      
      expect(screen.getByText('暂无任务数据')).toBeInTheDocument()
    })
  })

  describe('刷新功能', () => {
    it('应该显示刷新按钮当 showRefresh 为 true', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      const onRefresh = vi.fn()
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
          showRefresh={true}
          onRefresh={onRefresh}
        />
      )
      
      // 查找刷新按钮（通过 title 属性）
      const refreshButton = screen.getByTitle('刷新')
      expect(refreshButton).toBeInTheDocument()
    })

    it('点击刷新按钮应该触发 onRefresh 回调', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      const onRefresh = vi.fn()
      
      render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
          showRefresh={true}
          onRefresh={onRefresh}
        />
      )
      
      const refreshButton = screen.getByTitle('刷新')
      fireEvent.click(refreshButton)
      
      expect(onRefresh).toHaveBeenCalled()
    })
  })

  describe('进度计算', () => {
    it('应该正确计算完成百分比', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      // mockTaskFlow: 5/8 = 62.5%
      render(
        <TaskFlowView
          taskFlow={mockTaskFlow}
        />
      )
      
      // 使用正则表达式匹配
      expect(screen.getByText(/62\.5%/)).toBeInTheDocument()
    })

    it('应该正确处理部分完成的情况', async () => {
      const { default: TaskFlowView } = await import('../TaskFlowView')
      
      // mockTaskFlowPartial: 2/5 = 40%
      render(
        <TaskFlowView
          taskFlow={mockTaskFlowPartial}
        />
      )
      
      // 使用正则表达式匹配
      expect(screen.getByText(/40%/)).toBeInTheDocument()
    })
  })
})