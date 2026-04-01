/**
 * OC 监控助手 - 配置类型定义
 * 
 * 定义完整的配置 Schema 接口，用于配置加载和验证
 * 参考 ocmonitor-share 的多级配置设计:
 * - 用户级配置: ~/.config/ocmonitor/config.json (最高优先级)
 * - 项目级配置: ./config/ocmonitor.json
 * - 默认配置: 默认值 (最低优先级)
 */

// ====================
// 路径配置
// ====================

/** 路径配置项 */
export interface PathsConfig {
  /** 数据库文件路径 */
  database_file: string;
  /** 消息目录路径 */
  messages_dir: string;
  /** 导出目录路径 */
  export_dir: string;
}

// ====================
// UI 配置
// ====================

/** 表格样式 */
export type TableStyle = 'default' | 'compact' | 'comfortable';

/** 主题类型 */
export type Theme = 'dark' | 'light' | 'system';

/** 进度条样式 */
export type ProgressBarStyle = 'detailed' | 'minimal' | 'none';

/** UI 颜色配置 */
export interface UiColors {
  /** 主色 */
  primary: string;
  /** 成功色 */
  success: string;
  /** 警告色 */
  warning: string;
  /** 错误色 */
  error: string;
  /** 信息色 */
  info: string;
}

/** UI 配置项 */
export interface UiConfig {
  /** 表格样式 */
  table_style: TableStyle;
  /** 主题 */
  theme: Theme;
  /** 进度条样式 */
  progress_bars: ProgressBarStyle;
  /** 颜色配置 */
  colors: UiColors;
  /** 实时刷新间隔（毫秒）*/
  live_refresh_interval: number;
}

// ====================
// 模型配置
// ====================

/** 模型配置项 */
export interface ModelsConfig {
  /** 配置文件路径 */
  config_file: string;
  /** 是否启用远程回退 */
  remote_fallback: boolean;
  /** 远程 URL */
  remote_url: string;
  /** 远程超时时间（秒）*/
  remote_timeout_seconds: number;
  /** 远程缓存有效期（小时）*/
  remote_cache_ttl_hours: number;
}

// ====================
// 货币配置
// ====================

/** 远程汇率配置 */
export interface RemoteRatesConfig {
  /** 是否启用远程汇率 */
  enabled: boolean;
  /** API URL */
  api_url: string;
  /** 缓存时间（小时）*/
  cache_hours: number;
}

/** 货币显示格式 */
export type CurrencyDisplayFormat = 'symbol' | 'code' | 'both';

/** 货币配置项 */
export interface CurrencyConfig {
  /** 货币代码 */
  code: string;
  /** 货币符号 */
  symbol: string;
  /** 汇率 */
  rate: number;
  /** 显示格式 */
  display_format: CurrencyDisplayFormat;
  /** 远程汇率配置 */
  remote_rates: RemoteRatesConfig;
}

// ====================
// 指标配置
// ====================

/** 指标服务配置项 */
export interface MetricsConfig {
  /** 端口 */
  port: number;
  /** 主机地址 */
  host: string;
}

// ====================
// 分析配置
// ====================

/** 时间范围 */
export type TimeFrame = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** 分析配置项 */
export interface AnalyticsConfig {
  /** 默认时间范围 */
  default_timeframe: TimeFrame;
  /** 最近会话数量限制 */
  recent_sessions_limit: number;
}

// ====================
// 主配置接口
// ====================

/** 完整配置 Schema */
export interface ConfigSchema {
  /** 路径配置 */
  paths: PathsConfig;
  /** UI 配置 */
  ui: UiConfig;
  /** 模型配置 */
  models: ModelsConfig;
  /** 货币配置 */
  currency: CurrencyConfig;
  /** 指标配置 */
  metrics: MetricsConfig;
  /** 分析配置 */
  analytics: AnalyticsConfig;
}

// ====================
// 默认配置值
// ====================

/** 默认路径配置 */
export const defaultPaths: PathsConfig = {
  database_file: 'opencode.db',
  messages_dir: 'message',
  export_dir: 'export',
};

/** 默认 UI 配置 */
export const defaultUi: UiConfig = {
  table_style: 'default',
  theme: 'dark',
  progress_bars: 'detailed',
  colors: {
    primary: '#58a6ff',
    success: '#3fb950',
    warning: '#d29922',
    error: '#f85149',
    info: '#58a6ff',
  },
  live_refresh_interval: 3000,
};

/** 默认模型配置 */
export const defaultModels: ModelsConfig = {
  config_file: 'models.json',
  remote_fallback: true,
  remote_url: 'https://api.example.com/models',
  remote_timeout_seconds: 30,
  remote_cache_ttl_hours: 24,
};

/** 默认货币配置 */
export const defaultCurrency: CurrencyConfig = {
  code: 'CNY',
  symbol: '¥',
  rate: 1,
  display_format: 'symbol',
  remote_rates: {
    enabled: false,
    api_url: 'https://api.exchangerate.host',
    cache_hours: 12,
  },
};

/** 默认指标配置 */
export const defaultMetrics: MetricsConfig = {
  port: 9090,
  host: 'localhost',
};

/** 默认分析配置 */
export const defaultAnalytics: AnalyticsConfig = {
  default_timeframe: 'week',
  recent_sessions_limit: 10,
};

/** 完整默认配置 */
export const defaultConfig: ConfigSchema = {
  paths: defaultPaths,
  ui: defaultUi,
  models: defaultModels,
  currency: defaultCurrency,
  metrics: defaultMetrics,
  analytics: defaultAnalytics,
};

// ====================
// 配置验证工具类型
// ====================

/** 配置验证结果 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
}

/** 配置验证器函数类型 */
export type ConfigValidator = (config: Partial<ConfigSchema>) => ValidationResult;

/** 配置合并选项 */
export interface MergeOptions {
  /** 是否深度合并 */
  deep?: boolean;
  /** 是否覆盖数组 */
  overwriteArrays?: boolean;
}

/** 配置源类型（优先级从低到高）*/
export type ConfigSource = 'default' | 'project' | 'user';

/** 配置加载结果 */
export interface ConfigLoadResult {
  /** 加载的配置 (可能是部分配置) */
  config: Partial<ConfigSchema>;
  /** 配置来源 */
  source: ConfigSource;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/** 配置变更监听器 */
export type ConfigChangeListener = (newConfig: ConfigSchema, oldConfig: ConfigSchema) => void;

/** 配置验证规则 */
export interface ValidationRule {
  /** 字段路径 */
  path: string;
  /** 验证函数 */
  validator: (value: unknown) => boolean;
  /** 错误消息 */
  message: string;
}

// ====================
// 配置验证规则定义
// ====================

/** 预定义验证规则 */
export const validationRules: ValidationRule[] = [
  // paths 验证
  {
    path: 'paths.database_file',
    validator: (v) => typeof v === 'string' && v.length > 0,
    message: 'database_file must be a non-empty string',
  },
  {
    path: 'paths.messages_dir',
    validator: (v) => typeof v === 'string' && v.length > 0,
    message: 'messages_dir must be a non-empty string',
  },
  {
    path: 'paths.export_dir',
    validator: (v) => typeof v === 'string' && v.length > 0,
    message: 'export_dir must be a non-empty string',
  },

  // ui 验证
  {
    path: 'ui.table_style',
    validator: (v) => ['default', 'compact', 'comfortable'].includes(v as string),
    message: 'table_style must be one of: default, compact, comfortable',
  },
  {
    path: 'ui.theme',
    validator: (v) => ['dark', 'light', 'system'].includes(v as string),
    message: 'theme must be one of: dark, light, system',
  },
  {
    path: 'ui.progress_bars',
    validator: (v) => ['detailed', 'minimal', 'none'].includes(v as string),
    message: 'progress_bars must be one of: detailed, minimal, none',
  },
  {
    path: 'ui.live_refresh_interval',
    validator: (v) => typeof v === 'number' && v >= 1000 && v <= 60000,
    message: 'live_refresh_interval must be a number between 1000 and 60000',
  },

  // models 验证
  {
    path: 'models.remote_fallback',
    validator: (v) => typeof v === 'boolean',
    message: 'remote_fallback must be a boolean',
  },
  {
    path: 'models.remote_timeout_seconds',
    validator: (v) => typeof v === 'number' && v > 0 && v <= 300,
    message: 'remote_timeout_seconds must be a number between 1 and 300',
  },
  {
    path: 'models.remote_cache_ttl_hours',
    validator: (v) => typeof v === 'number' && v > 0 && v <= 168,
    message: 'remote_cache_ttl_hours must be a number between 1 and 168',
  },

  // currency 验证
  {
    path: 'currency.code',
    validator: (v) => typeof v === 'string' && /^[A-Z]{3}$/.test(v),
    message: 'currency.code must be a 3-letter ISO currency code',
  },
  {
    path: 'currency.rate',
    validator: (v) => typeof v === 'number' && v > 0,
    message: 'currency.rate must be a positive number',
  },
  {
    path: 'currency.display_format',
    validator: (v) => ['symbol', 'code', 'both'].includes(v as string),
    message: 'display_format must be one of: symbol, code, both',
  },

  // metrics 验证
  {
    path: 'metrics.port',
    validator: (v) => typeof v === 'number' && v >= 1 && v <= 65535,
    message: 'metrics.port must be a number between 1 and 65535',
  },
  {
    path: 'metrics.host',
    validator: (v) => typeof v === 'string' && v.length > 0,
    message: 'metrics.host must be a non-empty string',
  },

  // analytics 验证
  {
    path: 'analytics.default_timeframe',
    validator: (v) => ['day', 'week', 'month', 'quarter', 'year'].includes(v as string),
    message: 'default_timeframe must be one of: day, week, month, quarter, year',
  },
  {
    path: 'analytics.recent_sessions_limit',
    validator: (v) => typeof v === 'number' && v >= 1 && v <= 100,
    message: 'recent_sessions_limit must be a number between 1 and 100',
  },
];