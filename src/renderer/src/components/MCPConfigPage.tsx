import { useState, useEffect } from 'react'
import { useConfig, AppConfig } from '@/hooks/useConfig'
import { 
  Settings, 
  Palette, 
  RefreshCw,
  AlertCircle,
  Check,
  X,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'

// MCP 映射项类型
export interface McpMapping {
  toolKey: string           // 工具唯一标识（用于 displayNames 和 colors 的 key）
  toolPrefix: string        // 工具前缀
  displayName: string       // 中文名称
  color: string             // 颜色值
  enabled: boolean          // 是否启用
}

// 预设颜色选项
const colorPresets = [
  '#58a6ff', // 蓝色
  '#238636', // 绿色
  '#f78166', // 橙色
  '#a371f7', // 紫色
  '#f85149', // 红色
  '#d29922', // 黄色
  '#3fb950', // 亮绿色
  '#79c0ff', // 浅蓝色
]

// 解析 MCP 配置为映射列表
function parseMcpMappings(config: AppConfig | null): McpMapping[] {
  if (!config?.mcp) return []

  const { toolPrefixes, displayNames, colors } = config.mcp
  const allKeys = new Set([
    ...Object.keys(displayNames || {}),
    ...Object.keys(colors || {}),
  ])

  const mappings: McpMapping[] = []
  
  allKeys.forEach(key => {
    // 从 key 中提取前缀
    let prefix = ''
    for (const p of toolPrefixes || []) {
      if (key.startsWith(p)) {
        prefix = p
        break
      }
    }

    mappings.push({
      toolKey: key,
      toolPrefix: prefix,
      displayName: displayNames?.[key] || key,
      color: colors?.[key] || '#58a6ff',
      enabled: true, // 默认启用
    })
  })

  return mappings.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export default function MCPConfigPage() {
  const { data: config, loading, error, refetch } = useConfig()
  const [mappings, setMappings] = useState<McpMapping[]>([])
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ displayName: string; color: string }>({
    displayName: '',
    color: '',
  })
  const [showColorPicker, setShowColorPicker] = useState(false)

  // 初始化映射列表
  useEffect(() => {
    setMappings(parseMcpMappings(config))
  }, [config])

  // 开始编辑
  const handleStartEdit = (mapping: McpMapping) => {
    setEditingKey(mapping.toolKey)
    setEditForm({
      displayName: mapping.displayName,
      color: mapping.color,
    })
    setShowColorPicker(false)
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingKey(null)
    setEditForm({ displayName: '', color: '' })
    setShowColorPicker(false)
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingKey) return

    setMappings(prev => 
      prev.map(m => 
        m.toolKey === editingKey 
          ? { ...m, displayName: editForm.displayName, color: editForm.color }
          : m
      )
    )
    setEditingKey(null)
    setEditForm({ displayName: '', color: '' })
    setShowColorPicker(false)
    
    // TODO: 调用后端 API 保存配置
  }

  // 切换启用状态
  const handleToggleEnabled = (toolKey: string) => {
    setMappings(prev =>
      prev.map(m =>
        m.toolKey === toolKey ? { ...m, enabled: !m.enabled } : m
      )
    )
    
    // TODO: 调用后端 API 保存启用状态
  }

  // 选择颜色
  const handleSelectColor = (color: string) => {
    setEditForm(prev => ({ ...prev, color }))
    setShowColorPicker(false)
  }

  if (loading) {
    return (
      <div className="w-80 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col h-full">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="font-medium text-[var(--color-text-primary)]">MCP 映射配置</h2>
          <span className="text-xs text-[var(--color-text-secondary)]">T9</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-[var(--color-text-secondary)] animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-80 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col h-full">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="font-medium text-[var(--color-text-primary)]">MCP 映射配置</h2>
          <span className="text-xs text-[var(--color-text-secondary)]">T9</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <AlertCircle className="w-8 h-8 text-[var(--color-error)] mb-2" />
          <p className="text-sm text-[var(--color-text-secondary)] text-center">
            加载失败: {error.message}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 px-3 py-1.5 text-xs bg-[var(--color-primary)] text-white rounded hover:opacity-90 transition-opacity"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <h2 className="font-medium text-[var(--color-text-primary)]">MCP 映射配置</h2>
        </div>
        <span className="text-xs text-[var(--color-text-secondary)]">T9</span>
      </div>

      {/* 映射列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mappings.length === 0 ? (
          <div className="text-center text-[var(--color-text-secondary)] text-sm py-8">
            暂无 MCP 映射配置
          </div>
        ) : (
          mappings.map((mapping) => (
            <div
              key={mapping.toolKey}
              className={`p-4 bg-[var(--color-bg-tertiary)] rounded-lg border transition-opacity ${
                mapping.enabled 
                  ? 'border-[var(--color-border)]' 
                  : 'border-[var(--color-border)] opacity-60'
              }`}
            >
              {editingKey === mapping.toolKey ? (
                /* 编辑模式 */
                <div className="space-y-3">
                  {/* 工具前缀（只读） */}
                  <div className="text-xs text-[var(--color-text-secondary)]">
                    <span className="font-mono">{mapping.toolPrefix}</span>
                    <span className="ml-1">{mapping.toolKey.replace(mapping.toolPrefix, '')}</span>
                  </div>

                  {/* 中文名称输入 */}
                  <div>
                    <label htmlFor="displayName" className="block text-xs text-[var(--color-text-secondary)] mb-1">
                      中文名称
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary)]"
                      placeholder="输入中文名称"
                    />
                  </div>

                  {/* 颜色选择 */}
                  <div>
                    <label htmlFor="colorPicker" className="block text-xs text-[var(--color-text-secondary)] mb-1">
                      颜色
                    </label>
                    <div className="relative">
                      <button
                        id="colorPicker"
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="flex items-center gap-2 px-2 py-1.5 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded hover:border-[var(--color-primary)] transition-colors"
                      >
                        <div
                          className="w-4 h-4 rounded border border-[var(--color-border)]"
                          style={{ backgroundColor: editForm.color }}
                        />
                        <span className="text-[var(--color-text-primary)] font-mono text-xs">
                          {editForm.color}
                        </span>
                      </button>
                      
                      {/* 颜色预设面板 */}
                      {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg shadow-lg z-10">
                          <div className="grid grid-cols-4 gap-1.5">
                            {colorPresets.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handleSelectColor(color)}
                                className="w-6 h-6 rounded border-2 transition-transform hover:scale-110"
                                style={{ 
                                  backgroundColor: color,
                                  borderColor: editForm.color === color ? '#fff' : 'transparent'
                                }}
                                title={color}
                              />
                            ))}
                          </div>
                          {/* 自定义颜色输入 */}
                          <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                            <input
                              type="text"
                              value={editForm.color}
                              onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                              className="w-full px-2 py-1 text-xs bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] font-mono"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <X className="w-3 h-3" />
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-success)] text-white rounded hover:opacity-90 transition-opacity"
                    >
                      <Check className="w-3 h-3" />
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                /* 显示模式 */
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: mapping.color }}
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {mapping.displayName}
                        </h3>
                        <p className="text-xs text-[var(--color-text-secondary)] font-mono truncate">
                          {mapping.toolKey}
                        </p>
                      </div>
                    </div>
                    
                    {/* 启用状态切换 */}
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(mapping.toolKey)}
                      className="flex-shrink-0"
                      title={mapping.enabled ? '已启用，点击禁用' : '已禁用，点击启用'}
                    >
                      {mapping.enabled ? (
                        <ToggleRight className="w-5 h-5 text-[var(--color-success)]" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
                      )}
                    </button>
                  </div>

                  {/* 前缀和编辑按钮 */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Palette className="w-3 h-3 text-[var(--color-text-secondary)]" />
                      <span className="text-[var(--color-text-secondary)] font-mono">
                        {mapping.toolPrefix || '(无前缀)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(mapping)}
                      className="text-[var(--color-primary)] hover:opacity-80 transition-opacity"
                    >
                      编辑
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* 统计信息 */}
      <div className="px-4 py-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-center justify-between">
          <span>总映射: {mappings.length}</span>
          <span className="text-[var(--color-success)]">
            已启用: {mappings.filter(m => m.enabled).length}
          </span>
        </div>
      </div>
    </div>
  )
}