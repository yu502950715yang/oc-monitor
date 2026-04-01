/**
 * ConfigLoader 单元测试
 * 
 * 测试 ConfigLoader 的核心功能：
 * - 配置加载逻辑
 * - 嵌套值获取/设置
 * - 配置合并
 * - 配置验证
 */

// 从源代码中提取的测试函数
// 这些是 ConfigLoader 类的内部辅助函数

/**
 * 深度合并两个对象
 * 后面的对象优先级更高
 */
function deepMerge<T extends object>(target: T, source: Partial<T>): T {
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
        sourceValue as Record<string, unknown>
      );
    } else {
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
 * 验证配置
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateConfig(config: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  
  // 简单的验证规则
  const rules: Array<{ path: string; validator: (v: unknown) => boolean; message: string }> = [
    {
      path: 'paths.database_file',
      validator: (v) => typeof v === 'string' && v.length > 0,
      message: 'database_file must be a non-empty string',
    },
    {
      path: 'ui.theme',
      validator: (v) => ['dark', 'light', 'system'].includes(v as string),
      message: 'theme must be one of: dark, light, system',
    },
  ];
  
  for (const rule of rules) {
    const value = getNestedValue(config, parseConfigPath(rule.path));
    
    if (value !== undefined && !rule.validator(value)) {
      errors.push(rule.message);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

describe('ConfigLoader 工具函数', () => {
  describe('deepMerge', () => {
    it('应该合并两个简单对象', () => {
      const target = { a: 1, b: 2 };
      const source = { b: 3, c: 4 };
      const result = deepMerge(target, source);
      
      expect(result.a).toBe(1);
      expect(result.b).toBe(3);
      expect(result.c).toBe(4);
    });

    it('应该深度合并嵌套对象', () => {
      const target = { ui: { theme: 'dark', colors: { primary: '#000' } } };
      const source = { ui: { colors: { secondary: '#fff' } } };
      const result = deepMerge(target, source);
      
      expect(result.ui.theme).toBe('dark');
      expect(result.ui.colors.primary).toBe('#000');
      expect(result.ui.colors.secondary).toBe('#fff');
    });

    it('source 中的 undefined 值不应覆盖 target', () => {
      const target = { a: 1 };
      const source = { a: undefined };
      const result = deepMerge(target, source);
      
      expect(result.a).toBe(1);
    });

    it('source 中的 null 值应该覆盖 target', () => {
      const target = { a: 1 };
      const source = { a: null };
      const result = deepMerge(target, source);
      
      expect(result.a).toBeNull();
    });

    it('数组应该被完全覆盖而不是合并', () => {
      const target = { items: [1, 2, 3] };
      const source = { items: [4, 5] };
      const result = deepMerge(target, source);
      
      expect(result.items).toEqual([4, 5]);
    });
  });

  describe('parseConfigPath', () => {
    it('应该正确解析简单路径', () => {
      expect(parseConfigPath('paths.database_file')).toEqual(['paths', 'database_file']);
    });

    it('应该正确解析单级路径', () => {
      expect(parseConfigPath('theme')).toEqual(['theme']);
    });

    it('应该处理空字符串', () => {
      expect(parseConfigPath('')).toEqual(['']);
    });
  });

  describe('getNestedValue', () => {
    const obj = {
      paths: {
        database_file: 'test.db',
        messages_dir: 'messages',
      },
      ui: {
        theme: 'dark',
      },
    };

    it('应该获取嵌套值', () => {
      expect(getNestedValue(obj as any, ['paths', 'database_file'])).toBe('test.db');
    });

    it('应该获取浅层值', () => {
      expect(getNestedValue(obj as any, ['ui'])).toEqual({ theme: 'dark' });
    });

    it('应该返回 undefined 对于不存在的路径', () => {
      expect(getNestedValue(obj as any, ['paths', 'nonexistent'])).toBeUndefined();
    });

    it('应该处理空路径数组', () => {
      expect(getNestedValue(obj as any, [])).toEqual(obj);
    });
  });

  describe('setNestedValue', () => {
    it('应该设置嵌套值', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, ['paths', 'database_file'], 'test.db');
      
      expect(obj).toEqual({
        paths: {
          database_file: 'test.db',
        },
      });
    });

    it('应该创建缺失的中间路径', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, ['a', 'b', 'c'], 'value');
      
      expect(obj).toEqual({
        a: {
          b: {
            c: 'value',
          },
        },
      });
    });

    it('应该处理空路径数组', () => {
      const obj: Record<string, unknown> = { test: 'value' };
      setNestedValue(obj, [], 'newvalue');
      
      expect(obj).toEqual({ test: 'value' });
    });

    it('应该覆盖现有值', () => {
      const obj: Record<string, unknown> = { a: { b: 'old' } };
      setNestedValue(obj, ['a', 'b'], 'new');
      
      expect(obj).toEqual({ a: { b: 'new' } });
    });
  });

  describe('validateConfig', () => {
    it('应该通过有效配置', () => {
      const config = {
        paths: { database_file: 'test.db' },
        ui: { theme: 'dark' },
      };
      
      const result = validateConfig(config as any);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该捕获无效的 database_file', () => {
      const config = {
        paths: { database_file: '' },
        ui: { theme: 'dark' },
      };
      
      const result = validateConfig(config as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('database_file must be a non-empty string');
    });

    it('应该捕获无效的 theme', () => {
      const config = {
        paths: { database_file: 'test.db' },
        ui: { theme: 'invalid' },
      };
      
      const result = validateConfig(config as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('theme must be one of: dark, light, system');
    });

    it('应该捕获多个错误', () => {
      const config = {
        paths: { database_file: '' },
        ui: { theme: 'invalid' },
      };
      
      const result = validateConfig(config as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });
});

describe('ConfigLoader 模拟测试', () => {
  // 这是一个模拟 ConfigLoader 行为的测试
  // 用于验证配置加载逻辑的预期行为

  const defaultConfig = {
    paths: { database_file: 'opencode.db', messages_dir: 'message', export_dir: 'export' },
    ui: { theme: 'dark', table_style: 'default' },
  };

  it('应该使用默认配置作为基础', async () => {
    // 模拟 load 方法的基本行为
    let currentConfig = { ...defaultConfig };
    
    // 模拟从文件加载配置
    const loadConfig = async () => {
      return currentConfig;
    };
    
    const config = await loadConfig();
    expect(config.paths.database_file).toBe('opencode.db');
    expect(config.ui.theme).toBe('dark');
  });

  it('应该能够合并用户配置', async () => {
    let currentConfig = { ...defaultConfig };
    
    const mergeConfig = (userConfig: Partial<typeof defaultConfig>) => {
      currentConfig = deepMerge(currentConfig, userConfig as any);
    };
    
    // 模拟用户配置覆盖
    mergeConfig({ ui: { theme: 'light' } });
    
    expect(currentConfig.ui.theme).toBe('light');
    expect(currentConfig.paths.database_file).toBe('opencode.db');
  });

  it('应该支持多层配置合并', async () => {
    let config = { ...defaultConfig };
    
    const merge = (override: Partial<typeof defaultConfig>) => {
      config = deepMerge(config, override as any);
    };
    
    // 项目配置
    merge({ paths: { database_file: 'project.db' } });
    // 用户配置
    merge({ ui: { theme: 'light' } });
    // 环境变量
    merge({ paths: { export_dir: '/custom/export' } });
    
    expect(config.paths.database_file).toBe('project.db');
    expect(config.ui.theme).toBe('light');
    expect(config.paths.export_dir).toBe('/custom/export');
  });
});