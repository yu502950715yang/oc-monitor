/**
 * 错误类型和类型守卫单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  ErrorCode,
  ErrorSeverity,
  AppError,
  DataSourceError,
  DatabaseError,
  ConfigError,
  ValidationError,
  isAppError,
  isDataSourceError,
  isDatabaseError,
  isConfigError,
  isValidationError,
} from '../../../electron/main/utils/error-handling/errors';

describe('ErrorCode 枚举', () => {
  it('应该包含数据源错误码', () => {
    expect(ErrorCode.DS_NOT_FOUND).toBe('DS001');
    expect(ErrorCode.DS_READ_FAILED).toBe('DS002');
    expect(ErrorCode.DS_WRITE_FAILED).toBe('DS003');
    expect(ErrorCode.DS_INVALID_PATH).toBe('DS004');
    expect(ErrorCode.DS_PERMISSION_DENIED).toBe('DS005');
  });

  it('应该包含数据库错误码', () => {
    expect(ErrorCode.DB_CONNECTION_FAILED).toBe('DB001');
    expect(ErrorCode.DB_QUERY_FAILED).toBe('DB002');
    expect(ErrorCode.DB_INSERT_FAILED).toBe('DB003');
    expect(ErrorCode.DB_UPDATE_FAILED).toBe('DB004');
    expect(ErrorCode.DB_DELETE_FAILED).toBe('DB005');
  });

  it('应该包含配置错误码', () => {
    expect(ErrorCode.CF_NOT_FOUND).toBe('CF001');
    expect(ErrorCode.CF_PARSE_FAILED).toBe('CF002');
    expect(ErrorCode.CF_INVALID_VALUE).toBe('CF003');
    expect(ErrorCode.CF_MISSING_REQUIRED).toBe('CF004');
  });

  it('应该包含验证错误码', () => {
    expect(ErrorCode.VL_INVALID_FORMAT).toBe('VL001');
    expect(ErrorCode.VL_OUT_OF_RANGE).toBe('VL002');
    expect(ErrorCode.VL_REQUIRED).toBe('VL003');
    expect(ErrorCode.VL_DUPLICATE).toBe('VL004');
  });

  it('应该包含通用错误码', () => {
    expect(ErrorCode.GE_UNKNOWN).toBe('GE001');
    expect(ErrorCode.GE_INTERNAL).toBe('GE002');
    expect(ErrorCode.GE_TIMEOUT).toBe('GE003');
  });
});

describe('ErrorSeverity 枚举', () => {
  it('应该包含所有严重级别', () => {
    expect(ErrorSeverity.LOW).toBe('low');
    expect(ErrorSeverity.MEDIUM).toBe('medium');
    expect(ErrorSeverity.HIGH).toBe('high');
    expect(ErrorSeverity.CRITICAL).toBe('critical');
  });
});

describe('DataSourceError 类', () => {
  it('应该创建基本的数据源错误', () => {
    const error = new DataSourceError(
      ErrorCode.DS_NOT_FOUND,
      '文件未找到'
    );

    expect(error.name).toBe('DataSourceError');
    expect(error.code).toBe(ErrorCode.DS_NOT_FOUND);
    expect(error.message).toBe('文件未找到');
    expect(error.recoverable).toBe(true);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('应该接受自定义选项', () => {
    const originalError = new Error('原始错误');
    const error = new DataSourceError(
      ErrorCode.DS_READ_FAILED,
      '读取失败',
      {
        recoverable: false,
        severity: ErrorSeverity.HIGH,
        originalError,
        context: { path: '/test/file.txt' },
      }
    );

    expect(error.recoverable).toBe(false);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.originalError).toBe(originalError);
    expect(error.context).toEqual({ path: '/test/file.txt' });
  });

  it('应该使用默认严重级别', () => {
    const error = new DataSourceError(ErrorCode.DS_NOT_FOUND, '测试');
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
  });
});

describe('DatabaseError 类', () => {
  it('应该创建基本的数据库错误', () => {
    const error = new DatabaseError(
      ErrorCode.DB_QUERY_FAILED,
      '查询失败'
    );

    expect(error.name).toBe('DatabaseError');
    expect(error.code).toBe(ErrorCode.DB_QUERY_FAILED);
    expect(error.message).toBe('查询失败');
    expect(error.recoverable).toBe(true);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });

  it('应该使用默认严重级别 HIGH', () => {
    const error = new DatabaseError(ErrorCode.DB_CONNECTION_FAILED, '连接失败');
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });
});

describe('ConfigError 类', () => {
  it('应该创建基本的配置错误', () => {
    const error = new ConfigError(
      ErrorCode.CF_NOT_FOUND,
      '配置文件未找到'
    );

    expect(error.name).toBe('ConfigError');
    expect(error.code).toBe(ErrorCode.CF_NOT_FOUND);
    expect(error.recoverable).toBe(false);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });

  it('应该默认不可恢复', () => {
    const error = new ConfigError(ErrorCode.CF_PARSE_FAILED, '解析失败');
    expect(error.recoverable).toBe(false);
  });
});

describe('ValidationError 类', () => {
  it('应该创建基本的验证错误', () => {
    const error = new ValidationError(
      ErrorCode.VL_REQUIRED,
      '字段必填'
    );

    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe(ErrorCode.VL_REQUIRED);
    expect(error.recoverable).toBe(true);
    expect(error.severity).toBe(ErrorSeverity.LOW);
  });

  it('应该使用默认严重级别 LOW', () => {
    const error = new ValidationError(ErrorCode.VL_INVALID_FORMAT, '格式无效');
    expect(error.severity).toBe(ErrorSeverity.LOW);
  });
});

describe('类型守卫', () => {
  describe('isAppError', () => {
    it('应该识别有效的 AppError', () => {
      const error = new DataSourceError(ErrorCode.DS_NOT_FOUND, '测试');
      expect(isAppError(error)).toBe(true);
    });

    it('应该拒绝普通 Error', () => {
      const error = new Error('普通错误');
      expect(isAppError(error)).toBe(false);
    });

    it('应该拒绝 null', () => {
      expect(isAppError(null)).toBe(false);
    });

    it('应该拒绝 undefined', () => {
      expect(isAppError(undefined)).toBe(false);
    });

    it('应该拒绝缺少必需属性的对象', () => {
      const invalidError = {
        message: '错误消息',
        // 缺少 code, severity, recoverable
      };
      expect(isAppError(invalidError)).toBe(false);
    });

    it('应该识别包含所有必需属性的对象', () => {
      const validError = {
        code: ErrorCode.GE_UNKNOWN,
        message: '错误消息',
        severity: ErrorSeverity.MEDIUM,
        recoverable: true,
        timestamp: new Date(),
      };
      expect(isAppError(validError)).toBe(true);
    });
  });

  describe('isDataSourceError', () => {
    it('应该识别 DataSourceError 实例', () => {
      const error = new DataSourceError(ErrorCode.DS_NOT_FOUND, '测试');
      expect(isDataSourceError(error)).toBe(true);
    });

    it('应该拒绝其他错误类型', () => {
      const dbError = new DatabaseError(ErrorCode.DB_QUERY_FAILED, '测试');
      expect(isDataSourceError(dbError)).toBe(false);

      const configError = new ConfigError(ErrorCode.CF_NOT_FOUND, '测试');
      expect(isDataSourceError(configError)).toBe(false);

      const validationError = new ValidationError(ErrorCode.VL_REQUIRED, '测试');
      expect(isDataSourceError(validationError)).toBe(false);
    });

    it('应该拒绝普通 Error', () => {
      const error = new Error('普通错误');
      expect(isDataSourceError(error)).toBe(false);
    });
  });

  describe('isDatabaseError', () => {
    it('应该识别 DatabaseError 实例', () => {
      const error = new DatabaseError(ErrorCode.DB_QUERY_FAILED, '测试');
      expect(isDatabaseError(error)).toBe(true);
    });

    it('应该拒绝其他错误类型', () => {
      const dsError = new DataSourceError(ErrorCode.DS_NOT_FOUND, '测试');
      expect(isDatabaseError(dsError)).toBe(false);
    });
  });

  describe('isConfigError', () => {
    it('应该识别 ConfigError 实例', () => {
      const error = new ConfigError(ErrorCode.CF_NOT_FOUND, '测试');
      expect(isConfigError(error)).toBe(true);
    });

    it('应该拒绝其他错误类型', () => {
      const dsError = new DataSourceError(ErrorCode.DS_NOT_FOUND, '测试');
      expect(isConfigError(dsError)).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('应该识别 ValidationError 实例', () => {
      const error = new ValidationError(ErrorCode.VL_REQUIRED, '测试');
      expect(isValidationError(error)).toBe(true);
    });

    it('应该拒绝其他错误类型', () => {
      const dsError = new DataSourceError(ErrorCode.DS_NOT_FOUND, '测试');
      expect(isValidationError(dsError)).toBe(false);
    });
  });
});

describe('错误属性', () => {
  it('错误应该能够被抛出和捕获', () => {
    expect(() => {
      throw new DataSourceError(ErrorCode.DS_NOT_FOUND, '测试错误');
    }).toThrow();
  });

  it('抛出后应该能获取错误消息', () => {
    try {
      throw new DatabaseError(ErrorCode.DB_QUERY_FAILED, '查询失败');
    } catch (error) {
      expect((error as Error).message).toBe('查询失败');
    }
  });

  it('错误应该保持原有属性', () => {
    const error = new ValidationError(ErrorCode.VL_INVALID_FORMAT, '格式无效', {
      context: { field: 'email' },
    });

    try {
      throw error;
    } catch (e) {
      if (isValidationError(e)) {
        expect(e.code).toBe(ErrorCode.VL_INVALID_FORMAT);
        expect(e.context).toEqual({ field: 'email' });
      }
    }
  });
});

describe('AppError 接口', () => {
  it('应该符合 AppError 接口定义', () => {
    const error: AppError = {
      code: ErrorCode.GE_UNKNOWN,
      message: '未知错误',
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      timestamp: new Date(),
    };

    expect(error.code).toBeDefined();
    expect(error.message).toBeDefined();
    expect(error.severity).toBeDefined();
    expect(error.recoverable).toBeDefined();
    expect(error.timestamp).toBeInstanceOf(Date);
  });
});