import { memo } from 'react'
import { Plus, Edit3, Trash2, Save, Zap, FileText, Cpu, RefreshCw } from 'lucide-react'
import { useTokenPrices, ModelPriceConfig } from '@/hooks/useTokenPrices'

// Props 接口 - 接收必要的回调函数
interface TokenPriceConfigViewProps {
  onStartEdit: (config: ModelPriceConfig) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string) => void
  onDeleteModel: (id: string) => void
  onOpenAddModal: () => void
  editingId: string | null
  editForm: {
    name: string
    currency: '¥' | '$'
    cachePrice: string
    inputPrice: string
    outputPrice: string
  } | null
  setEditForm: React.Dispatch<React.SetStateAction<{
    name: string
    currency: '¥' | '$'
    cachePrice: string
    inputPrice: string
    outputPrice: string
  } | null>>
}

// 内部组件 - 使用 memo 避免不必要的重新渲染
function TokenPriceConfigViewInner({
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteModel,
  onOpenAddModal,
  editingId,
  editForm,
  setEditForm,
}: TokenPriceConfigViewProps) {
  const { configs, loading: priceLoading } = useTokenPrices()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Token 价格配置</h3>
        <button
          type="button"
          onClick={onOpenAddModal}
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
                  <div className="grid grid-cols-3 gap-2">
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
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onCancelEdit}
                      className="px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={() => onSaveEdit(config.id)}
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
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onStartEdit(config)}
                      className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                      title="编辑"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {!config.isPreset && (
                      <button
                        type="button"
                        onClick={() => onDeleteModel(config.id)}
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

// 使用 memo 包装，props 变化时才重新渲染
export const TokenPriceConfigView = memo(TokenPriceConfigViewInner)