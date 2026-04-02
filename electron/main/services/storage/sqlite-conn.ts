/**
 * SQLite connection management using better-sqlite3
 * Replaces sql.js with native SQLite for better performance and functionality
 */

import Database from "better-sqlite3";
import { existsSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import log from "electron-log";

let db: Database.Database | null = null;
let lastDbFileMtime: number = 0;

// ==================== 路径获取函数 ====================

export function getOpenCodePath(): string {
  const storageRoot = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(storageRoot, "opencode");
}

export function getDbPath(): string {
  return join(getOpenCodePath(), "opencode.db");
}

export function getStoragePath(): string {
  return join(getOpenCodePath(), "storage");
}

export function checkStorageExists(): boolean {
  const storagePath = getStoragePath();
  const dbPath = getDbPath();
  return existsSync(storagePath) || existsSync(dbPath);
}

// ==================== SQLite 连接管理 ====================

/**
 * 初始化 SQLite 连接
 */
export function initSqlite(): boolean {
  if (db) return true;

  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    log.warn("[sqlite-conn] Database file not found:", dbPath);
    return false;
  }

  try {
    db = new Database(dbPath, {
      readonly: true,      // 只读模式，更安全
      fileMustExist: true, // 文件不存在则报错
    });

    // 设置 WAL 模式以支持并发读取
    try {
      db.pragma("journal_mode=WAL");
      db.pragma("busy_timeout=5000");
      db.pragma("synchronous=NORMAL");
    } catch (e) {
      log.warn("[sqlite-conn] Failed to enable WAL mode:", e);
    }

    // 记录初始 mtime
    const stats = statSync(dbPath);
    lastDbFileMtime = stats.mtimeMs;

    log.info("[sqlite-conn] SQLite connected:", dbPath);
    return true;
  } catch (error) {
    log.error("[sqlite-conn] Failed to initialize SQLite:", error);
    return false;
  }
}

/**
 * 关闭 SQLite 连接
 */
export function closeSqlite(): void {
  if (db) {
    db.close();
    db = null;
    log.info("[sqlite-conn] SQLite connection closed");
  }
}

/**
 * 检查并重新加载数据库（如果文件有变化）
 */
export function reloadDbIfChanged(): boolean {
  const dbPath = getDbPath();

  if (!existsSync(dbPath) || !db) {
    return false;
  }

  try {
    const stats = statSync(dbPath);
    const currentMtime = stats.mtimeMs;

    // 如果文件修改时间变了，重新连接
    if (currentMtime !== lastDbFileMtime) {
      log.info("[sqlite-conn] Database file changed, reloading...");

      // 关闭旧连接
      db.close();

      // 重新打开
      db = new Database(dbPath, {
        readonly: true,
        fileMustExist: true,
      });

      try {
        db.pragma("journal_mode=WAL");
        db.pragma("busy_timeout=5000");
        db.pragma("synchronous=NORMAL");
      } catch (e) {
        log.warn("[sqlite-conn] Failed to enable WAL mode:", e);
      }

      lastDbFileMtime = currentMtime;
      log.info("[sqlite-conn] Database reloaded successfully");
      return true;
    }

    return false;
  } catch (error) {
    log.warn("[sqlite-conn] Failed to reload database:", error);
    return false;
  }
}

// 互斥锁：防止并发请求同时刷新数据库
let isReloading = false;

/**
 * 带互斥锁的数据库刷新函数
 */
export function ensureDbFresh(): void {
  if (isReloading) return;
  if (!db) {
    initSqlite();
    return;
  }

  isReloading = true;
  try {
    reloadDbIfChanged();
  } finally {
    isReloading = false;
  }
}

/**
 * 强制重新加载数据库
 */
export function forceReloadDb(): boolean {
  const dbPath = getDbPath();

  if (!existsSync(dbPath)) {
    log.warn("[sqlite-conn] Database file not found:", dbPath);
    return false;
  }

  try {
    // 关闭旧连接
    if (db) {
      db.close();
      db = null;
    }

    // 重新初始化
    return initSqlite();
  } catch (error) {
    log.error("[sqlite-conn] Failed to force reload database:", error);
    return false;
  }
}

/**
 * 检查数据库是否已初始化
 */
export function isDbReady(): boolean {
  return db !== null;
}

// ==================== 查询执行器 ====================

/**
 * 执行查询并返回所有行
 */
export function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  if (!db) {
    log.warn("[sqlite-conn] Database not initialized");
    return [];
  }

  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
  } catch (error) {
    log.warn("[sqlite-conn] Query failed:", sql, error);
    return [];
  }
}

/**
 * 执行查询并返回单行
 */
export function queryOne<T>(sql: string, params: unknown[] = []): T | undefined {
  if (!db) {
    log.warn("[sqlite-conn] Database not initialized");
    return undefined;
  }

  try {
    const stmt = db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  } catch (error) {
    log.warn("[sqlite-conn] Query failed:", sql, error);
    return undefined;
  }
}

/**
 * 执行查询并返回游标（用于大量数据）
 */
export function* queryIter<T>(sql: string, params: unknown[] = []): Generator<T> {
  if (!db) {
    log.warn("[sqlite-conn] Database not initialized");
    return;
  }

  try {
    const stmt = db.prepare(sql);
    const rows = stmt.iterate(...params) as IterableIterator<T>;
    for (const row of rows) {
      yield row;
    }
  } catch (error) {
    log.warn("[sqlite-conn] Query iteration failed:", sql, error);
  }
}