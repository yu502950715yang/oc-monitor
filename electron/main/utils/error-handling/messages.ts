/**
 * 用户友好的错误消息映射
 * 将技术性错误码转换为用户可理解的消息
 */

import { ErrorCode, ErrorSeverity } from './errors.js';

/**
 * 用户消息映射表
 */
const errorMessages: Record<ErrorCode, { userMessage: string; severity: ErrorSeverity }> = {
  // 数据源错误
  [ErrorCode.DS_NOT_FOUND]: {
    userMessage: '无法找到指定的数据源，请检查路径配置是否正确。',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorCode.DS_READ_FAILED]: {
    userMessage: '读取数据失败，请检查文件权限或网络连接。',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorCode.DS_WRITE_FAILED]: {
    userMessage: '写入数据失败，请检查磁盘空间和写入权限。',
    severity: ErrorSeverity.HIGH,
  },
  [ErrorCode.DS_INVALID_PATH]: {
    userMessage: '数据路径无效，请检查配置中的路径设置。',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorCode.DS_PERMISSION_DENIED]: {
    userMessage: '没有访问权限，请检查文件或目录的权限设置。',
    severity: ErrorSeverity.HIGH,
  },

  // 数据库错误
  [ErrorCode.DB_CONNECTION_FAILED]: {
    userMessage: '数据库连接失败，请检查数据库服务是否运行。',
    severity: ErrorSeverity.CRITICAL,
  },
  [ErrorCode.DB_QUERY_FAILED]: {
    userMessage: '数据库查询失败，请稍后重试。',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorCode.DB_INSERT_FAILED]: {
    userMessage: '数据保存失败，请稍后重试。',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorCode.DB_UPDATE_FAILED]: {
    userMessage: '数据更新失败，请稍后重试。',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorCode.DB_DELETE_FAILED]: {
    userMessage: '数据删除失败，请稍后重试。',
    severity: ErrorSeverity.MEDIUM,
  },

  // 配置错误
  [ErrorCode.CF_NOT_FOUND]: {
    userMessage: '配置文件不存在，请检查配置路径。',
    severity: ErrorSeverity.HIGH,
  },
  [ErrorCode.CF_PARSE_FAILED]: {
    userMessage: '配置文件格式错误，请检查配置文件语法。',
    severity: ErrorSeverity.HIGH,
  },
  [ErrorCode.CF_INVALID_VALUE]: {
    userMessage: '配置值无效，请检查配置项的值是否正确。',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorCode.CF_MISSING_REQUIRED]: {
    userMessage: '缺少必需的配置文件，请检查配置完整性。',
    severity: ErrorSeverity.CRITICAL,
  },

  // 验证错误
  [ErrorCode.VL_INVALID_FORMAT]: {
    userMessage: '数据格式不正确，请检查输入格式。',
    severity: ErrorSeverity.LOW,
  },
  [ErrorCode.VL_OUT_OF_RANGE]: {
    userMessage: '数值超出允许范围，请检查输入值。',
    severity: ErrorSeverity.LOW,
  },
  [ErrorCode.VL_REQUIRED]: {
    userMessage: '缺少必需的字段，请填写完整信息。',
    severity: ErrorSeverity.LOW,
  },
  [ErrorCode.VL_DUPLICATE]: {
    userMessage: '数据已存在，请使用不同的值。',
    severity: ErrorSeverity.LOW,
  },

  // 通用错误
  [ErrorCode.GE_UNKNOWN]: {
    userMessage: '发生未知错误，请稍后重试。',
    severity: ErrorSeverity.MEDIUM,
  },
  [ErrorCode.GE_INTERNAL]: {
    userMessage: '系统内部错误，请联系管理员。',
    severity: ErrorSeverity.HIGH,
  },
  [ErrorCode.GE_TIMEOUT]: {
    userMessage: '操作超时，请稍后重试。',
    severity: ErrorSeverity.MEDIUM,
  },
};

/**
 * 获取错误码对应的用户消息
 */
export function getUserMessage(code: ErrorCode): string {
  return errorMessages[code]?.userMessage ?? '发生未知错误，请稍后重试。';
}

/**
 * 获取错误码对应的严重级别
 */
export function getSeverity(code: ErrorCode): ErrorSeverity {
  return errorMessages[code]?.severity ?? ErrorSeverity.MEDIUM;
}

/**
 * 获取错误的建议操作
 */
export function getSuggestion(code: ErrorCode): string {
  const suggestions: Partial<Record<ErrorCode, string>> = {
    [ErrorCode.DS_NOT_FOUND]: '请检查配置文件中的路径设置，或重新选择数据目录。',
    [ErrorCode.DS_READ_FAILED]: '请检查文件是否存在，以及是否有读取权限。',
    [ErrorCode.DS_WRITE_FAILED]: '请检查磁盘空间是否充足，以及是否有写入权限。',
    [ErrorCode.DS_PERMISSION_DENIED]: '请以管理员权限运行程序，或修改文件权限。',
    [ErrorCode.DB_CONNECTION_FAILED]: '请检查数据库服务是否启动，或尝试重启应用。',
    [ErrorCode.CF_NOT_FOUND]: '请确认配置文件路径是否正确，或重新创建配置文件。',
    [ErrorCode.CF_PARSE_FAILED]: '请检查配置文件的 JSON 格式是否正确。',
    [ErrorCode.GE_TIMEOUT]: '请检查网络连接状况，或稍后重试操作。',
  };

  return suggestions[code] ?? '如问题持续存在，请查看日志获取详细信息。';
}

/**
 * 格式化错误详情用于日志
 */
export function formatErrorDetails(
  code: ErrorCode,
  originalMessage: string,
  context?: Record<string, unknown>
): string {
  const lines = [
    `错误码: ${code}`,
    `原始错误: ${originalMessage}`,
    `用户消息: ${getUserMessage(code)}`,
  ];

  if (context && Object.keys(context).length > 0) {
    lines.push(`上下文: ${JSON.stringify(context, null, 2)}`);
  }

  const suggestion = getSuggestion(code);
  if (suggestion) {
    lines.push(`建议: ${suggestion}`);
  }

  return lines.join('\n');
}