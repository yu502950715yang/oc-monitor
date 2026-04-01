/**
 * 统一错误类型定义
 * 提供结构化的错误分类，便于错误处理和日志记录
 */

/**
 * 错误码枚举
 */
export enum ErrorCode {
  // 数据源错误 (DS-开头)
  DS_NOT_FOUND = 'DS001',
  DS_READ_FAILED = 'DS002',
  DS_WRITE_FAILED = 'DS003',
  DS_INVALID_PATH = 'DS004',
  DS_PERMISSION_DENIED = 'DS005',

  // 数据库错误 (DB-开头)
  DB_CONNECTION_FAILED = 'DB001',
  DB_QUERY_FAILED = 'DB002',
  DB_INSERT_FAILED = 'DB003',
  DB_UPDATE_FAILED = 'DB004',
  DB_DELETE_FAILED = 'DB005',

  // 配置错误 (CF-开头)
  CF_NOT_FOUND = 'CF001',
  CF_PARSE_FAILED = 'CF002',
  CF_INVALID_VALUE = 'CF003',
  CF_MISSING_REQUIRED = 'CF004',

  // 验证错误 (VL-开头)
  VL_INVALID_FORMAT = 'VL001',
  VL_OUT_OF_RANGE = 'VL002',
  VL_REQUIRED = 'VL003',
  VL_DUPLICATE = 'VL004',

  // 通用错误 (GE-开头)
  GE_UNKNOWN = 'GE001',
  GE_INTERNAL = 'GE002',
  GE_TIMEOUT = 'GE003',
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * 基础错误类接口
 */
export interface AppError {
  code: ErrorCode;
  message: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  originalError?: Error;
  context?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * 数据源错误 - 用于文件读取、API调用等数据源相关错误
 */
export class DataSourceError extends Error implements AppError {
  code: ErrorCode;
  severity: ErrorSeverity;
  recoverable: boolean;
  originalError?: Error;
  context?: Record<string, unknown>;
  timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      recoverable?: boolean;
      severity?: ErrorSeverity;
      originalError?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'DataSourceError';
    this.code = code;
    this.recoverable = options?.recoverable ?? true;
    this.severity = options?.severity ?? ErrorSeverity.MEDIUM;
    this.originalError = options?.originalError;
    this.context = options?.context;
    this.timestamp = new Date();
  }
}

/**
 * 数据库错误 - 用于数据库操作相关错误
 */
export class DatabaseError extends Error implements AppError {
  code: ErrorCode;
  severity: ErrorSeverity;
  recoverable: boolean;
  originalError?: Error;
  context?: Record<string, unknown>;
  timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      recoverable?: boolean;
      severity?: ErrorSeverity;
      originalError?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.recoverable = options?.recoverable ?? true;
    this.severity = options?.severity ?? ErrorSeverity.HIGH;
    this.originalError = options?.originalError;
    this.context = options?.context;
    this.timestamp = new Date();
  }
}

/**
 * 配置错误 - 用于配置文件解析、配置值验证等错误
 */
export class ConfigError extends Error implements AppError {
  code: ErrorCode;
  severity: ErrorSeverity;
  recoverable: boolean;
  originalError?: Error;
  context?: Record<string, unknown>;
  timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      recoverable?: boolean;
      severity?: ErrorSeverity;
      originalError?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
    this.recoverable = options?.recoverable ?? false;
    this.severity = options?.severity ?? ErrorSeverity.HIGH;
    this.originalError = options?.originalError;
    this.context = options?.context;
    this.timestamp = new Date();
  }
}

/**
 * 验证错误 - 用于数据验证、参数校验等错误
 */
export class ValidationError extends Error implements AppError {
  code: ErrorCode;
  severity: ErrorSeverity;
  recoverable: boolean;
  originalError?: Error;
  context?: Record<string, unknown>;
  timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      recoverable?: boolean;
      severity?: ErrorSeverity;
      originalError?: Error;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.recoverable = options?.recoverable ?? true;
    this.severity = options?.severity ?? ErrorSeverity.LOW;
    this.originalError = options?.originalError;
    this.context = options?.context;
    this.timestamp = new Date();
  }
}

/**
 * 类型守卫：检查是否为 AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'severity' in error &&
    'recoverable' in error
  );
}

/**
 * 类型守卫：检查是否为 DataSourceError
 */
export function isDataSourceError(error: unknown): error is DataSourceError {
  return error instanceof DataSourceError;
}

/**
 * 类型守卫：检查是否为 DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * 类型守卫：检查是否为 ConfigError
 */
export function isConfigError(error: unknown): error is ConfigError {
  return error instanceof ConfigError;
}

/**
 * 类型守卫：检查是否为 ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}