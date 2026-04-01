/**
 * DataLoader 统一加载器
 * 支持 SQLite 和 JSON 文件双数据源，自动检测可用数据源
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import log from "electron-log";
import initSqlJs from "sql.js";
import type { SessionMeta, MessageMeta, PartMeta } from "../storage/parser";

// ==================== 类型定义 ====================

export type DataSource = 'sqlite' | 'files' | 'auto';

export interface SessionData {
  id: string;
  projectID: string;
  parentID?: string;
  title: string;
  directory: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'running' | 'waiting' | 'completed' | 'error';
  messages?: MessageMeta[];
  parts?: PartMeta[];
}

export interface SessionHierarchy {
  roots: SessionData[];
  childrenMap: Map<string, SessionData[]>;
}

// ==================== 私有函数（从 parser.ts 复制必要逻辑）====================

function getOpenCodePath(): string {
  const storageRoot = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(storageRoot, "opencode");
}

function getStoragePath(): string {
  return join(getOpenCodePath(), "storage");
}

function getSessionPath(): string {
  return join(getStoragePath(), "session");
}

function getDbPath(): string {
  return join(getOpenCodePath(), "opencode.db");
}

// ==================== DataLoader 类 ====================

class DataLoaderImpl {
  private _sqliteAvailable = false;
  private _filesAvailable = false;
  private db: any = null;
  private sqlJsInitialized = false;

  // ==================== 数据源检测 ====================

  /**
   * 检测 SQLite 是否可用
   */
  get sqliteAvailable(): boolean {
    return this._sqliteAvailable;
  }

  /**
   * 检测 JSON 文件是否可用
   */
  get filesAvailable(): boolean {
    return this._filesAvailable;
  }

  /**
   * 初始化检测所有数据源
   */
  async initialize(): Promise<void> {
    // 检测 SQLite
    await this.checkSqlite();

    // 检测 JSON 文件
    this.checkFiles();

    log.info(`[DataLoader] Initialized - SQLite: ${this._sqliteAvailable}, Files: ${this._filesAvailable}`);
  }

  private async checkSqlite(): Promise<void> {
    try {
      const dbPath = getDbPath();
      if (!existsSync(dbPath)) {
        this._sqliteAvailable = false;
        return;
      }

      const SQL = await initSqlJs();
      const { readFileSync } = await import("node:fs");
      const fileBuffer = readFileSync(dbPath);
      this.db = new SQL.Database(fileBuffer);
      
      // 测试查询
      const result = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1");
      if (result.length > 0) {
        this._sqliteAvailable = true;
      }
      
      this.sqlJsInitialized = true;
    } catch (error) {
      log.warn("[DataLoader] SQLite not available:", error);
      this._sqliteAvailable = false;
    }
  }

  private checkFiles(): void {
    const storagePath = getStoragePath();
    this._filesAvailable = existsSync(storagePath);
  }

  // ==================== 核心加载方法 ====================

  /**
   * 获取当前应使用的数据源
   */
  private getEffectiveSource(forceSource?: DataSource): DataSource {
    if (forceSource && forceSource !== 'auto') {
      return forceSource;
    }
    
    // 优先级: SQLite > Files
    if (this._sqliteAvailable) {
      return 'sqlite';
    }
    if (this._filesAvailable) {
      return 'files';
    }
    
    return 'sqlite'; // 默认尝试 SQLite
  }

  /**
   * 加载层级会话结构
   */
  async loadSessionHierarchy(forceSource?: DataSource): Promise<SessionHierarchy> {
    const source = this.getEffectiveSource(forceSource);
    const sessions = await this.loadAllSessionsInternal(source);

    // 构建父子关系
    const roots: SessionData[] = [];
    const childrenMap = new Map<string, SessionData[]>();

    for (const session of sessions) {
      if (session.parentID) {
        const children = childrenMap.get(session.parentID) || [];
        children.push(session);
        childrenMap.set(session.parentID, children);
      } else {
        roots.push(session);
      }
    }

    return { roots, childrenMap };
  }

  /**
   * 加载所有会话
   */
  async loadAllSessions(limit?: number, forceSource?: DataSource): Promise<SessionData[]> {
    const source = this.getEffectiveSource(forceSource);
    const sessions = await this.loadAllSessionsInternal(source);
    
    // 按更新时间排序
    sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    
    return limit ? sessions.slice(0, limit) : sessions;
  }

  /**
   * 加载单个会话
   */
  async loadSingleSession(id: string, forceSource?: DataSource): Promise<SessionData | null> {
    const source = this.getEffectiveSource(forceSource);
    
    if (source === 'sqlite') {
      return this.loadSessionFromSqlite(id);
    } else {
      return this.loadSessionFromFiles(id);
    }
  }

  /**
   * 加载会话及其消息
   */
  async loadSessionWithMessages(id: string, forceSource?: DataSource): Promise<SessionData | null> {
    const session = await this.loadSingleSession(id, forceSource);
    if (!session) return null;

    const source = this.getEffectiveSource(forceSource);
    
    if (source === 'sqlite') {
      session.messages = this.loadMessagesFromSqlite(id);
      session.parts = this.loadPartsFromSqlite(id);
    } else {
      session.messages = await this.loadMessagesFromFiles(id);
      session.parts = await this.loadPartsFromFiles(id);
    }

    return session;
  }

  // ==================== 内部实现 ====================

  private async loadAllSessionsInternal(source: DataSource): Promise<SessionData[]> {
    if (source === 'sqlite') {
      return this.loadAllSessionsFromSqlite();
    } else {
      return this.loadAllSessionsFromFiles();
    }
  }

  // ----- SQLite 实现 -----

  private computeSessionStatus(updatedAt: Date): 'running' | 'waiting' | 'completed' | 'error' {
    const now = Date.now();
    const hoursSinceUpdate = (now - updatedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate > 24) {
      return 'completed';
    } else if (hoursSinceUpdate > 1) {
      return 'waiting';
    }
    return 'running';
  }

  private loadAllSessionsFromSqlite(): SessionData[] {
    if (!this.db) return [];

    try {
      const result = this.db.exec(`
        SELECT id, project_id, parent_id, title, directory, time_created, time_updated
        FROM session 
        ORDER BY time_updated DESC 
        LIMIT 100
      `);
      
      if (result.length === 0 || result[0].values.length === 0) {
        return [];
      }

      return result[0].values.map((row: any[]) => {
        const updatedAt = row[6] ? new Date(Number(row[6])) : new Date();
        return {
          id: String(row[0] || ''),
          projectID: String(row[1] || ''),
          parentID: row[2] ? String(row[2]) : undefined,
          title: String(row[3] || 'Untitled Session'),
          directory: String(row[4] || ''),
          createdAt: row[5] ? new Date(Number(row[5])) : new Date(),
          updatedAt,
          status: this.computeSessionStatus(updatedAt),
        };
      });
    } catch (error) {
      log.warn("[DataLoader] Failed to query sessions from SQLite:", error);
      return [];
    }
  }

  private loadSessionFromSqlite(id: string): SessionData | null {
    if (!this.db) return null;

    try {
      // 注意：这里存在 SQL 注入风险，使用简单的转义
      const safeId = id.replace(/'/g, "''");
      const result = this.db.exec(`
        SELECT id, project_id, parent_id, title, directory, time_created, time_updated
        FROM session 
        WHERE id = '${safeId}'
      `);
      
      if (result.length > 0 && result[0].values.length > 0) {
        const row = result[0].values[0];
        const updatedAt = row[6] ? new Date(Number(row[6])) : new Date();
        return {
          id: String(row[0] || ''),
          projectID: String(row[1] || ''),
          parentID: row[2] ? String(row[2]) : undefined,
          title: String(row[3] || 'Untitled Session'),
          directory: String(row[4] || ''),
          createdAt: row[5] ? new Date(Number(row[5])) : new Date(),
          updatedAt,
          status: this.computeSessionStatus(updatedAt),
        };
      }
      return null;
    } catch (error) {
      log.warn("[DataLoader] Failed to query session from SQLite:", error);
      return null;
    }
  }

  private loadMessagesFromSqlite(sessionID: string): MessageMeta[] {
    if (!this.db) return [];

    try {
      const safeId = sessionID.replace(/'/g, "''");
      const result = this.db.exec(`
        SELECT id, session_id, time_created, data
        FROM message 
        WHERE session_id = '${safeId}'
        ORDER BY time_created ASC
      `);
      
      if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values.map((row: any[]) => {
          let parsedData: any = null;
          try { 
            parsedData = row[3] ? JSON.parse(String(row[3])) : null; 
          } catch {}
          
          const role = parsedData?.role ? String(parsedData.role) : 'user';
          const agent = parsedData?.agent ? String(parsedData.agent) : undefined;
          
          return {
            id: String(row[0] || ''),
            sessionID: String(row[1] || ''),
            role,
            agent,
            createdAt: row[2] ? new Date(Number(row[2])) : new Date(),
            data: parsedData,
          };
        });
      }
      return [];
    } catch (error) {
      log.warn("[DataLoader] Failed to query messages from SQLite:", error);
      return [];
    }
  }

  private loadPartsFromSqlite(sessionID: string): PartMeta[] {
    if (!this.db) return [];

    try {
      const safeId = sessionID.replace(/'/g, "''");
      const result = this.db.exec(`
        SELECT id, message_id, session_id, time_created, data
        FROM part 
        WHERE session_id = '${safeId}'
        ORDER BY time_created ASC
      `);
      
      if (result.length > 0 && result[0].values.length > 0) {
        return result[0].values.map((row: any[]) => {
          let parsedData: any = null;
          try { 
            parsedData = row[4] ? JSON.parse(String(row[4])) : null; 
          } catch {}
          
          const type = parsedData?.type ? String(parsedData.type) : undefined;
          const tool = parsedData?.tool ? String(parsedData.tool) : undefined;
          const state = parsedData?.state ? parsedData.state : undefined;
          
          return {
            id: String(row[0] || ''),
            messageID: String(row[1] || ''),
            sessionID: String(row[2] || ''),
            type,
            tool,
            state,
            createdAt: row[3] ? new Date(Number(row[3])) : new Date(),
            data: parsedData,
          };
        });
      }
      return [];
    } catch (error) {
      log.warn("[DataLoader] Failed to query parts from SQLite:", error);
      return [];
    }
  }

  // ----- JSON 文件实现 -----

  private async loadAllSessionsFromFiles(): Promise<SessionData[]> {
    const { readdirSync, readFileSync } = await import("node:fs");
    const sessionPath = getSessionPath();
    
    if (!existsSync(sessionPath)) {
      return [];
    }

    const sessions: SessionData[] = [];

    try {
      const entries = readdirSync(sessionPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          const filePath = join(sessionPath, entry.name);
          try {
            const content = readFileSync(filePath, "utf-8");
            const data = JSON.parse(content);
            
            const createdAt = data.timeCreated
              ? new Date(data.timeCreated)
              : data.createdAt
                ? new Date(data.createdAt)
                : new Date();

            const updatedAt = data.timeUpdated
              ? new Date(data.timeUpdated)
              : data.updatedAt
                ? new Date(data.updatedAt)
                : new Date();

            sessions.push({
              id: data.id,
              projectID: data.projectID || entry.name.replace(".json", ""),
              parentID: data.parentID,
              title: data.title || "Untitled Session",
              directory: data.directory || "",
              createdAt,
              updatedAt,
              status: this.computeSessionStatus(updatedAt),
            });
          } catch (e) {
            log.warn(`[DataLoader] Failed to parse session file: ${filePath}`, e);
          }
        }
      }
    } catch (error) {
      log.warn("[DataLoader] Failed to read session files:", error);
    }

    return sessions;
  }

  private async loadSessionFromFiles(id: string): Promise<SessionData | null> {
    const { readFileSync } = await import("node:fs");
    const sessionPath = getSessionPath();
    const filePath = join(sessionPath, `${id}.json`);
    
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);
      
      const createdAt = data.timeCreated
        ? new Date(data.timeCreated)
        : data.createdAt
          ? new Date(data.createdAt)
          : new Date();

      const updatedAt = data.timeUpdated
        ? new Date(data.timeUpdated)
        : data.updatedAt
          ? new Date(data.updatedAt)
          : new Date();

      return {
        id: data.id,
        projectID: data.projectID || id,
        parentID: data.parentID,
        title: data.title || "Untitled Session",
        directory: data.directory || "",
        createdAt,
        updatedAt,
        status: this.computeSessionStatus(updatedAt),
      };
    } catch (error) {
      log.warn(`[DataLoader] Failed to parse session file: ${filePath}`, error);
      return null;
    }
  }

  private async loadMessagesFromFiles(sessionID: string): Promise<MessageMeta[]> {
    const { readdirSync, readFileSync } = await import("node:fs");
    const messagePath = join(getStoragePath(), "message", sessionID);
    
    if (!existsSync(messagePath)) {
      return [];
    }

    try {
      const entries = readdirSync(messagePath, { withFileTypes: true });
      const messages: MessageMeta[] = [];

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          const filePath = join(messagePath, entry.name);
          try {
            const content = readFileSync(filePath, "utf-8");
            const data = JSON.parse(content);
            
            messages.push({
              id: data.id,
              sessionID: data.sessionID || sessionID,
              role: data.role || "user",
              agent: data.agent,
              createdAt: data.timeCreated
                ? new Date(data.timeCreated)
                : data.createdAt
                  ? new Date(data.createdAt)
                  : new Date(),
              data: data.data,
            });
          } catch (e) {
            log.warn(`[DataLoader] Failed to parse message file: ${filePath}`, e);
          }
        }
      }

      return messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      log.warn("[DataLoader] Failed to read message files:", error);
      return [];
    }
  }

  private async loadPartsFromFiles(sessionID: string): Promise<PartMeta[]> {
    const { readdirSync, readFileSync } = await import("node:fs");
    const partPath = join(getStoragePath(), "part", sessionID);
    
    if (!existsSync(partPath)) {
      return [];
    }

    try {
      const entries = readdirSync(partPath, { withFileTypes: true });
      const parts: PartMeta[] = [];

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          const filePath = join(partPath, entry.name);
          try {
            const content = readFileSync(filePath, "utf-8");
            const data = JSON.parse(content);
            
            parts.push({
              id: data.id,
              messageID: data.messageID || entry.name.replace(".json", ""),
              sessionID: data.sessionID || sessionID,
              type: data.type,
              tool: data.tool,
              state: data.state,
              createdAt: data.timeCreated
                ? new Date(data.timeCreated)
                : data.createdAt
                  ? new Date(data.createdAt)
                  : new Date(),
              data: data.data,
            });
          } catch (e) {
            log.warn(`[DataLoader] Failed to parse part file: ${filePath}`, e);
          }
        }
      }

      return parts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      log.warn("[DataLoader] Failed to read part files:", error);
      return [];
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 重新初始化（用于检测数据源变化）
   */
  async reinitialize(): Promise<void> {
    this._sqliteAvailable = false;
    this._filesAvailable = false;
    this.db = null;
    this.sqlJsInitialized = false;
    await this.initialize();
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.sqlJsInitialized = false;
    this._sqliteAvailable = false;
  }
}

// ==================== 导出单例 ====================

export const dataLoader = new DataLoaderImpl();