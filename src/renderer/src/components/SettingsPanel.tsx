import { useState, memo } from 'react'
import { useMcpServices } from '@/hooks/useMcpServices'
import { useTokenPrices } from '@/hooks/useTokenPrices'
import {
  Server,
  Plug,
  RefreshCw,
  X,
  Plus,
  Trash2,
  Info,
  DollarSign,
  Monitor,
  Edit3,
  Save,
  Zap,
  FileText,
  Cpu,
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

// 菜单配置
const menuItems = [
  { id: 'mcp', label: 'MCP服务', icon: Server },
  { id: 'prices', label: 'Token价格', icon: DollarSign },
  { id: 'about', label: '关于', icon: Info },
] as const
type MenuId = typeof menuItems[number]['id']

function SettingsPanelInner({ onClose }: SettingsPanelProps) {
  const { data: services, loading: _servicesLoading, error: _servicesError, refetch: refetchServices } = useMcpServices()

  // 当前选中的菜单
  const [activeSection, setActiveSection] = useState<MenuId>('mcp')

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

  // Token 价格配置相关状态 - 必须在组件顶层调用
  const { configs, loading: priceLoading, updatePrice, addCustomModel, deleteModel } = useTokenPrices()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    name: string
    currency: '¥' | '$'
    cachePrice: string
    inputPrice: string
    outputPrice: string
    reasoningPrice: string
  } | null>(null)
  const [showAddPriceModal, setShowAddPriceModal] = useState(false)
  const [addPriceForm, setAddPriceForm] = useState({
    id: '',
    name: '',
    currency: '¥' as '¥' | '$',
    cachePrice: '',
    inputPrice: '',
    outputPrice: '',
    reasoningPrice: '',
  })

  // 开始编辑模型价格
  const handleStartEdit = (config: typeof configs[0]) => {
    setEditingId(config.id)
    setEditForm({
      name: config.name,
      currency: config.currency,
      cachePrice: config.cachePrice?.toString() ?? '0',
      inputPrice: config.inputPrice?.toString() ?? '0',
      outputPrice: config.outputPrice?.toString() ?? '0',
      reasoningPrice: config.reasoningPrice?.toString() ?? config.outputPrice?.toString() ?? '0',
    })
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

// 保存编辑
  const handleSaveEdit = () => {
    if (!editForm || !editingId) return
    updatePrice(editingId, {
      name: editForm.name,
      currency: editForm.currency,
      cachePrice: parseFloat(editForm.cachePrice) || 0,
      inputPrice: parseFloat(editForm.inputPrice) || 0,
      outputPrice: parseFloat(editForm.outputPrice) || 0,
      reasoningPrice: parseFloat(editForm.reasoningPrice) || parseFloat(editForm.outputPrice) || 0,
    })
    setEditingId(null)
    setEditForm(null)
  }

  // 打开添加价格模态框
  const handleOpenAddPriceModal = () => {
    setAddPriceForm({
      id: '',
      name: '',
      currency: '¥',
      cachePrice: '',
      inputPrice: '',
      outputPrice: '',
      reasoningPrice: '',
    })
    setShowAddPriceModal(true)
  }

  // 提交添加自定义模型
  const handleSubmitAddPrice = () => {
    if (!addPriceForm.id.trim() || !addPriceForm.name.trim()) return
    addCustomModel({
      id: addPriceForm.id.trim(),
      name: addPriceForm.name.trim(),
      currency: addPriceForm.currency,
      cachePrice: parseFloat(addPriceForm.cachePrice) || 0,
      inputPrice: parseFloat(addPriceForm.inputPrice) || 0,
      outputPrice: parseFloat(addPriceForm.outputPrice) || 0,
      reasoningPrice: parseFloat(addPriceForm.reasoningPrice) || parseFloat(addPriceForm.outputPrice) || 0,
    })
    setShowAddPriceModal(false)
  }

  // 删除自定义模型
  const handleDeleteModel = (id: string) => {
    deleteModel(id)
  }

  // MCP 相关函数
  const mcpServices = services as McpService[] | null
  const isNonDeletableService = (name: string) => {
    return nonDeletableMcpServices.includes(name)
  }

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
      await refetchServices()
      handleCloseDeleteConfirm()
    } catch (err) {
    } finally {
      setIsDeleting(false)
    }
  }

  // Token 价格配置页面组件
  function TokenPriceConfigView() {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Token 价格配置</h3>
          <button
            type="button"
            onClick={handleOpenAddPriceModal}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-primary)] text-white rounded hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3 h-3" />
            <span>添加模型</span>
          </button>
        </div>

        {priceLoading ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-4 h-4 text-[var(--color-text-secondary)] animate-spin" />
          </div>
        ) : (
          <div className="space-y-2 flex-1 overflow-y-auto">
            {configs.map((config) => (
              <div
                key={config.id}
                className="p-3 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)]"
              >
                {editingId === config.id && editForm ? (
                  // 编辑模式
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="flex-1 px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]"
                      />
                      <select
                        value={editForm.currency}
                        onChange={(e) => setEditForm({ ...editForm, currency: e.target.value as '¥' | '$' })}
                        className="px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]"
                      >
                        <option value="¥">¥</option>
                        <option value="$">$</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-[var(--color-text-secondary)]">缓存</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={editForm.cachePrice}
                          onChange={(e) => setEditForm({ ...editForm, cachePrice: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--color-text-secondary)]">输入</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={editForm.inputPrice}
                          onChange={(e) => setEditForm({ ...editForm, inputPrice: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--color-text-secondary)]">输出</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={editForm.outputPrice}
                          onChange={(e) => setEditForm({ ...editForm, outputPrice: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--color-text-secondary)]">推理</label>
                        <input
                          type="number"
                          step="0.00001"
                          value={editForm.reasoningPrice}
                          onChange={(e) => setEditForm({ ...editForm, reasoningPrice: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-success)] text-white rounded hover:opacity-90"
                      >
                        <Save className="w-3 h-3" />
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{config.name}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">{config.currency}</span>
                        {config.isPreset && (
                          <span className="text-[10px] px-1 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded">
                            预设
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          缓存: {config.cachePrice}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          输入: {config.inputPrice}
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          输出: {config.outputPrice}
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          推理: {config.reasoningPrice ?? config.outputPrice}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(config)}
                        className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                        title="编辑"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {!config.isPreset && (
                        <button
                          type="button"
                          onClick={() => handleDeleteModel(config.id)}
                          className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // About 页面组件
  function AboutView() {
    return (
      <div className="space-y-4">
        {/* 应用信息 */}
        <div className="flex flex-col items-center justify-center text-center space-y-3 pb-4 border-b border-[var(--color-border)]">
          <div className="w-16 h-16 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
            <Monitor className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">OC 监控助手</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">版本 1.0.0</p>
          </div>
          <p className="text-sm text-[var(--color-text-muted)] max-w-xs">实时监控 OpenCode 智能体活动的桌面应用</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-[750px] bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] overflow-hidden">
      {/* 顶部标题 - 占满整行 */}
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

      {/* 主体内容 - 左右布局 */}
      <div className="flex h-[500px]">
        {/* 左侧导航 */}
        <div className="w-52 border-r border-[var(--color-border)] flex flex-col p-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                  isActive
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 flex flex-col">
        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === 'mcp' && (
            <div className="space-y-3">
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
          )}

          {activeSection === 'prices' && <TokenPriceConfigView />}
          
          {activeSection === 'about' && <AboutView />}
        </div>

        {/* 统计信息 */}
        {activeSection === 'mcp' && (
          <div className="px-4 py-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
            <span>总服务: {mcpServices?.length || 0}</span>
          </div>
        )}
      </div>
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

      {/* 添加 Token 价格模态框 */}
      {showAddPriceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] w-72 p-4 shadow-xl">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-4">
              添加自定义模型
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  模型ID <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={addPriceForm.id}
                  onChange={(e) => setAddPriceForm({ ...addPriceForm, id: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="如: my-model"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">
                  显示名称 <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  type="text"
                  value={addPriceForm.name}
                  onChange={(e) => setAddPriceForm({ ...addPriceForm, name: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="如: My Model"
                />
              </div>

              <div>
                <label className="block text-xs text-[var(--color-text-secondary)] mb-1">货币</label>
                <select
                  value={addPriceForm.currency}
                  onChange={(e) => setAddPriceForm({ ...addPriceForm, currency: e.target.value as '¥' | '$' })}
                  className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="¥">¥ 人民币</option>
                  <option value="$">$ 美元</option>
                </select>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">缓存价格</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={addPriceForm.cachePrice}
                    onChange={(e) => setAddPriceForm({ ...addPriceForm, cachePrice: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">输入价格</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={addPriceForm.inputPrice}
                    onChange={(e) => setAddPriceForm({ ...addPriceForm, inputPrice: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">输出价格</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={addPriceForm.outputPrice}
                    onChange={(e) => setAddPriceForm({ ...addPriceForm, outputPrice: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-secondary)] mb-1">推理价格</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={addPriceForm.reasoningPrice}
                    onChange={(e) => setAddPriceForm({ ...addPriceForm, reasoningPrice: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowAddPriceModal(false)}
                className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSubmitAddPrice}
                className="px-3 py-1.5 text-xs bg-[var(--color-primary)] text-white rounded hover:opacity-90 transition-opacity"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
function settingsPanelAreEqual(prevProps: SettingsPanelProps, nextProps: SettingsPanelProps) {
  return prevProps.onClose === nextProps.onClose
}

export default memo(SettingsPanelInner, settingsPanelAreEqual)