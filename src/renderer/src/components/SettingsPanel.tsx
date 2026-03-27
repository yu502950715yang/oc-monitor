import { useState } from 'react'
import { useMcpServices } from '@/hooks/useMcpServices'
import {
  Server,
  Plug,
  RefreshCw,
  AlertCircle,
  X,
  Plus,
  Trash2,
} from 'lucide-react'

// Props 接口
interface SettingsPanelProps {
  onClose: () => void
}

// MCP 服务类型定义
interface McpService {
  name: string
  displayName: string
  type: string
  enabled: boolean
}

// 不可删除的 MCP 服务列表（内置 + 用户配置）
const nonDeletableMcpServices = ['websearch', 'context7', 'grep_app', 'playwright']

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { data: services, loading: servicesLoading, error: servicesError, refetch: refetchServices } = useMcpServices()

  // 添加 MCP 服务相关状态
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    displayName: '',
    type: 'remote' as 'remote' | 'local',
  })
  const [addFormError, setAddFormError] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // 删除确认状态
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; name: string; displayName: string }>({
    show: false,
    name: '',
    displayName: '',
  })
  const [isDeleting, setIsDeleting] = useState(false)

  // 打开添加模态框
  const handleOpenAddModal = () => {
    setAddForm({ name: '', displayName: '', type: 'remote' })
    setAddFormError('')
    setShowAddModal(true)
  }

  // 关闭添加模态框
  const handleCloseAddModal = () => {
    setShowAddModal(false)
    setAddForm({ name: '', displayName: '', type: 'remote' })
    setAddFormError('')
  }

  // 提交添加 MCP 服务
  const handleSubmitAdd = async () => {
    // 验证 name 必填
    if (!addForm.name.trim()) {
      setAddFormError('名称为必填项')
      return
    }

    setIsAdding(true)
    setAddFormError('')

    try {
      await window.electronAPI.api.saveMcpService({
        name: addForm.name.trim(),
        displayName: addForm.displayName.trim(),
        type: addForm.type,
      })
      
      // 成功后刷新列表并关闭模态框
      await refetchServices()
      handleCloseAddModal()
    } catch (err) {
      console.error('[SettingsPanel] 添加 MCP 服务失败:', err)
      setAddFormError('添加失败，请重试')
    } finally {
      setIsAdding(false)
    }
  }

  // 打开删除确认对话框
  const handleOpenDeleteConfirm = (name: string, displayName: string) => {
    setDeleteConfirm({ show: true, name, displayName: displayName || name })
  }

  // 关闭删除确认对话框
  const handleCloseDeleteConfirm = () => {
    setDeleteConfirm({ show: false, name: '', displayName: '' })
  }

  // 确认删除 MCP 服务
  const handleConfirmDelete = async () => {
    if (!deleteConfirm.name) return

    setIsDeleting(true)

    try {
      await window.electronAPI.api.deleteMcpService(deleteConfirm.name)
      console.log('[SettingsPanel] 删除 MCP 服务成功:', deleteConfirm.name)
      
      // 成功后刷新列表并关闭对话框
      await refetchServices()
      handleCloseDeleteConfirm()
    } catch (err) {
      console.error('[SettingsPanel] 删除 MCP 服务失败:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const mcpServices = services as McpService[] | null

  // 判断是否为不可删除的 MCP
  const isNonDeletableService = (name: string) => {
    return nonDeletableMcpServices.includes(name)
  }

  // 加载状态
  if (servicesLoading) {
    return (
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] flex flex-col max-h-[80vh]">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="font-medium text-[var(--color-text-primary)]">设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <RefreshCw className="w-6 h-6 text-[var(--color-text-secondary)] animate-spin" />
        </div>
      </div>
    )
  }

  // 错误状态
  if (servicesError) {
    return (
      <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] flex flex-col max-h-[80vh]">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="font-medium text-[var(--color-text-primary)]">设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <AlertCircle className="w-8 h-8 text-[var(--color-error)] mb-2" />
          <p className="text-sm text-[var(--color-text-secondary)] text-center mb-3">
            加载失败: {servicesError.message}
          </p>
          <button
            type="button"
            onClick={() => refetchServices()}
            className="px-3 py-1.5 text-xs bg-[var(--color-primary)] text-white rounded hover:opacity-90 transition-opacity"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] flex flex-col max-h-[80vh]">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="font-medium text-[var(--color-text-primary)]">MCP 服务</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 添加 MCP 服务按钮 */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span>添加 MCP</span>
        </button>

        {!mcpServices || mcpServices.length === 0 ? (
          <div className="text-center text-[var(--color-text-secondary)] text-sm py-8">
            暂无 MCP 服务
          </div>
        ) : (
          mcpServices.map((service) => {
            const isNonDeletable = isNonDeletableService(service.name)

            return (
              <div
                key={service.name}
                className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)] relative group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-md bg-[var(--color-primary)]/10">
                      <Server className="w-4 h-4 text-[var(--color-primary)]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {service.displayName || service.name}
                      </h3>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">
                        {service.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* 删除按钮 */}
                    {!isNonDeletable && (
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteConfirm(service.name, service.displayName || service.name)}
                        className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] opacity-0 group-hover:opacity-100 transition-all"
                        title="删除 MCP 服务"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <Plug className="w-3 h-3 text-[var(--color-text-secondary)]" />
                    <span className="text-[var(--color-text-secondary)]">{service.type}</span>
                  </div>
                  <span className={service.enabled ? 'text-[var(--color-success)]' : 'text-[var(--color-text-secondary)]'}>
                    {service.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 统计信息 */}
      <div className="px-4 py-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
        <span>总服务: {mcpServices?.length || 0}</span>
      </div>

      {/* 添加 MCP 服务模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] w-72 p-4 shadow-xl">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">
              添加 MCP 服务
            </h3>

            <div className="space-y-3">
              {/* 名称 */}
              <div>
                <label htmlFor="addName" className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  名称 <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  id="addName"
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="输入名称"
                />
              </div>

              {/* 显示名称 */}
              <div>
                <label htmlFor="addDisplayName" className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  显示名称
                </label>
                <input
                  id="addDisplayName"
                  type="text"
                  value={addForm.displayName}
                  onChange={(e) => setAddForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="输入显示名称"
                />
              </div>

              {/* 类型 */}
              <div>
                <label htmlFor="addType" className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  类型
                </label>
                <select
                  id="addType"
                  value={addForm.type}
                  onChange={(e) => setAddForm(prev => ({ ...prev, type: e.target.value as 'remote' | 'local' }))}
                  className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="remote">Remote</option>
                  <option value="local">Local</option>
                </select>
              </div>

              {/* 错误提示 */}
              {addFormError && (
                <p className="text-xs text-[var(--color-error)]">{addFormError}</p>
              )}
            </div>

            {/* 按钮 */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={handleCloseAddModal}
                className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                disabled={isAdding}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmitAdd}
                className="px-3 py-1.5 text-xs bg-[var(--color-primary)] text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={isAdding}
              >
                {isAdding ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] w-72 p-4 shadow-xl">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
              删除 MCP 服务
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">
              确定要删除 <span className="text-[var(--color-text-primary)] font-medium">{deleteConfirm.displayName}</span> 吗？此操作不可撤销。
            </p>

            {/* 按钮 */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseDeleteConfirm}
                className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 text-xs bg-[var(--color-error)] text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}