import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import log from "electron-log";
import * as sqlite from "./sqlite-conn";

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

// SQLite state is now managed by sqlite-conn module
// 路径函数已在 sqlite-conn.ts 中定义：getOpenCodePath, getStoragePath, getDbPath
// 这里保留用于兼容 JSON 回退的函数

function getSessionPath(): string {
  return join(sqlite.getStoragePath(), "session");
}

function getMessagePath(): string {
  return join(sqlite.getStoragePath(), "message");
}

function getPartPath(): string {
  return join(sqlite.getStoragePath(), "part");
}

// ==================== SQLite 初始化 (由 sqlite-conn 管理) ====================

// ==================== SQLite 查询函数 ====================

interface SessionRow {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  directory: string;
  time_created: number;
  time_updated: number;
}

interface ProjectRow {
  id: string;
  name: string;
  worktree: string;
  time_created: number;
  time_updated: number;
}

function querySessionsFromSqlite(): SessionMeta[] {
  const sessions: SessionMeta[] = [];
  
  // 尝试从 session 表读取
  try {
    const rows = sqlite.queryAll<SessionRow>(`
      SELECT id, project_id, parent_id, title, directory, time_created, time_updated
      FROM session 
      ORDER BY time_updated DESC 
      LIMIT 100
    `);
    
    if (rows.length > 0) {
      for (const row of rows) {
        const updatedAt = row.time_updated ? new Date(row.time_updated) : new Date();
        sessions.push({
          id: row.id || '',
          projectID: row.project_id || '',
          parentID: row.parent_id || undefined,
          title: row.title || 'Untitled Session',
          directory: row.directory || '',
          createdAt: row.time_created ? new Date(row.time_created) : new Date(),
          updatedAt,
          status: computeSessionStatus(updatedAt),
        });
      }
      return sessions;
    }
  } catch (e) {
    // session 表不存在或格式不同
    log.debug("[storage] session table query failed, trying other tables");
  }
  
  // 尝试从 project 表读取（一些版本可能没有 session 表）
  try {
    const rows = sqlite.queryAll<ProjectRow>(`
      SELECT id, name, worktree, time_created, time_updated
      FROM project 
      ORDER BY time_updated DESC 
      LIMIT 100
    `);
    
    if (rows.length > 0) {
      for (const row of rows) {
        const updatedAt = row.time_updated ? new Date(row.time_updated) : new Date();
        sessions.push({
          id: row.id || '',
          projectID: row.id || '',
          title: row.name || 'Project',
          directory: row.worktree || '',
          createdAt: row.time_created ? new Date(row.time_created) : new Date(),
          updatedAt,
          status: computeSessionStatus(updatedAt),
        });
      }
      return sessions;
    }
  } catch (e) {
    log.debug("[storage] project table query failed");
  }
  
  return [];
}

interface MessageRow {
  id: string;
  session_id: string;
  time_created: number;
  time_updated: number;
  data: string;
}

function queryMessagesFromSqlite(sessionID: string): MessageMeta[] {
  try {
    const rows = sqlite.queryAll<MessageRow>(
      `SELECT id, session_id, time_created, time_updated, data
       FROM message 
       WHERE session_id = ?
       ORDER BY time_created ASC`,
      [sessionID]
    );
    
    const messages: MessageMeta[] = [];
    for (const row of rows) {
      let parsedData: Record<string, unknown> | null = null;
      try { 
        parsedData = row.data ? JSON.parse(row.data) : null; 
      } catch (e) {
        log.debug("[storage] Error parsing message data JSON:", e);
      }
      
      // 从 data JSON 中提取 role 和 agent
      const role = parsedData?.role ? String(parsedData.role) : 'user';
      const agent = parsedData?.agent ? String(parsedData.agent) : undefined;
      
      messages.push({
        id: row.id || '',
        sessionID: row.session_id || '',
        role,
        agent,
        createdAt: row.time_created ? new Date(row.time_created) : new Date(),
        data: parsedData,
      });
    }
    return messages;
  } catch (error) {
    log.debug("[storage] Error querying messages from SQLite:", error);
    return [];
  }
}

interface PartRow {
  id: string;
  message_id: string;
  session_id: string;
  time_created: number;
  data: string;
}

function queryPartsFromSqlite(sessionID: string): PartMeta[] {
  try {
    const rows = sqlite.queryAll<PartRow>(
      `SELECT id, message_id, session_id, time_created, data
       FROM part 
       WHERE session_id = ?
       ORDER BY time_created ASC`,
      [sessionID]
    );
    
    const parts: PartMeta[] = [];
    for (const row of rows) {
      let parsedData: Record<string, unknown> | null = null;
      try { 
        parsedData = row.data ? JSON.parse(row.data) : null; 
      } catch (e) {
        log.debug("[storage] Error parsing part data JSON:", e);
      }
      
      // 从 data JSON 中提取 type, tool, state
      const type = parsedData?.type ? String(parsedData.type) : undefined;
      const tool = parsedData?.tool ? String(parsedData.tool) : undefined;
      const state = parsedData?.state ? String(parsedData.state) : undefined;
      
      parts.push({
        id: row.id || '',
        messageID: row.message_id || '',
        sessionID: row.session_id || '',
        type,
        tool,
        state,
        createdAt: row.time_created ? new Date(row.time_created) : new Date(),
        data: parsedData,
      });
    }
    return parts;
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

// ==================== 存储检查 (委托给 sqlite-conn) ====================

export function checkStorageExists(): boolean {
  return sqlite.checkStorageExists();
}

export function checkDbInitialized(): boolean {
  return sqlite.isDbReady();
}

// 检查并重新加载数据库（如果文件有变化）- 委托给 sqlite-conn
export function reloadDbIfChanged(): boolean {
  return sqlite.reloadDbIfChanged();
}

// 带互斥锁的数据库刷新函数 - 委托给 sqlite-conn
function ensureDbFresh(): void {
  sqlite.ensureDbFresh();
}

// 强制重新加载数据库 - 委托给 sqlite-conn
export function forceReloadDb(): boolean {
  return sqlite.forceReloadDb();
}

// ==================== 公开 API ====================

// Get all sessions (SQLite 优先，回退到 JSON)
export async function getAllSessions(): Promise<SessionMeta[]> {
  ensureDbFresh();
  
  // 先尝试 SQLite
  if (sqlite.isDbReady()) {
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
  ensureDbFresh();
  
  // 先尝试 SQLite
  if (sqlite.isDbReady()) {
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
  ensureDbFresh();
  
  // 先尝试 SQLite
  if (sqlite.isDbReady()) {
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
  ensureDbFresh();
  
  // 先尝试 SQLite
  if (sqlite.isDbReady()) {
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
  const sisyphusDir = join(projectPath, ".sisyphus");
  const boulderPath = join(sisyphusDir, "boulder.json");

  if (!existsSync(boulderPath)) {
    return null;
  }

  try {
    const boulderContent = readFileSync(boulderPath, "utf-8");
    const boulder = JSON.parse(boulderContent);

    // 方法1: 优先从 active_plan 读取 .md 计划文件获取任务状态
    const activePlan = boulder.active_plan;
    if (activePlan && typeof activePlan === "string") {
      // activePlan 可能是绝对路径或相对路径
      let planFilePath = activePlan;
      
      // 如果是相对路径，尝试从 sisyphus 目录解析
      if (!existsSync(planFilePath)) {
        planFilePath = join(sisyphusDir, "plans", activePlan);
      }
      // 也可能是完整的文件名
      if (!existsSync(planFilePath)) {
        planFilePath = join(sisyphusDir, activePlan);
      }
      
      if (existsSync(planFilePath)) {
        const planContent = readFileSync(planFilePath, "utf-8");
        const { total, completed, items } = parsePlanMarkdown(planContent);
        
        if (total > 0) {
          return {
            total,
            completed,
            percentage: Math.round((completed / total) * 100),
            items,
          };
        }
      }
    }

    // 方法2: 从 task_sessions 解析（但 task_sessions 没有 status 字段，所以这里主要获取任务名称）
    const taskSessions = boulder.task_sessions || {};
    const items: PlanItem[] = [];
    let total = 0;
    let completed = 0;

    Object.entries(taskSessions).forEach(([key, value]: [string, unknown]) => {
      total++;
      const task = value as {
        task_title?: string;
        task_label?: string;
        status?: string;
        updated_at?: string;
      };
      
      // task_sessions 没有 status 字段，无法准确判断完成状态
      // 默认设为 false，或者可以根据 updated_at 时间推断（超过24小时视为可能已完成）
      const isCompleted = task.status === 'completed' || task.status === 'done';
      if (isCompleted) {
        completed++;
      }
      
      items.push({
        content: task.task_title || task.task_label || key,
        completed: isCompleted,
        line: total,
      });
    });

    // 方法3: 如果 task_sessions 为空，尝试直接解析 boulder.json 的 Markdown 内容
    if (total === 0) {
      const { total: mdTotal, completed: mdCompleted, items: mdItems } = parsePlanMarkdown(boulderContent);
      if (mdTotal > 0) {
        return {
          total: mdTotal,
          completed: mdCompleted,
          percentage: Math.round((mdCompleted / mdTotal) * 100),
          items: mdItems,
        };
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

// 解析 Markdown 计划文件，提取任务状态
function parsePlanMarkdown(content: string): { total: number; completed: number; items: PlanItem[] } {
  const items: PlanItem[] = [];
  let total = 0;
  let completed = 0;

  const lines = content.split("\n");
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

  return { total, completed, items };
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
  sqlite.closeSqlite();
}

// 获取存储路径信息（用于调试）
export function getStorageInfo(): { storagePath: string; dbPath: string; storageExists: boolean; dbExists: boolean } {
  const storagePath = sqlite.getStoragePath();
  const dbPath = sqlite.getDbPath();
  return {
    storagePath,
    dbPath,
    storageExists: existsSync(storagePath),
    dbExists: existsSync(dbPath),
  };
}