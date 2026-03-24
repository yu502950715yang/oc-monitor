import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import log from "electron-log";
import initSqlJs, { Database } from "sql.js";

export type SessionStatus = 'running' | 'waiting' | 'completed' | 'error';

// 根据 updatedAt 计算会话状态
function computeSessionStatus(updatedAt: Date): SessionStatus {
  const now = Date.now();
  const hoursSinceUpdate = (now - updatedAt.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceUpdate > 24) {
    return 'completed';
  } else if (hoursSinceUpdate > 1) {
    return 'waiting';
  }
  return 'running';
}

export interface SessionMeta {
  id: string;
  projectID: string;
  parentID?: string;
  title: string;
  directory: string;
  createdAt: Date;
  updatedAt: Date;
  status: SessionStatus;
}

export interface MessageMeta {
  id: string;
  sessionID: string;
  role: string;
  agent?: string;
  createdAt: Date;
  data: unknown;
}

export interface PartMeta {
  id: string;
  messageID: string;
  sessionID: string;
  type?: string;
  tool?: string;
  state?: string;
  createdAt: Date;
  data: unknown;
}

export interface ProjectMeta {
  id: string;
  name?: string;
  worktree: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanProgress {
  total: number;
  completed: number;
  percentage: number;
  items: PlanItem[];
}

export interface PlanItem {
  content: string;
  completed: boolean;
  line: number;
}

// SQLite database instance
let db: Database | null = null;
let sqlJsInitialized = false;
let lastDbFileMtime: number = 0;

// ==================== 路径获取函数 ====================

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

function getMessagePath(): string {
  return join(getStoragePath(), "message");
}

function getPartPath(): string {
  return join(getStoragePath(), "part");
}

function getDbPath(): string {
  return join(getOpenCodePath(), "opencode.db");
}

// ==================== SQLite 初始化 ====================

async function initSqlite(): Promise<boolean> {
  if (sqlJsInitialized) return db !== null;
  
  try {
    const SQL = await initSqlJs();
    const dbPath = getDbPath();
    
    if (existsSync(dbPath)) {
      const fileBuffer = readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      sqlJsInitialized = true;
      log.info("[storage] SQLite database loaded successfully");
      return true;
    } else {
      log.info("[storage] SQLite database not found at:", dbPath);
      sqlJsInitialized = true;
      return false;
    }
  } catch (error) {
    log.error("[storage] Failed to initialize SQLite:", error);
    sqlJsInitialized = true;
    return false;
  }
}

// ==================== SQLite 查询函数 ====================

function querySessionsFromSqlite(): SessionMeta[] {
  if (!db) return [];
  
  try {
    // 尝试查询 sessions 表 - 需要先了解表结构
    // 常见的表名可能是: sessions, projects, messages 等
    const result = db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name LIKE '%session%'
    `);
    
    if (result.length === 0 || result[0].values.length === 0) {
      log.info("[storage] No sessions table found in SQLite");
      return [];
    }
    
    // 尝试查询所有可能的表
    const sessions: SessionMeta[] = [];
    
    // 尝试从 sessions 表读取
    try {
      const sessionResult = db.exec(`
        SELECT id, project_id, parent_id, title, directory, time_created, time_updated
        FROM session 
        ORDER BY time_updated DESC 
        LIMIT 100
      `);
      
      if (sessionResult.length > 0 && sessionResult[0].values.length > 0) {
        for (const row of sessionResult[0].values) {
          const updatedAt = row[6] ? new Date(Number(row[6])) : new Date();
          sessions.push({
            id: String(row[0] || ''),
            projectID: String(row[1] || ''),
            parentID: row[2] ? String(row[2]) : undefined,
            title: String(row[3] || 'Untitled Session'),
            directory: String(row[4] || ''),
            createdAt: row[5] ? new Date(Number(row[5])) : new Date(),
            updatedAt,
            status: computeSessionStatus(updatedAt),
          });
        }
        log.info(`[storage] Loaded ${sessions.length} sessions from SQLite`);
        return sessions;
      }
    } catch (e) {
      // sessions 表不存在或格式不同
      log.debug("[storage] sessions table query failed, trying other tables");
    }
    
    // 尝试从 projects 表读取（一些版本可能没有 sessions 表）
    try {
      const projectResult = db.exec(`
        SELECT id, name, worktree, time_created, time_updated
        FROM project 
        ORDER BY time_updated DESC 
        LIMIT 100
      `);
      
      if (projectResult.length > 0 && projectResult[0].values.length > 0) {
        for (const row of projectResult[0].values) {
          const updatedAt = row[4] ? new Date(Number(row[4])) : new Date();
          sessions.push({
            id: String(row[0] || ''),
            projectID: String(row[0] || ''),
            title: String(row[1] || 'Project'),
            directory: String(row[2] || ''),
            createdAt: row[3] ? new Date(Number(row[3])) : new Date(),
            updatedAt,
            status: computeSessionStatus(updatedAt),
          });
        }
        log.info(`[storage] Loaded ${sessions.length} projects from SQLite as sessions`);
        return sessions;
      }
    } catch (e) {
      log.debug("[storage] projects table query failed");
    }
    
    return [];
  } catch (error) {
    log.error("[storage] Error querying SQLite:", error);
    return [];
  }
}

function queryMessagesFromSqlite(sessionID: string): MessageMeta[] {
  if (!db) return [];
  
  try {
    const result = db.exec(`
      SELECT id, session_id, time_created, time_updated, data
      FROM message 
      WHERE session_id = '${sessionID.replace(/'/g, "''")}'
      ORDER BY time_created ASC
    `);
    
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values.map((row: any[]) => {
        let parsedData: any = null;
        try { 
          parsedData = row[4] ? JSON.parse(String(row[4])) : null; 
        } catch {}
        
        // 从 data JSON 中提取 role 和 agent
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
    log.debug("[storage] Error querying messages from SQLite:", error);
    return [];
  }
}

function queryPartsFromSqlite(sessionID: string): PartMeta[] {
  if (!db) return [];
  
  try {
    // part 表只有: id, message_id, session_id, time_created, time_updated, data
    // data 字段是 JSON，包含 type, tool, state 等
    let result;
    try {
      result = db.exec(`
        SELECT id, message_id, session_id, time_created, data
        FROM part 
        WHERE session_id = '${sessionID.replace(/'/g, "''")}'
        ORDER BY time_created ASC
      `);
    } catch {
      // parts 表不存在
      return [];
    }
    
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values.map((row: any[]) => {
        let parsedData: any = null;
        try { 
          parsedData = row[4] ? JSON.parse(String(row[4])) : null; 
        } catch {}
        
        // 从 data JSON 中提取 type, tool, state
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
    log.debug("[storage] Error querying parts from SQLite:", error);
    return [];
  }
}

// ==================== JSON 文件解析函数 ====================

function parseJsonFile<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    log.warn(`[storage] Failed to parse JSON file: ${filePath}`, error);
    return null;
  }
}

function listJsonFiles(dirPath: string, subDir?: string): string[] {
  const targetPath = subDir ? join(dirPath, subDir) : dirPath;
  if (!existsSync(targetPath)) {
    return [];
  }

  const files: string[] = [];
  const entries = readdirSync(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(targetPath, entry.name);
    if (entry.isDirectory()) {
      // For message/part directories, recurse into them
      const subFiles = listJsonFiles(targetPath, entry.name);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
}

function parseSessionFile(filePath: string): SessionMeta | null {
  const data = parseJsonFile<{
    id: string;
    projectID: string;
    parentID?: string;
    title?: string;
    directory?: string;
    timeCreated?: number;
    timeUpdated?: number;
    createdAt?: string;
    updatedAt?: string;
  }>(filePath);

  if (!data) return null;

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
    projectID: data.projectID || basename(filePath, ".json"),
    parentID: data.parentID,
    title: data.title || "Untitled Session",
    directory: data.directory || "",
    createdAt,
    updatedAt,
    status: computeSessionStatus(updatedAt),
  };
}

function parseMessageFile(filePath: string): MessageMeta | null {
  const data = parseJsonFile<{
    id: string;
    sessionID: string;
    role?: string;
    agent?: string;
    timeCreated?: number;
    createdAt?: string;
    data?: unknown;
  }>(filePath);

  if (!data) return null;

  return {
    id: data.id,
    sessionID: data.sessionID || basename(dirname(filePath)),
    role: data.role || "user",
    agent: data.agent,
    createdAt: data.timeCreated
      ? new Date(data.timeCreated)
      : data.createdAt
        ? new Date(data.createdAt)
        : new Date(),
    data: data.data,
  };
}

function parsePartFile(filePath: string): PartMeta | null {
  const data = parseJsonFile<{
    id: string;
    messageID: string;
    sessionID: string;
    type?: string;
    tool?: string;
    state?: string;
    timeCreated?: number;
    createdAt?: string;
    data?: unknown;
  }>(filePath);

  if (!data) return null;

  return {
    id: data.id,
    messageID: data.messageID || basename(dirname(filePath)),
    sessionID: data.sessionID || basename(dirname(dirname(filePath))),
    type: data.type,
    tool: data.tool,
    state: data.state,
    createdAt: data.timeCreated
      ? new Date(data.timeCreated)
      : data.createdAt
        ? new Date(data.createdAt)
        : new Date(),
    data: data.data,
  };
}

function dirname(path: string): string {
  return path.split(/[/\\]/).slice(0, -1).join("/");
}

// ==================== 存储检查 ====================

export function checkStorageExists(): boolean {
  const storagePath = getStoragePath();
  const dbPath = getDbPath();
  return existsSync(storagePath) || existsSync(dbPath);
}

export async function checkDbInitialized(): Promise<boolean> {
  return await initSqlite();
}

// 检查并重新加载数据库（如果文件有变化）
export async function reloadDbIfChanged(): Promise<boolean> {
  const dbPath = getDbPath();
  
  if (!existsSync(dbPath)) {
    return false;
  }
  
  try {
    const stats = statSync(dbPath);
    const currentMtime = stats.mtimeMs;
    
    // 如果文件修改时间变了，重新加载数据库
    if (currentMtime !== lastDbFileMtime) {
      log.info(`[storage] Database file changed, reloading...`);
      
      // 关闭旧连接
      if (db) {
        db.close();
        db = null;
      }
      
      // 重新初始化
      const SQL = await initSqlJs();
      const fileBuffer = readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      lastDbFileMtime = currentMtime;
      
      log.info(`[storage] Database reloaded successfully`);
      return true;
    }
    
    return false;
  } catch (error) {
    log.warn(`[storage] Failed to reload database:`, error);
    return false;
  }
}

// 互斥锁：防止并发请求同时刷新数据库
let isReloading = false;

// 带互斥锁的数据库刷新函数
async function ensureDbFresh(): Promise<void> {
  if (isReloading) return;  // 已有请求在刷新，跳过
  isReloading = true;
  try {
    await reloadDbIfChanged();
  } finally {
    isReloading = false;
  }
}

// 强制重新加载数据库
export async function forceReloadDb(): Promise<boolean> {
  const dbPath = getDbPath();
  
  if (!existsSync(dbPath)) {
    log.warn(`[storage] Database file not found: ${dbPath}`);
    return false;
  }
  
  try {
    log.info(`[storage] Force reloading database...`);
    
    // 关闭旧连接
    if (db) {
      db.close();
      db = null;
    }
    
    sqlJsInitialized = false;
    
    // 重新初始化
    await initSqlite();
    
    log.info(`[storage] Database force reloaded successfully`);
    return true;
  } catch (error) {
    log.error(`[storage] Failed to force reload database:`, error);
    return false;
  }
}

// ==================== 公开 API ====================

// Get all sessions (SQLite 优先，回退到 JSON)
export async function getAllSessions(): Promise<SessionMeta[]> {
  await ensureDbFresh();
  
  // 先尝试 SQLite
  await initSqlite();
  if (db) {
    const sqliteSessions = querySessionsFromSqlite();
    if (sqliteSessions.length > 0) {
      return sqliteSessions;
    }
  }
  
  // 回退到 JSON 文件
  const sessionPath = getSessionPath();
  const files = listJsonFiles(sessionPath);

  return files
    .map((file) => parseSessionFile(file))
    .filter((s): s is SessionMeta => s !== null)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

// Get session by ID
export async function getSession(id: string): Promise<SessionMeta | null> {
  await ensureDbFresh();
  
  // 先尝试 SQLite
  await initSqlite();
  if (db) {
    const sessions = querySessionsFromSqlite();
    const session = sessions.find(s => s.id === id);
    if (session) return session;
  }
  
  // 回退到 JSON 文件
  const sessionPath = getSessionPath();
  const filePath = join(sessionPath, `${id}.json`);
  return parseSessionFile(filePath);
}

// Get all messages for a session
export async function getMessagesForSession(sessionID: string): Promise<MessageMeta[]> {
  await ensureDbFresh();
  
  // 先尝试 SQLite
  await initSqlite();
  if (db) {
    const messages = queryMessagesFromSqlite(sessionID);
    if (messages.length > 0) {
      return messages;
    }
  }
  
  // 回退到 JSON 文件
  const messagePath = getMessagePath();
  const sessionDir = join(messagePath, sessionID);

  if (!existsSync(sessionDir)) {
    return [];
  }

  const files = listJsonFiles(messagePath, sessionID);
  return files
    .map((file) => parseMessageFile(file))
    .filter((m): m is MessageMeta => m !== null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

// Get all parts for a session
export async function getPartsForSession(sessionID: string): Promise<PartMeta[]> {
  await ensureDbFresh();
  
  // 先尝试 SQLite
  await initSqlite();
  if (db) {
    const parts = queryPartsFromSqlite(sessionID);
    if (parts.length > 0) {
      return parts;
    }
  }
  
  // 回退到 JSON 文件
  const partPath = getPartPath();
  const sessionDir = join(partPath, sessionID);

  if (!existsSync(sessionDir)) {
    return [];
  }

  const files = listJsonFiles(partPath, sessionID);
  return files
    .map((file) => parsePartFile(file))
    .filter((p): p is PartMeta => p !== null)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

// Get messages for multiple sessions
export async function getMessagesForSessions(sessionIDs: string[]): Promise<Map<string, MessageMeta[]>> {
  const result = new Map<string, MessageMeta[]>();

  for (const sessionID of sessionIDs) {
    result.set(sessionID, await getMessagesForSession(sessionID));
  }

  return result;
}

// Get parts for multiple sessions
export async function getPartsForSessions(sessionIDs: string[]): Promise<Map<string, PartMeta[]>> {
  const result = new Map<string, PartMeta[]>();

  for (const sessionID of sessionIDs) {
    result.set(sessionID, await getPartsForSession(sessionID));
  }

  return result;
}

// Parse boulder.json for plan progress
export function parseBoulder(projectPath: string): PlanProgress | null {
  const boulderPath = join(projectPath, ".sisyphus", "boulder.json");

  if (!existsSync(boulderPath)) {
    return null;
  }

  try {
    const content = readFileSync(boulderPath, "utf-8");
    const boulder = JSON.parse(content);

    const items: PlanItem[] = [];
    const lines = content.split("\n");
    let total = 0;
    let completed = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match unchecked checkboxes: - [ ] or - [ ]
      const uncheckedMatch = line.match(/^(\s*)-\s*\[\s*\]\s*(.+)$/);
      // Match checked checkboxes: - [x] or - [X]
      const checkedMatch = line.match(/^(\s*)-\s*\[\s*[xX]\s*\]\s*(.+)$/);

      if (uncheckedMatch || checkedMatch) {
        total++;
        const isCompleted = !!checkedMatch;
        if (isCompleted) {
          completed++;
        }
        items.push({
          content: (checkedMatch || uncheckedMatch)![2].trim(),
          completed: isCompleted,
          line: i + 1,
        });
      }
    }

    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      items,
    };
  } catch (error) {
    log.warn("[storage] Failed to parse boulder.json", error);
    return null;
  }
}

// Get root sessions (sessions without parent)
export async function getRootSessions(limit = 20): Promise<SessionMeta[]> {
  const sessions = await getAllSessions();
  return sessions.filter((s) => !s.parentID).slice(0, limit);
}

// Get child sessions
export async function getChildSessions(parentID: string): Promise<SessionMeta[]> {
  const sessions = await getAllSessions();
  return sessions.filter((s) => s.parentID === parentID);
}

// Get session tree
export async function getSessionTree(sessionID: string): Promise<SessionMeta | null> {
  const session = await getSession(sessionID);
  if (!session) return null;

  const children = await getChildSessions(sessionID);
  return {
    ...session,
    // @ts-expect-error - extending for tree structure
    children,
  };
}

// Close database connection
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
  sqlJsInitialized = false;
  log.info("[storage] Database closed");
}

// 获取存储路径信息（用于调试）
export function getStorageInfo(): { storagePath: string; dbPath: string; storageExists: boolean; dbExists: boolean } {
  const storagePath = getStoragePath();
  const dbPath = getDbPath();
  return {
    storagePath,
    dbPath,
    storageExists: existsSync(storagePath),
    dbExists: existsSync(dbPath),
  };
}