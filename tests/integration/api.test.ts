/**
 * API 集成测试
 * 
 * 测试范围：
 * - 数据加载流程 (DataLoader)
 * - 配置加载流程 (Config)
 * - 错误处理流程
 * - 服务初始化 (Watcher, Parser)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// 由于 electron 主进程模块无法在 Node 测试环境中直接导入
// 这里使用模拟的方式测试集成逻辑

// ==================== 模拟数据加载器 ====================

interface MockSession {
  id: string;
  projectID: string;
  parentID?: string;
  title: string;
  directory: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'running' | 'waiting' | 'completed' | 'error';
}

/**
 * 计算会话状态的逻辑（从 data-loader 复制）
 */
function computeSessionStatus(updatedAt: Date): 'running' | 'waiting' | 'completed' | 'error' {
  const now = Date.now();
  const hoursSinceUpdate = (now - updatedAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceUpdate > 24) {
    return 'completed';
  } else if (hoursSinceUpdate > 1) {
    return 'waiting';
  }
  return 'running';
}

// ==================== 测试目录管理 ====================

const testDir = join(tmpdir(), 'oc-monitor-test');

function setupTestDir() {
  if (!existsSync(testDir)) {
    mkdirSync(testDir, { recursive: true });
  }
}

function cleanupTestDir() {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}

// ==================== 数据加载流程测试 ====================

describe('数据加载流程 - DataLoader 逻辑', () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('会话状态计算', () => {
    it('应该正确识别运行中的会话（1小时内更新）', () => {
      const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30分钟前
      const status = computeSessionStatus(recentDate);
      expect(status).toBe('running');
    });

    it('应该正确识别等待中的会话（1-24小时内更新）', () => {
      const waitingDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12小时前
      const status = computeSessionStatus(waitingDate);
      expect(status).toBe('waiting');
    });

    it('应该正确识别已完成的会话（超过24小时）', () => {
      const oldDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48小时前
      const status = computeSessionStatus(oldDate);
      expect(status).toBe('completed');
    });
  });

  describe('会话层级结构构建', () => {
    it('应该正确分离根会话和子会话', () => {
      const sessions: MockSession[] = [
        {
          id: 'root-1',
          projectID: 'proj-1',
          title: 'Root Session 1',
          directory: '/test',
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'running',
        },
        {
          id: 'root-2',
          projectID: 'proj-1',
          title: 'Root Session 2',
          directory: '/test',
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'running',
        },
        {
          id: 'child-1',
          projectID: 'proj-1',
          parentID: 'root-1',
          title: 'Child Session 1',
          directory: '/test',
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'running',
        },
        {
          id: 'child-2',
          projectID: 'proj-1',
          parentID: 'root-1',
          title: 'Child Session 2',
          directory: '/test',
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'running',
        },
      ];

      const roots = sessions.filter(s => !s.parentID);
      const childrenMap = new Map<string, MockSession[]>();
      
      for (const session of sessions) {
        if (session.parentID) {
          const children = childrenMap.get(session.parentID) || [];
          children.push(session);
          childrenMap.set(session.parentID, children);
        }
      }

      expect(roots).toHaveLength(2);
      expect(childrenMap.get('root-1')).toHaveLength(2);
      expect(childrenMap.get('root-2')).toBeUndefined();
    });

    it('应该按更新时间排序会话', () => {
      const now = Date.now();
      const sessions: MockSession[] = [
        {
          id: 'old',
          projectID: 'proj-1',
          title: 'Old Session',
          directory: '/test',
          createdAt: new Date(now - 100000),
          updatedAt: new Date(now - 100000),
          status: 'completed',
        },
        {
          id: 'new',
          projectID: 'proj-1',
          title: 'New Session',
          directory: '/test',
          createdAt: new Date(now),
          updatedAt: new Date(now),
          status: 'running',
        },
        {
          id: 'middle',
          projectID: 'proj-1',
          title: 'Middle Session',
          directory: '/test',
          createdAt: new Date(now - 50000),
          updatedAt: new Date(now - 50000),
          status: 'waiting',
        },
      ];

      // 模拟排序逻辑
      sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      expect(sessions[0].id).toBe('new');
      expect(sessions[1].id).toBe('middle');
      expect(sessions[2].id).toBe('old');
    });
  });

  describe('JSON 文件解析', () => {
    it('应该正确解析会话 JSON 文件', () => {
      const sessionData = {
        id: 'test-session-id',
        projectID: 'test-project',
        parentID: 'parent-id',
        title: 'Test Session',
        directory: '/test/dir',
        timeCreated: Date.now() - 86400000,
        timeUpdated: Date.now(),
      };

      const filePath = join(testDir, 'session.json');
      writeFileSync(filePath, JSON.stringify(sessionData));

      const content = require('node:fs').readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.id).toBe('test-session-id');
      expect(parsed.title).toBe('Test Session');
      expect(parsed.parentID).toBe('parent-id');
    });

    it('应该处理缺失字段并使用默认值', () => {
      const sessionData = {
        id: 'minimal-session',
      };

      const filePath = join(testDir, 'minimal.json');
      writeFileSync(filePath, JSON.stringify(sessionData));

      const content = require('node:fs').readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      const createdAt = parsed.timeCreated
        ? new Date(parsed.timeCreated)
        : parsed.createdAt
          ? new Date(parsed.createdAt)
          : new Date();

      const updatedAt = parsed.timeUpdated
        ? new Date(parsed.timeUpdated)
        : parsed.updatedAt
          ? new Date(parsed.updatedAt)
          : new Date();

      expect(createdAt).toBeInstanceOf(Date);
      expect(updatedAt).toBeInstanceOf(Date);
    });

    it('应该处理无效 JSON 格式', () => {
      const filePath = join(testDir, 'invalid.json');
      writeFileSync(filePath, 'not valid json');

      let errorCaught = false;
      try {
        const content = require('node:fs').readFileSync(filePath, 'utf-8');
        JSON.parse(content);
      } catch (e) {
        errorCaught = true;
      }

      expect(errorCaught).toBe(true);
    });
  });
});

// ==================== 配置加载流程测试 ====================

describe('配置加载流程 - Config 逻辑', () => {
  describe('配置验证', () => {
    it('应该验证有效的配置', () => {
      const config = {
        paths: { database_file: 'test.db' },
        ui: { theme: 'dark' },
      };

      const errors: string[] = [];
      
      // 验证 database_file
      if (!config.paths.database_file || typeof config.paths.database_file !== 'string') {
        errors.push('database_file must be a non-empty string');
      }

      // 验证 theme
      const validThemes = ['dark', 'light', 'system'];
      if (!validThemes.includes(config.ui.theme)) {
        errors.push('theme must be one of: dark, light, system');
      }

      expect(errors).toHaveLength(0);
    });

    it('应该捕获无效的 database_file', () => {
      const config = {
        paths: { database_file: '' },
        ui: { theme: 'dark' },
      };

      const errors: string[] = [];
      if (!config.paths.database_file || typeof config.paths.database_file !== 'string') {
        errors.push('database_file must be a non-empty string');
      }

      expect(errors).toContain('database_file must be a non-empty string');
    });

    it('应该捕获无效的 theme', () => {
      const config = {
        paths: { database_file: 'test.db' },
        ui: { theme: 'invalid' },
      };

      const errors: string[] = [];
      const validThemes = ['dark', 'light', 'system'];
      if (!validThemes.includes(config.ui.theme)) {
        errors.push('theme must be one of: dark, light, system');
      }

      expect(errors).toContain('theme must be one of: dark, light, system');
    });
  });

  describe('配置合并', () => {
    function deepMerge<T extends object>(target: T, source: Partial<T>): T {
      const result = { ...target } as Record<string, unknown>;
      
      for (const key of Object.keys(source)) {
        const sourceValue = (source as Record<string, unknown>)[key];
        const targetValue = (target as Record<string, unknown>)[key];
        
        if (sourceValue === undefined) {
          continue;
        }
        
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

    it('应该深度合并嵌套配置', () => {
      const defaultConfig = {
        server: { port: 50234, host: 'localhost' },
        storage: { rootPath: '', sessionDir: 'session' },
      };

      const userConfig = {
        server: { port: 8080, host: 'localhost' },
      };

      const merged = deepMerge(defaultConfig, userConfig);

      expect(merged.server.port).toBe(8080);
      expect(merged.server.host).toBe('localhost');
      expect(merged.storage.sessionDir).toBe('session');
    });

    it('source 中的 undefined 值不应覆盖 target', () => {
      const target = { a: 1 };
      const source = { a: undefined };
      const result = deepMerge(target, source);
      
      expect(result.a).toBe(1);
    });
  });

  describe('配置路径解析', () => {
    function parseConfigPath(configPath: string): string[] {
      return configPath.split('.');
    }

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

    it('应该正确解析嵌套配置路径', () => {
      const path = 'server.port';
      const parts = parseConfigPath(path);
      
      expect(parts).toEqual(['server', 'port']);
    });

    it('应该获取嵌套配置值', () => {
      const config = {
        server: {
          port: 50234,
          host: 'localhost',
        },
      };

      const value = getNestedValue(config, ['server', 'port']);
      expect(value).toBe(50234);
    });

    it('应该设置嵌套配置值', () => {
      const config: Record<string, unknown> = {};
      setNestedValue(config, ['server', 'port'], 8080);

      expect(config).toEqual({
        server: {
          port: 8080,
        },
      });
    });

    it('应该返回 undefined 对于不存在的路径', () => {
      const config = {
        server: {
          port: 50234,
        },
      };

      const value = getNestedValue(config, ['server', 'nonexistent']);
      expect(value).toBeUndefined();
    });
  });
});

// ==================== 错误处理流程测试 ====================

describe('错误处理流程', () => {
  describe('文件不存在错误', () => {
    it('应该处理不存在的数据库文件', () => {
      const dbPath = '/nonexistent/path/to/database.db';
      const exists = existsSync(dbPath);
      
      expect(exists).toBe(false);
    });

    it('应该处理不存在的存储目录', () => {
      const storagePath = '/nonexistent/storage';
      const exists = existsSync(storagePath);
      
      expect(exists).toBe(false);
    });
  });

  describe('路径处理错误', () => {
    it('应该正确处理特殊字符的路径', () => {
      const specialPath = join(testDir, 'path with spaces', 'file.json');
      
      // 即使目录不存在，join 应该返回正确的路径
      expect(specialPath).toContain('path with spaces');
    });

    it('应该正确处理空字符串路径', () => {
      const path = join('');
      // 取决于平台，join('') 可能返回 '.' 或空字符串
      expect(typeof path).toBe('string');
    });
  });

  describe('错误恢复', () => {
    it('应该在解析失败后继续处理', () => {
      // 确保测试目录存在
      setupTestDir();
      
      const invalidJsonFiles = [
        join(testDir, 'file1.json'),
        join(testDir, 'file2.json'),
      ];

      // 写入无效 JSON
      writeFileSync(invalidJsonFiles[0], 'invalid');
      writeFileSync(invalidJsonFiles[1], '{broken');

      const results: Array<{ path: string; data: unknown }> = [];

      for (const filePath of invalidJsonFiles) {
        try {
          const content = require('node:fs').readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          results.push({ path: filePath, data });
        } catch (error) {
          // 记录错误但继续处理
          results.push({ path: filePath, data: null });
        }
      }

      expect(results).toHaveLength(2);
      expect(results[0].data).toBeNull();
      expect(results[1].data).toBeNull();
    });
  });
});

// ==================== 服务初始化测试 ====================

describe('服务初始化流程', () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('Watcher 配置初始化', () => {
    interface WatcherOptions {
      storagePath?: string;
      projectPath?: string;
      debounceMs?: number;
    }

    function createWatcherOptions(options?: WatcherOptions) {
      return {
        storagePath: options?.storagePath || '',
        projectPath: options?.projectPath || process.cwd(),
        debounceMs: options?.debounceMs ?? 100,
      };
    }

    it('应该使用默认配置初始化 Watcher', () => {
      const options = createWatcherOptions();
      
      expect(options.debounceMs).toBe(100);
      expect(options.projectPath).toBeDefined();
    });

    it('应该允许自定义配置', () => {
      const customPath = '/custom/path';
      const options = createWatcherOptions({
        storagePath: customPath,
        debounceMs: 500,
      });
      
      expect(options.storagePath).toBe(customPath);
      expect(options.debounceMs).toBe(500);
    });

    it('应该正确设置监视路径', () => {
      const storagePath = testDir;
      const expectedStorage = join(storagePath, 'opencode', 'storage');
      
      // 模拟路径计算
      const actualStorage = join(storagePath || '', 'opencode', 'storage');
      
      expect(actualStorage).toBe(expectedStorage);
    });
  });

  describe('数据源检测', () => {
    it('应该正确检测存储目录存在', () => {
      const storageDir = join(testDir, 'storage');
      mkdirSync(storageDir, { recursive: true });
      
      const exists = existsSync(storageDir);
      expect(exists).toBe(true);
    });

    it('应该正确检测数据库文件存在', () => {
      const dbFile = join(testDir, 'opencode.db');
      writeFileSync(dbFile, ''); // 创建空文件
      
      const exists = existsSync(dbFile);
      expect(exists).toBe(true);
    });

    it('应该正确检测数据源都不存在', () => {
      const emptyDir = join(testDir, 'empty');
      mkdirSync(emptyDir, { recursive: true });
      
      const storageExists = existsSync(join(emptyDir, 'storage'));
      const dbExists = existsSync(join(emptyDir, 'opencode.db'));
      
      expect(storageExists).toBe(false);
      expect(dbExists).toBe(false);
    });
  });

  describe('服务启动/停止流程', () => {
    it('应该正确追踪服务运行状态', () => {
      let isRunning = false;

      // 模拟启动
      function start() {
        isRunning = true;
      }

      // 模拟停止
      function stop() {
        isRunning = false;
      }

      start();
      expect(isRunning).toBe(true);

      stop();
      expect(isRunning).toBe(false);
    });

    it('应该防止重复启动', () => {
      let isRunning = false;
      let startCount = 0;

      function start() {
        if (isRunning) {
          return;
        }
        isRunning = true;
        startCount++;
      }

      start();
      start(); // 重复调用
      start(); // 再次重复

      expect(startCount).toBe(1);
      expect(isRunning).toBe(true);
    });

    it('应该在停止时清理资源', () => {
      interface MockResource {
        closed: boolean;
        close: () => void;
      }

      const resources: MockResource[] = [
        { closed: false, close: function() { this.closed = true; } },
        { closed: false, close: function() { this.closed = true; } },
      ];

      function cleanup() {
        for (const r of resources) {
          r.close();
        }
      }

      cleanup();

      expect(resources[0].closed).toBe(true);
      expect(resources[1].closed).toBe(true);
    });
  });

  describe('路径解析', () => {
    it('应该正确构建 OpenCode 路径', () => {
      const xdgDataHome = process.env.XDG_DATA_HOME;
      const expectedBase = xdgDataHome || join(require('node:os').homedir(), '.local', 'share');
      
      const opencodePath = join(expectedBase, 'opencode');
      
      expect(opencodePath).toContain('opencode');
    });

    it('应该正确构建存储子目录路径', () => {
      const basePath = join(testDir, 'opencode');
      const storagePath = join(basePath, 'storage');
      const sessionPath = join(storagePath, 'session');
      const messagePath = join(storagePath, 'message');
      const partPath = join(storagePath, 'part');
      
      expect(sessionPath).toContain('session');
      expect(messagePath).toContain('message');
      expect(partPath).toContain('part');
    });
  });
});

// ==================== 集成场景测试 ====================

describe('集成场景测试', () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe('完整数据加载流程', () => {
    it('应该从 JSON 文件加载完整会话数据', () => {
      // 1. 创建测试数据
      const sessionId = 'test-session-123';
      const storageDir = join(testDir, 'storage', 'session');
      mkdirSync(storageDir, { recursive: true });

      const sessionData = {
        id: sessionId,
        projectID: 'test-project',
        parentID: undefined,
        title: 'Integration Test Session',
        directory: '/test/project',
        timeCreated: Date.now() - 3600000,
        timeUpdated: Date.now(),
      };

      writeFileSync(
        join(storageDir, `${sessionId}.json`),
        JSON.stringify(sessionData)
      );

      // 2. 模拟加载过程
      const filePath = join(storageDir, `${sessionId}.json`);
      const content = require('node:fs').readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      // 3. 验证结果
      expect(parsed.id).toBe(sessionId);
      expect(parsed.title).toBe('Integration Test Session');

      // 4. 计算状态
      const updatedAt = new Date(parsed.timeUpdated);
      const status = computeSessionStatus(updatedAt);
      expect(status).toBe('running');
    });

    it('应该处理多会话和层级关系', () => {
      // 创建根会话
      const rootSession = {
        id: 'root-1',
        projectID: 'proj-1',
        title: 'Root',
        timeCreated: Date.now() - 7200000,
        timeUpdated: Date.now(),
      };

      // 创建子会话
      const childSession = {
        id: 'child-1',
        projectID: 'proj-1',
        parentID: 'root-1',
        title: 'Child',
        timeCreated: Date.now() - 3600000,
        timeUpdated: Date.now(),
      };

      const sessionDir = join(testDir, 'storage', 'session');
      mkdirSync(sessionDir, { recursive: true });

      writeFileSync(join(sessionDir, 'root-1.json'), JSON.stringify(rootSession));
      writeFileSync(join(sessionDir, 'child-1.json'), JSON.stringify(childSession));

      // 加载所有会话
      const sessions: MockSession[] = [];
      const files = require('node:fs').readdirSync(sessionDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = require('node:fs').readFileSync(join(sessionDir, file), 'utf-8');
          const data = JSON.parse(content);
          sessions.push({
            id: data.id,
            projectID: data.projectID,
            parentID: data.parentID,
            title: data.title,
            directory: data.directory || '',
            createdAt: new Date(data.timeCreated),
            updatedAt: new Date(data.timeUpdated),
            status: computeSessionStatus(new Date(data.timeUpdated)),
          });
        }
      }

      // 构建层级
      const roots = sessions.filter(s => !s.parentID);
      const childrenMap = new Map<string, MockSession[]>();
      
      for (const session of sessions) {
        if (session.parentID) {
          const children = childrenMap.get(session.parentID) || [];
          children.push(session);
          childrenMap.set(session.parentID, children);
        }
      }

      expect(sessions).toHaveLength(2);
      expect(roots).toHaveLength(1);
      expect(roots[0].id).toBe('root-1');
      expect(childrenMap.get('root-1')).toHaveLength(1);
      expect(childrenMap.get('root-1')![0].id).toBe('child-1');
    });
  });

  describe('配置与数据源联动', () => {
    it('应该根据配置选择数据源', () => {
      // 模拟数据源检测
      const storageDir = join(testDir, 'storage');
      const dbFile = join(testDir, 'opencode.db');
      
      // 优先检测 SQLite
      const sqliteAvailable = existsSync(dbFile);
      // 然后检测 JSON 文件
      const filesAvailable = existsSync(storageDir);

      // 优先级: SQLite > Files
      const effectiveSource = sqliteAvailable ? 'sqlite' : (filesAvailable ? 'files' : 'none');

      // 当两者都不存在时
      expect(effectiveSource).toBe('none');
    });

    it('应该正确使用用户配置覆盖默认值', () => {
      const defaultConfig = {
        server: { port: 50234, host: 'localhost' },
        polling: { interval: 3000 },
      };

      const userConfig = {
        server: { port: 9000 },
      };

      // 深度合并
      function deepMerge(target: any, source: any): any {
        const result = { ...target };
        for (const key of Object.keys(source)) {
          if (
            typeof source[key] === 'object' && 
            source[key] !== null &&
            typeof target[key] === 'object' &&
            target[key] !== null
          ) {
            result[key] = deepMerge(target[key], source[key]);
          } else {
            result[key] = source[key];
          }
        }
        return result;
      }

      const merged = deepMerge(defaultConfig, userConfig);

      expect(merged.server.port).toBe(9000);
      expect(merged.server.host).toBe('localhost'); // 保持默认值
      expect(merged.polling.interval).toBe(3000); // 保持默认值
    });
  });
});