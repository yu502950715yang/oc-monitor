/**
 * PriceFetcher - 模型定价获取服务
 * 从 models.dev 获取模型定价，支持缓存和离线回退
 */

import log from "electron-log";

// ==================== 类型定义 ====================

export interface ModelPricing {
  modelId: string;
  provider: string;
  name: string;
  inputPricePer1M: number;  // 每百万输入 tokens 价格
  outputPricePer1M: number; // 每百万输出 tokens 价格
  contextWindow: number;    // 上下文窗口大小
  updatedAt: Date;
}

export interface PricingCache {
  models: ModelPricing[];
  fetchedAt: number;
}

// ==================== 本地回退配置 ====================

// 常见模型的默认定价（离线时使用）
const DEFAULT_PRICING: ModelPricing[] = [
  // OpenAI
  {
    modelId: "gpt-4o",
    provider: "openai",
    name: "GPT-4o",
    inputPricePer1M: 2.5,
    outputPricePer1M: 10.0,
    contextWindow: 128000,
    updatedAt: new Date("2025-01-01"),
  },
  {
    modelId: "gpt-4o-mini",
    provider: "openai",
    name: "GPT-4o Mini",
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.6,
    contextWindow: 128000,
    updatedAt: new Date("2025-01-01"),
  },
  {
    modelId: "o1",
    provider: "openai",
    name: "OpenAI o1",
    inputPricePer1M: 15.0,
    outputPricePer1M: 60.0,
    contextWindow: 200000,
    updatedAt: new Date("2025-01-01"),
  },
  {
    modelId: "o3-mini",
    provider: "openai",
    name: "OpenAI o3-mini",
    inputPricePer1M: 1.1,
    outputPricePer1M: 4.4,
    contextWindow: 200000,
    updatedAt: new Date("2025-01-01"),
  },
  // Anthropic
  {
    modelId: "claude-sonnet-4-20250514",
    provider: "anthropic",
    name: "Claude Sonnet 4",
    inputPricePer1M: 3.0,
    outputPricePer1M: 15.0,
    contextWindow: 200000,
    updatedAt: new Date("2025-01-01"),
  },
  {
    modelId: "claude-haiku-3-20250514",
    provider: "anthropic",
    name: "Claude Haiku 3",
    inputPricePer1M: 0.8,
    outputPricePer1M: 4.0,
    contextWindow: 200000,
    updatedAt: new Date("2025-01-01"),
  },
  {
    modelId: "claude-opus-4-20250514",
    provider: "anthropic",
    name: "Claude Opus 4",
    inputPricePer1M: 15.0,
    outputPricePer1M: 75.0,
    contextWindow: 200000,
    updatedAt: new Date("2025-01-01"),
  },
  // Google
  {
    modelId: "gemini-2.5-pro",
    provider: "google",
    name: "Gemini 2.5 Pro",
    inputPricePer1M: 1.25,
    outputPricePer1M: 5.0,
    contextWindow: 1000000,
    updatedAt: new Date("2025-01-01"),
  },
  {
    modelId: "gemini-2.5-flash",
    provider: "google",
    name: "Gemini 2.5 Flash",
    inputPricePer1M: 0.075,
    outputPricePer1M: 0.3,
    contextWindow: 1000000,
    updatedAt: new Date("2025-01-01"),
  },
];

// ==================== 常量 ====================

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时
const API_BASE_URL = "https://models.dev";

// ==================== PriceFetcher 实现 ====================

class PriceFetcherImpl {
  private cache: PricingCache | null = null;
  private isOnline: boolean = true;

  /**
   * 获取定价数据（带缓存）
   */
  async fetchPricing(): Promise<ModelPricing[]> {
    // 检查缓存是否有效
    if (this.isCacheValid()) {
      log.info("[PriceFetcher] Using cached pricing data");
      return this.cache!.models;
    }

    // 尝试从远程获取
    try {
      const models = await this.fetchFromRemote();
      this.cache = {
        models,
        fetchedAt: Date.now(),
      };
      this.isOnline = true;
      log.info("[PriceFetcher] Fetched pricing from remote API");
      return models;
    } catch (error) {
      log.warn("[PriceFetcher] Failed to fetch from remote, using offline fallback:", error);
      this.isOnline = false;
      
      // 使用缓存（即使过期也使用）
      if (this.cache && this.cache.models.length > 0) {
        log.info("[PriceFetcher] Using expired cache as fallback");
        return this.cache.models;
      }

      // 使用本地默认配置
      log.info("[PriceFetcher] Using default pricing configuration");
      return DEFAULT_PRICING;
    }
  }

  /**
   * 获取特定模型的定价
   */
  async getModelPricing(modelId: string): Promise<ModelPricing | null> {
    const allPricing = await this.fetchPricing();
    return allPricing.find(m => m.modelId === modelId) || null;
  }

  /**
   * 获取特定提供商的定价
   */
  async getProviderPricing(provider: string): Promise<ModelPricing[]> {
    const allPricing = await this.fetchPricing();
    return allPricing.filter(m => m.provider === provider);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = null;
    log.info("[PriceFetcher] Cache cleared");
  }

  /**
   * 强制刷新缓存
   */
  async refresh(): Promise<ModelPricing[]> {
    this.clearCache();
    return this.fetchPricing();
  }

  /**
   * 获取服务状态
   */
  getStatus(): { isOnline: boolean; cachedAt: number | null; modelCount: number } {
    return {
      isOnline: this.isOnline,
      cachedAt: this.cache?.fetchedAt || null,
      modelCount: this.cache?.models.length || DEFAULT_PRICING.length,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return Date.now() - this.cache.fetchedAt < CACHE_TTL_MS;
  }

  /**
   * 从远程 API 获取定价
   */
  private async fetchFromRemote(): Promise<ModelPricing[]> {
    // 尝试从 models.dev API 获取定价
    // 注意：models.dev 主要提供模型信息，定价数据可能需要从其他源获取
    // 这里尝试获取可用的定价数据
    
    const endpoints = [
      `${API_BASE_URL}/api/pricing`,
      `${API_BASE_URL}/api/models`,
    ];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        
        // 尝试解析不同格式的响应
        const models = this.parsePricingResponse(data);
        if (models.length > 0) {
          return models;
        }
      } catch (error) {
        log.debug(`[PriceFetcher] Endpoint ${endpoint} failed:`, error);
      }
    }

    // 如果所有远程端点都失败，抛出错误以触发回退
    throw new Error("All remote endpoints failed");
  }

  /**
   * 解析远程 API 响应
   */
  private parsePricingResponse(data: unknown): ModelPricing[] {
    if (!data || typeof data !== "object") {
      return [];
    }

    const dataObj = data as Record<string, unknown>;

    // 尝试多种响应格式
    // 格式 1: { models: [...] }
    if (Array.isArray(dataObj.models)) {
      return this.normalizeModels(dataObj.models);
    }

    // 格式 2: { data: [...] }
    if (Array.isArray(dataObj.data)) {
      return this.normalizeModels(dataObj.data);
    }

    // 格式 3: 直接是数组
    if (Array.isArray(dataObj)) {
      return this.normalizeModels(dataObj);
    }

    return [];
  }

  /**
   * 规范化模型数据
   */
  private normalizeModels(rawModels: unknown[]): ModelPricing[] {
    const models: ModelPricing[] = [];

    for (const raw of rawModels) {
      if (!raw || typeof raw !== "object") continue;

      const obj = raw as Record<string, unknown>;
      
      // 提取模型 ID
      const modelId = String(obj.model_id || obj.modelId || obj.id || "");
      if (!modelId) continue;

      // 提取提供商
      const provider = String(obj.provider || obj.vendor || "unknown");
      
      // 提取名称
      const name = String(obj.name || obj.model_name || modelId);

      // 提取定价（支持多种格式）
      const pricing = obj.pricing || obj;
      let inputPrice = 0;
      let outputPrice = 0;

      if (pricing) {
        const pricingObj = pricing as Record<string, unknown>;
        inputPrice = Number(pricingObj.input) || Number(pricingObj.input_price) || 0;
        outputPrice = Number(pricingObj.output) || Number(pricingObj.output_price) || 0;
        
        // 如果价格单位是 per 1M tokens
        if (inputPrice > 0 && inputPrice < 0.01) inputPrice = inputPrice * 1000000;
        if (outputPrice > 0 && outputPrice < 0.01) outputPrice = outputPrice * 1000000;
      }

      // 提取上下文窗口
      const contextWindow = Number(obj.context_window || obj.contextWindow || obj.max_tokens || 0);

      // 只有有定价信息的模型才添加
      if (inputPrice > 0 || outputPrice > 0) {
        models.push({
          modelId,
          provider,
          name,
          inputPricePer1M: inputPrice || 0,
          outputPricePer1M: outputPrice || 0,
          contextWindow,
          updatedAt: new Date(),
        });
      }
    }

    return models;
  }
}

// ==================== 导出单例 ====================

export const priceFetcher = new PriceFetcherImpl();