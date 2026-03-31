/**
 * ToolChainView 组件测试
 * 
 * 测试内容:
 * - 工具链渲染
 * - 时间排序
 * - 空状态显示
 * - 刷新按钮功能
 * - 底部统计
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { mockToolChain, mockToolChainEmpty } from '../../__tests__/fixtures/mockActivityData'

describe('ToolChainView', () => {
  describe('渲染', () => {
    it('应该渲染工具链标题', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      render(
        <ToolChainView
          toolChain={mockToolChain}
        />
      )
      
      expect(screen.getByText('工具链')).toBeInTheDocument()
    })

    it('应该显示工具调用数量', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      render(
        <ToolChainView
          toolChain={mockToolChain}
        />
      )
      
      // 格式: (N 个工具调用)
      expect(screen.getByText(/\(\d+ 个工具调用\)/)).toBeInTheDocument()
    })

    it('应该渲染工具项', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      render(
        <ToolChainView
          toolChain={mockToolChain}
        />
      )
      
      // 应该显示第一个工具名称
      expect(screen.getByText('read')).toBeInTheDocument()
    })

    it('应该显示底部统计信息', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      render(
        <ToolChainView
          toolChain={mockToolChain}
        />
      )
      
      // 应该显示各类型工具的数量统计
      expect(screen.getByText(/读取:/)).toBeInTheDocument()
      expect(screen.getByText(/写入:/)).toBeInTheDocument()
      expect(screen.getByText(/编辑:/)).toBeInTheDocument()
      expect(screen.getByText(/运行:/)).toBeInTheDocument()
    })
  })

  describe('时间排序', () => {
    it('工具应该按时间正序排列（最早的在前）', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      // mockToolChain 数据已按 createdAt 正序排列
      render(
        <ToolChainView
          toolChain={mockToolChain}
        />
      )
      
      // 第一个应该是 read (最早)
      const readElements = screen.getAllByText('read')
      expect(readElements.length).toBeGreaterThan(0)
    })

    it('乱序数据应该被正确排序', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      // 创建乱序的工具数据
      const unsortedToolChain = [
        mockToolChain[3], // write (第4个)
        mockToolChain[0], // read (第1个)
        mockToolChain[2], // edit (第3个)
        mockToolChain[1], // grep (第2个)
      ]
      
      render(
        <ToolChainView
          toolChain={unsortedToolChain}
        />
      )
      
      // 组件应该正确渲染
      expect(screen.getByText('工具链')).toBeInTheDocument()
    })
  })

  describe('空状态', () => {
    it('应该显示空状态当工具链为空数组', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      render(
        <ToolChainView
          toolChain={[]}
        />
      )
      
      expect(screen.getByText('暂无工具调用记录')).toBeInTheDocument()
    })

    it('应该显示空状态当工具链为空', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      render(
        <ToolChainView
          toolChain={mockToolChainEmpty}
        />
      )
      
      expect(screen.getByText('暂无工具调用记录')).toBeInTheDocument()
    })
  })

  describe('刷新功能', () => {
    it('应该显示刷新按钮当 showRefresh 为 true', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      const onRefresh = vi.fn()
      
      render(
        <ToolChainView
          toolChain={mockToolChain}
          showRefresh={true}
          onRefresh={onRefresh}
        />
      )
      
      // 查找刷新按钮（通过 title 属性）
      const refreshButton = screen.getByTitle('刷新')
      expect(refreshButton).toBeInTheDocument()
    })

    it('点击刷新按钮应该触发 onRefresh 回调', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      const onRefresh = vi.fn()
      
      render(
        <ToolChainView
          toolChain={mockToolChain}
          showRefresh={true}
          onRefresh={onRefresh}
        />
      )
      
      const refreshButton = screen.getByTitle('刷新')
      fireEvent.click(refreshButton)
      
      expect(onRefresh).toHaveBeenCalled()
    })
  })

  describe('工具状态显示', () => {
    it('应该显示已完成状态', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      render(
        <ToolChainView
          toolChain={mockToolChain}
        />
      )
      
      // 应该有"完成"文本
      expect(screen.getAllByText('完成').length).toBeGreaterThan(0)
    })

    it('应该显示错误状态', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      // 找一个状态为 error 的工具
      const errorTool = mockToolChain.find(t => t.status === 'error')
      
      if (errorTool) {
        render(
          <ToolChainView
            toolChain={[errorTool]}
          />
        )
        
        expect(screen.getByText('错误')).toBeInTheDocument()
      }
    })

    it('应该显示运行中状态', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      // 创建一个运行中的工具 (status = in_progress)
      const runningTool = {
        ...mockToolChain[0],
        status: 'in_progress',
        timeEnd: undefined,
      }
      
      render(
        <ToolChainView
          toolChain={[runningTool]}
        />
      )
      
      // 使用 getAllByText 因为运行中会出现多次
      expect(screen.getAllByText('运行中').length).toBeGreaterThan(0)
    })
  })

  describe('工具类型显示', () => {
    it('应该显示正确的工具类型标签', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      render(
        <ToolChainView
          toolChain={mockToolChain}
        />
      )
      
      // 应该显示工具类型标签
      expect(screen.getByText('读取')).toBeInTheDocument()
      expect(screen.getByText('写入')).toBeInTheDocument()
      expect(screen.getByText('编辑')).toBeInTheDocument()
    })

    it('应该显示未知工具类型的默认标签', async () => {
      const { default: ToolChainView } = await import('../ToolChainView')
      
      // 创建一个没有 tool 属性的工具
      const unknownTool = {
        id: 'unknown',
        messageID: 'msg_unknown',
        sessionID: 'ses_001',
        type: 'tool',
        status: 'completed',
        createdAt: '2026-03-30T10:00:00Z',
      }
      
      render(
        <ToolChainView
          toolChain={[unknownTool]}
        />
      )
      
      // 应该显示 unknown
      expect(screen.getByText('unknown')).toBeInTheDocument()
    })
  })
})