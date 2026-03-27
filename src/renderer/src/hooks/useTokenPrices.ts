import { useState, useEffect } from 'react'

export type Currency = '¥' | '$'

export interface ModelPriceConfig {
  id: string
  name: string
  currency: Currency
  cachePrice: number
  inputPrice: number
  outputPrice: number
  isPreset: boolean
}

const STORAGE_KEY = 'tokenPriceConfigs'

const PRESET_CONFIGS: ModelPriceConfig[] = [
  { id: 'minimax-m2.5', name: 'MiniMax M2.5', currency: '¥', cachePrice: 0.00021, inputPrice: 0.00210, outputPrice: 0.00840, isPreset: true },
  { id: 'gpt-4o', name: 'GPT-4o', currency: '$', cachePrice: 0.00021, inputPrice: 0.00250, outputPrice: 0.01000, isPreset: true },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', currency: '$', cachePrice: 0.00015, inputPrice: 0.00300, outputPrice: 0.01500, isPreset: true },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', currency: '$', cachePrice: 0.00000, inputPrice: 0.00035, outputPrice: 0.00140, isPreset: true },
]

export function useTokenPrices() {
  const [configs, setConfigs] = useState<ModelPriceConfig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ModelPriceConfig[]
        const merged = [...PRESET_CONFIGS]
        parsed.forEach(p => {
          if (!p.isPreset) merged.push(p)
          else {
            const idx = merged.findIndex(m => m.id === p.id)
            if (idx >= 0) merged[idx] = p
          }
        })
        setConfigs(merged)
      } else {
        setConfigs(PRESET_CONFIGS)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(PRESET_CONFIGS))
      }
    } catch {
      setConfigs(PRESET_CONFIGS)
    }
    setLoading(false)
  }, [])

  const saveConfigs = (newConfigs: ModelPriceConfig[]) => {
    setConfigs(newConfigs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs))
  }

  const updatePrice = (id: string, updates: Partial<ModelPriceConfig>) => {
    saveConfigs(configs.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const addCustomModel = (model: Omit<ModelPriceConfig, 'isPreset'>) => {
    saveConfigs([...configs, { ...model, isPreset: false }])
  }

  const deleteModel = (id: string) => {
    saveConfigs(configs.filter(c => c.id !== id || c.isPreset))
  }

  const findConfigByModelId = (modelId: string): ModelPriceConfig | undefined => {
    const normalized = modelId.replace('pro/', '').split('/').pop()?.replace('.online', '').replace('.cached-', '-') || ''
    return configs.find(c => c.id === normalized || normalized.includes(c.id))
  }

  return { configs, loading, updatePrice, addCustomModel, deleteModel, findConfigByModelId }
}