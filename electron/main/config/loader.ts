/**
 * OC 监控助手 - 配置加载器
 * 
 * 实现多级配置加载系统：
 * - 默认级: schema.ts 中的默认值 (最低优先级)
 * - 项目级: ./config/ocmonitor.json
 * - 用户级: ~/.config/ocmonitor/config.json (最高优先级)
 * - 环境变量: OCMONITOR_* 前缀 (最高优先级)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ConfigSchema,
  defaultConfig,
  ConfigSource,
  ConfigLoadResult,
  ConfigChangeListener,
  MergeOptions,
  validationRules,
  ValidationResult,
} from './schema.js';

// 环境变量前缀
const ENV_PREFIX = 'OCMONITOR_';

/**
 * 深度合并两个对象
 * 后面的对象优先级更高
 */
function deepMerge<T extends object>(target: T, source: Partial<T>, _options?: MergeOptions): T {
  const result = { ...target } as Record<string, unknown>;
  
  for (const key of Object.keys(source)) {
    const sourceValue = (source as Record<string, unknown>)[key];
    const targetValue = (target as Record<string, unknown>)[key];
    
    if (sourceValue === undefined) {
      continue;
    }
    
    if (sourceValue === null) {
      result[key] = sourceValue;
      continue;
    }
    
    // 深度合并对象
    if (
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue) &&
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
        _options
      );
    }
    // 数组处理
    else if (Array.isArray(sourceValue) && _options?.overwriteArrays) {
      result[key] = sourceValue;
    }
    // 普通值覆盖
    else {
      result[key] = sourceValue;
    }
  }
  
  return result as T;
}

/**
 * 将带点号的路径转换为嵌套对象键
 * 例如: 'paths.database_file' -> ['paths', 'database_file']
 */
function parseConfigPath(configPath: string): string[] {
  return configPath.split('.');
}

/**
 * 获取嵌套对象中的值
 */
function getNestedValue(obj: Record<string, unknown>, pathParts: string[]): unknown {
  let current: unknown = obj;
  
  for (const part of pathParts) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  
  return current;
}

/**
 * 设置嵌套对象的值
 */
function setNestedValue(obj: Record<string, unknown>, pathParts: string[], value: unknown): void {
  if (pathParts.length === 0) {
    return;
  }
  
  let current = obj;
  
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    
    if (!(part in current)) {
      current[part] = {};
    }
    
    if (current[part] === null || typeof current[part] !== 'object') {
      current[part] = {};
    }
    
    current = current[part] as Record<string, unknown>;
  }
  
  current[pathParts[pathParts.length - 1]] = value;
}

/**
 * 将配置对象转换为平面的环境变量键值映射
 * 例如: { paths: { database_file: 'test.db' } } -> { OCMONITOR_PATHS_DATABASE_FILE: 'test.db' }
 */
function configToEnvVars(config: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(config)) {
    const envKey = prefix ? `${prefix}_${key}`.toUpperCase() : key.toUpperCase();
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, configToEnvVars(value as Record<string, unknown>, envKey));
    } else if (value !== undefined) {
      result[`${ENV_PREFIX}${envKey}`] = String(value);
    }
  }
  
  return result;
}

/**
 * 从环境变量加载配置覆盖
 */
function loadFromEnvVars(): Partial<ConfigSchema> {
  const result: Record<string, unknown> = {};
  
  // 获取所有以 OCMONITOR_ 开头的环境变量
  for (const [envKey, envValue] of Object.entries(process.env)) {
    if (!envKey.startsWith(ENV_PREFIX) || envValue === undefined) {
      continue;
    }
    
    // 去掉前缀并转换为路径格式
    // OCMONITOR_PATHS_DATABASE_FILE -> paths.database_file
    const configPath = envKey
      .slice(ENV_PREFIX.length)
      .toLowerCase()
      .replace(/_/g, '.');
    
    const pathParts = parseConfigPath(configPath);
    setNestedValue(result, pathParts, envValue);
  }
  
  return result as Partial<ConfigSchema>;
}

/**
 * 验证配置
 */
function validateConfig(config: Partial<ConfigSchema>): ValidationResult {
  const errors: string[] = [];
  
  for (const rule of validationRules) {
    const value = getNestedValue(config as Record<string, unknown>, parseConfigPath(rule.path));
    
    if (value !== undefined && !rule.validator(value)) {
      errors.push(rule.message);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 配置加载器类
 */
export class ConfigLoader {
  private currentConfig: ConfigSchema;
  private listeners: Set<ConfigChangeListener> = new Set();
  private configDir: string;
  private userConfigPath: string;
  private projectConfigPath: string;
  
  constructor() {
    // 初始化路径
    this.configDir = path.join(os.homedir(), '.config', 'ocmonitor');
    this.userConfigPath = path.join(this.configDir, 'config.json');
    
    // 项目级配置路径（相对于运行目录）
    this.projectConfigPath = path.join(process.cwd(), 'config', 'ocmonitor.json');
    
    // 初始加载
    this.currentConfig = { ...defaultConfig };
  }
  
  /**
   * 加载并合并配置
   * 优先级（从低到高）: 默认 -> 项目 -> 用户 -> 环境变量
   */
  async load(): Promise<ConfigSchema> {
    const results: ConfigLoadResult[] = [];
    
    // 1. 从默认配置开始
    let mergedConfig: ConfigSchema = { ...defaultConfig };
    results.push({
      config: mergedConfig,
      source: 'default',
      success: true,
    });
    
    // 2. 加载项目级配置
    const projectConfig = await this.loadConfigFile(this.projectConfigPath);
    if (projectConfig) {
      mergedConfig = deepMerge(mergedConfig, projectConfig) as ConfigSchema;
      results.push({
        config: projectConfig,
        source: 'project',
        success: true,
      });
    }
    
    // 3. 加载用户级配置
    const userConfig = await this.loadConfigFile(this.userConfigPath);
    if (userConfig) {
      mergedConfig = deepMerge(mergedConfig, userConfig) as ConfigSchema;
      results.push({
        config: userConfig,
        source: 'user',
        success: true,
      });
    }
    
    // 4. 应用环境变量覆盖
    const envConfig = loadFromEnvVars();
    if (Object.keys(envConfig).length > 0) {
      mergedConfig = deepMerge(mergedConfig, envConfig) as ConfigSchema;
      results.push({
        config: envConfig,
        source: 'user',
        success: true,
      });
    }
    
    // 5. 验证配置
    const validation = validateConfig(mergedConfig);
    if (!validation.valid) {
      console.warn('[ConfigLoader] 配置验证失败:', validation.errors);
    }
    
    // 6. 计算配置源信息
    const sources = results.filter(r => r.success).map(r => r.source);
    const primarySource = sources[sources.length - 1] || 'default';
    
    console.log(`[ConfigLoader] 配置加载完成，使用来源: ${primarySource}`);
    console.log(`[ConfigLoader] 用户配置路径: ${this.userConfigPath}`);
    console.log(`[ConfigLoader] 项目配置路径: ${this.projectConfigPath}`);
    
    // 更新当前配置
    const oldConfig = this.currentConfig;
    this.currentConfig = mergedConfig;
    
    // 触发变更监听器
    this.notifyListeners(mergedConfig, oldConfig);
    
    return mergedConfig as ConfigSchema;
  }
  
  /**
   * 重新加载配置
   */
  async reload(): Promise<ConfigSchema> {
    return this.load();
  }
  
  /**
   * 获取特定配置项
   */
  get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] {
    return this.currentConfig[key];
  }
  
  /**
   * 获取完整配置
   */
  getAll(): ConfigSchema {
    return this.currentConfig;
  }
  
  /**
   * 注册配置变更监听器
   */
  onChange(callback: ConfigChangeListener): () => void {
    this.listeners.add(callback);
    
    // 返回取消监听函数
    return () => {
      this.listeners.delete(callback);
    };
  }
  
  /**
   * 触发配置变更通知
   */
  private notifyListeners(newConfig: ConfigSchema, oldConfig: ConfigSchema): void {
    for (const listener of this.listeners) {
      try {
        listener(newConfig, oldConfig);
      } catch (error) {
        console.error('[ConfigLoader] 配置变更监听器执行失败:', error);
      }
    }
  }
  
  /**
   * 从文件加载 JSON 配置
   */
  private async loadConfigFile(filePath: string): Promise<Partial<ConfigSchema> | null> {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content) as Partial<ConfigSchema>;
      
      console.log(`[ConfigLoader] 已加载配置文件: ${filePath}`);
      
      return config;
    } catch (error) {
      console.error(`[ConfigLoader] 加载配置文件失败: ${filePath}`, error);
      return null;
    }
  }
  
  /**
   * 获取配置来源信息
   */
  getConfigSources(): { user: string | null; project: string | null } {
    return {
      user: fs.existsSync(this.userConfigPath) ? this.userConfigPath : null,
      project: fs.existsSync(this.projectConfigPath) ? this.projectConfigPath : null,
    };
  }
  
  /**
   * 检查配置是否存在
   */
  hasUserConfig(): boolean {
    return fs.existsSync(this.userConfigPath);
  }
  
  hasProjectConfig(): boolean {
    return fs.existsSync(this.projectConfigPath);
  }
  
  /**
   * 获取用户配置目录
   */
  getUserConfigDir(): string {
    return this.configDir;
  }
}

// 创建全局配置管理器单例
export const configManager = new ConfigLoader();

// 导出配置加载结果类型
export type { ConfigLoadResult, ConfigChangeListener, MergeOptions };

// 导出验证函数
export { validateConfig };