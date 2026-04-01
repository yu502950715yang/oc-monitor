/**
 * 统一错误处理模块
 * 提供错误处理、日志记录和用户消息转换功能
 */

import {
  AppError,
  ErrorCode,
  ErrorSeverity,
  isAppError,
  isDataSourceError,
  isDatabaseError,
  isConfigError,
  isValidationError,
} from './errors.js';
import { getUserMessage, getSeverity, formatErrorDetails } from './messages.js';

/**
 * 日志级别
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 当前日志级别（可配置）
 */
let currentLogLevel: LogLevel = LogLevel.INFO;

/**
 * 设置日志级别
 */
export function setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
  switch (level) {
    case 'debug':
      currentLogLevel = LogLevel.DEBUG;
      break;
    case 'info':
      currentLogLevel = LogLevel.INFO;
      break;
    case 'warn':
      currentLogLevel = LogLevel.WARN;
      break;
    case 'error':
      currentLogLevel = LogLevel.ERROR;
      break;
  }
}

/**
 * 内部日志记录函数
 */
function log(level: LogLevel, message: string, ...args: unknown[]): void {
  if (level < currentLogLevel) return;

  const timestamp = new Date().toISOString();
  const levelStr = LogLevel[level];
  const formattedMessage = `[${timestamp}] [${levelStr}] ${message}`;

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(formattedMessage, ...args);
      break;
    case LogLevel.INFO:
      console.info(formattedMessage, ...args);
      break;
    case LogLevel.WARN:
      console.warn(formattedMessage, ...args);
      break;
    case LogLevel.ERROR:
      console.error(formattedMessage, ...args);
      break;
  }
}

/**
 * 处理错误并返回结构化结果
 */
export interface ErrorHandlerResult {
  /** 用户友好的错误消息 */
  userMessage: string;
  /** 技术性错误消息 */
  technicalMessage: string;
  /** 错误码 */
  code: ErrorCode;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 严重级别 */
  severity: ErrorSeverity;
  /** 错误详情（用于调试） */
  details: string;
  /** 建议的操作 */
  suggestion: string;
}

/**
 * 处理错误的统一入口函数
 * 
 * @param error - 原始错误对象
 * @param options - 处理选项
 * @returns 结构化的错误处理结果
 */
export function handleError(
  error: unknown,
  options?: {
    /** 是否记录日志 */
    logError?: boolean;
    /** 是否包含堆栈信息 */
    includeStack?: boolean;
    /** 自定义上下文信息 */
    context?: Record<string, unknown>;
  }
): ErrorHandlerResult {
  const { logError = true, includeStack = true, context } = options ?? {};

  // 提取错误信息
  let code: ErrorCode;
  let message: string;
  let severity: ErrorSeverity;
  let recoverable: boolean;
  let originalError: Error | undefined;
  let errorContext: Record<string, unknown> | undefined;

  if (isAppError(error)) {
    // 已经是 AppError 实例
    code = error.code;
    message = error.message;
    severity = error.severity;
    recoverable = error.recoverable;
    originalError = error.originalError;
    errorContext = error.context;
  } else if (error instanceof Error) {
    // 普通 Error 对象，尝试推断错误类型
    const inferred = inferErrorType(error);
    code = inferred.code;
    message = error.message;
    severity = inferred.severity;
    recoverable = inferred.recoverable;
    originalError = error;
  } else {
    // 未知错误类型
    code = ErrorCode.GE_UNKNOWN;
    message = String(error);
    severity = ErrorSeverity.MEDIUM;
    recoverable = true;
    originalError = undefined;
  }

  // 合并上下文信息
  const mergedContext = { ...errorContext, ...context };

  // 获取用户友好的消息
  const userMessage = getUserMessage(code);

  // 生成技术性消息
  const technicalMessage = includeStack && originalError?.stack
    ? `${message}\n${originalError.stack}`
    : message;

  // 格式化错误详情
  const details = formatErrorDetails(code, message, mergedContext);

  // 获取建议
  const suggestion = getSuggestionMessage(code, recoverable);

  // 记录日志
  if (logError) {
    log(
      severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH
        ? LogLevel.ERROR
        : LogLevel.WARN,
      `[${code}] ${message}`,
      {
        recoverable,
        severity,
        context: mergedContext,
        originalError: originalError?.message,
      }
    );
  }

  return {
    userMessage,
    technicalMessage,
    code,
    recoverable,
    severity,
    details,
    suggestion,
  };
}

/**
 * 根据错误类型推断错误码和严重级别
 */
function inferErrorType(error: Error): {
  code: ErrorCode;
  severity: ErrorSeverity;
  recoverable: boolean;
} {
  const message = error.message.toLowerCase();

  // 数据库相关错误
  if (
    message.includes('database') ||
    message.includes('sqlite') ||
    message.includes('sql') ||
    message.includes('db ')
  ) {
    return {
      code: ErrorCode.DB_QUERY_FAILED,
      severity: ErrorSeverity.HIGH,
      recoverable: true,
    };
  }

  // 配置相关错误
  if (
    message.includes('config') ||
    message.includes('parse') ||
    message.includes('json')
  ) {
    return {
      code: ErrorCode.CF_PARSE_FAILED,
      severity: ErrorSeverity.HIGH,
      recoverable: false,
    };
  }

  // 验证相关错误
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return {
      code: ErrorCode.VL_INVALID_FORMAT,
      severity: ErrorSeverity.LOW,
      recoverable: true,
    };
  }

  // 文件/路径相关错误
  if (
    message.includes('not found') ||
    message.includes('enoent') ||
    message.includes('path')
  ) {
    return {
      code: ErrorCode.DS_NOT_FOUND,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
    };
  }

  // 权限相关错误
  if (
    message.includes('permission') ||
    message.includes('access denied') ||
    message.includes('eacces')
  ) {
    return {
      code: ErrorCode.DS_PERMISSION_DENIED,
      severity: ErrorSeverity.HIGH,
      recoverable: false,
    };
  }

  // 超时相关错误
  if (message.includes('timeout') || message.includes('timed out')) {
    return {
      code: ErrorCode.GE_TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
    };
  }

  // 未知错误
  return {
    code: ErrorCode.GE_UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    recoverable: true,
  };
}

/**
 * 获取建议消息
 */
function getSuggestionMessage(code: ErrorCode, recoverable: boolean): string {
  if (!recoverable) {
    return '此错误无法自动恢复，请检查配置或联系管理员。';
  }

  const suggestions: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.DS_NOT_FOUND]: '请检查数据源路径配置是否正确。',
    [ErrorCode.DS_READ_FAILED]: '请检查文件是否存在以及是否有读取权限。',
    [ErrorCode.DB_CONNECTION_FAILED]: '请检查数据库服务是否正常运行。',
    [ErrorCode.GE_TIMEOUT]: '请检查网络连接状况，或稍后重试。',
    [ErrorCode.GE_UNKNOWN]: '请查看详细日志以了解更多信息。',
  };

  return suggestions[code] ?? '请稍后重试，如问题持续存在请联系管理员。';
}

/**
 * 判断错误是否可恢复
 */
export function isRecoverable(error: unknown): boolean {
  if (isAppError(error)) {
    return error.recoverable;
  }

  if (error instanceof Error) {
    const inferred = inferErrorType(error);
    return inferred.recoverable;
  }

  return true;
}

/**
 * 获取错误的严重级别
 */
export function getErrorSeverity(error: unknown): ErrorSeverity {
  if (isAppError(error)) {
    return error.severity;
  }

  if (error instanceof Error) {
    const inferred = inferErrorType(error);
    return inferred.severity;
  }

  return ErrorSeverity.MEDIUM;
}

/**
 * 包装异步函数以统一处理错误
 * 
 * @example
 * ```typescript
 * const result = await withErrorHandling(
 *   () => fetchData(),
 *   { fallbackValue: null }
 * );
 * ```
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    /** 错误时的回退值 */
    fallbackValue?: T;
    /** 自定义错误处理 */
    onError?: (result: ErrorHandlerResult) => void;
    /** 错误码（用于创建 AppError） */
    errorCode?: ErrorCode;
  }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const result = handleError(error);

    if (options?.onError) {
      options.onError(result);
    }

    if (options?.fallbackValue !== undefined) {
      return options.fallbackValue;
    }

    // 如果没有回退值，重新抛出原始错误或包装后的错误
    if (isAppError(error)) {
      throw error;
    }

    // 根据错误码创建对应的错误类型
    const { code } = result;
    const ErrorClass = getErrorClassByCode(code);
    throw new ErrorClass(code, result.technicalMessage, {
      recoverable: result.recoverable,
      severity: result.severity,
      originalError: error instanceof Error ? error : undefined,
    });
  }
}

/**
 * 根据错误码获取对应的错误类
 */
function getErrorClassByCode(code: ErrorCode): new (
  code: ErrorCode,
  message: string,
  options?: {
    recoverable?: boolean;
    severity?: ErrorSeverity;
    originalError?: Error;
    context?: Record<string, unknown>;
  }
) => AppError {
  if (code.startsWith('DS')) {
    return class extends Error {
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
    };
  }

  if (code.startsWith('DB')) {
    return class extends Error {
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
    };
  }

  if (code.startsWith('CF')) {
    return class extends Error {
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
    };
  }

  return class extends Error {
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
  };
}

/**
 * 导出类型守卫
 */
export {
  isAppError,
  isDataSourceError,
  isDatabaseError,
  isConfigError,
  isValidationError,
};