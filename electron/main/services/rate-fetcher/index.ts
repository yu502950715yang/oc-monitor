/**
 * RateFetcher - 汇率获取服务
 * 从 frankfurter.app 获取实时汇率，支持缓存和离线回退
 */

import log from "electron-log";

// ==================== 类型定义 ====================

export interface ExchangeRates {
  base: string;        // 基准货币
  date: string;        // 日期
  rates: Record<string, number>;  // 汇率映射
}

export interface RateCache {
  data: ExchangeRates;
  fetchedAt: number;
}

// ==================== 本地回退配置 ====================

// 默认汇率配置（离线时使用，以 USD 为基准）
const DEFAULT_RATES: ExchangeRates = {
  base: "USD",
  date: new Date().toISOString().split("T")[0],
  rates: {
    // 主要货币
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.50,
    CNY: 7.24,
    AUD: 1.53,
    CAD: 1.36,
    CHF: 0.88,
    HKD: 7.82,
    SGD: 1.34,
    INR: 83.12,
    // 其他常用货币
    KRW: 1320.50,
    BRL: 4.97,
    MXN: 17.15,
    ZAR: 18.65,
    RUB: 91.50,
    TRY: 29.25,
    THB: 35.80,
    NZD: 1.64,
    SEK: 10.45,
    NOK: 10.65,
    DKK: 6.88,
    PLN: 4.02,
    CZK: 22.85,
    ILS: 3.68,
    PHP: 55.80,
    MYR: 4.72,
    IDR: 15650.00,
    VND: 24350.00,
  },
};

// 支持的货币列表
export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CNY", "AUD", "CAD", "CHF", "HKD", "SGD",
  "INR", "KRW", "BRL", "MXN", "ZAR", "RUB", "TRY", "THB", "NZD", "SEK",
  "NOK", "DKK", "PLN", "CZK", "ILS", "PHP", "MYR", "IDR", "VND",
];

// ==================== 常量 ====================

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时
const API_BASE_URL = "https://api.frankfurter.app";

// ==================== RateFetcher 实现 ====================

class RateFetcherImpl {
  private cache: RateCache | null = null;
  private isOnline: boolean = true;

  /**
   * 获取汇率数据（带缓存）
   * @param baseCurrency 基准货币，默认为 USD
   */
  async fetchRates(baseCurrency: string = "USD"): Promise<ExchangeRates> {
    // 检查缓存是否有效且基准货币相同
    if (this.isCacheValid(baseCurrency)) {
      log.info(`[RateFetcher] Using cached rates for ${baseCurrency}`);
      return this.cache!.data;
    }

    // 尝试从远程获取
    try {
      const rates = await this.fetchFromRemote(baseCurrency);
      this.cache = {
        data: rates,
        fetchedAt: Date.now(),
      };
      this.isOnline = true;
      log.info(`[RateFetcher] Fetched rates from remote API for ${baseCurrency}`);
      return rates;
    } catch (error) {
      log.warn("[RateFetcher] Failed to fetch from remote, using offline fallback:", error);
      this.isOnline = false;
      
      // 如果缓存存在（即使过期），尝试转换基准货币
      if (this.cache && this.cache.data.rates) {
        const converted = this.convertRates(this.cache.data, baseCurrency);
        if (converted) {
          log.info("[RateFetcher] Using converted cached rates as fallback");
          return converted;
        }
      }

      // 如果请求的基准货币不是 USD，需要转换默认汇率
      if (baseCurrency !== "USD") {
        const converted = this.convertRates(DEFAULT_RATES, baseCurrency);
        if (converted) {
          log.info("[RateFetcher] Using converted default rates");
          return converted;
        }
      }

      // 使用本地默认配置
      log.info("[RateFetcher] Using default rate configuration");
      return DEFAULT_RATES;
    }
  }

  /**
   * 获取特定货币对的汇率
   */
  async getRate(from: string, to: string): Promise<number | null> {
    // 如果基准货币相同
    if (from === to) {
      return 1.0;
    }

    const rates = await this.fetchRates(from);
    
    // 检查直接汇率
    if (rates.rates[to]) {
      return rates.rates[to];
    }

    // 尝试通过 USD 转换
    if (from !== "USD" && to !== "USD") {
      const fromToUSD = await this.getRate(from, "USD");
      const usdToTo = await this.getRate("USD", to);
      if (fromToUSD && usdToTo) {
        return fromToUSD * usdToTo;
      }
    }

    return null;
  }

  /**
   * 转换金额到目标货币
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    const rate = await this.getRate(fromCurrency, toCurrency);
    if (rate === null) {
      return null;
    }
    return amount * rate;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = null;
    log.info("[RateFetcher] Cache cleared");
  }

  /**
   * 强制刷新缓存
   */
  async refresh(baseCurrency: string = "USD"): Promise<ExchangeRates> {
    this.clearCache();
    return this.fetchRates(baseCurrency);
  }

  /**
   * 获取服务状态
   */
  getStatus(): { isOnline: boolean; cachedAt: number | null; base: string | null } {
    return {
      isOnline: this.isOnline,
      cachedAt: this.cache?.fetchedAt || null,
      base: this.cache?.data.base || null,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(baseCurrency: string): boolean {
    if (!this.cache) return false;
    if (this.cache.data.base !== baseCurrency) return false;
    return Date.now() - this.cache.fetchedAt < CACHE_TTL_MS;
  }

  /**
   * 从远程 API 获取汇率
   */
  private async fetchFromRemote(baseCurrency: string): Promise<ExchangeRates> {
    // frankfurter.app API
    // 最新汇率: GET /latest?from=USD
    // 历史汇率: GET /2024-01-01?from=USD
    
    const url = `${API_BASE_URL}/latest?from=${baseCurrency}&to=${SUPPORTED_CURRENCIES.join(",")}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as Record<string, unknown>;
      
      // 验证响应格式
      if (!data.base || !data.rates) {
        throw new Error("Invalid response format");
      }

      return {
        base: String(data.base),
        date: String(data.date),
        rates: data.rates as Record<string, number>,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw error;
    }
  }

  /**
   * 转换汇率基准货币
   */
  private convertRates(
    rates: ExchangeRates,
    newBase: string
  ): ExchangeRates | null {
    // 如果已经是目标基准货币
    if (rates.base === newBase) {
      return rates;
    }

    // 获取新基准货币相对于旧基准的汇率
    const baseRate = rates.rates[newBase];
    if (!baseRate && rates.base !== newBase) {
      return null;
    }

    // 转换所有汇率
    const conversionFactor = rates.base === newBase ? 1 : baseRate;
    const convertedRates: Record<string, number> = {};

    for (const [currency, rate] of Object.entries(rates.rates)) {
      if (currency !== newBase) {
        convertedRates[currency] = rate / conversionFactor;
      }
    }

    return {
      base: newBase,
      date: rates.date,
      rates: convertedRates,
    };
  }
}

// ==================== 导出单例 ====================

export const rateFetcher = new RateFetcherImpl();