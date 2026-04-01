/**
 * Session 类型和类型守卫单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  SessionDTO,
  SessionSummary,
  isSessionDTO,
  isSessionSummary,
  sessionMetaToDTO,
} from '../../../electron/main/types/session';
import type { SessionStatus } from '../../../electron/main/types';

describe('SessionDTO 类型', () => {
  describe('isSessionDTO 类型守卫', () => {
    const validSessionDTO: SessionDTO = {
      id: 'ses_abc123',
      projectID: 'proj_001',
      parentID: 'ses_parent',
      title: '测试会话',
      directory: '/test/project',
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-02T10:00:00Z'),
      status: 'running',
    };

    it('应该识别有效的 SessionDTO', () => {
      expect(isSessionDTO(validSessionDTO)).toBe(true);
    });

    it('应该拒绝 null', () => {
      expect(isSessionDTO(null)).toBe(false);
    });

    it('应该拒绝 undefined', () => {
      expect(isSessionDTO(undefined)).toBe(false);
    });

    it('应该拒绝非对象类型', () => {
      expect(isSessionDTO('string')).toBe(false);
      expect(isSessionDTO(123)).toBe(false);
      expect(isSessionDTO([])).toBe(false);
    });

    it('应该拒绝缺少必填字段的对象', () => {
      expect(isSessionDTO({})).toBe(false);
      expect(isSessionDTO({ id: 'test' })).toBe(false);
      expect(isSessionDTO({ id: 'test', projectID: 'proj' })).toBe(false);
    });

    it('应该拒绝字段类型错误的对象', () => {
      const invalidId = { ...validSessionDTO, id: 123 };
      expect(isSessionDTO(invalidId)).toBe(false);

      const invalidProjectID = { ...validSessionDTO, projectID: 123 };
      expect(isSessionDTO(invalidProjectID)).toBe(false);

      const invalidTitle = { ...validSessionDTO, title: 123 };
      expect(isSessionDTO(invalidTitle)).toBe(false);

      const invalidDirectory = { ...validSessionDTO, directory: 123 };
      expect(isSessionDTO(invalidDirectory)).toBe(false);
    });

    it('应该接受没有 parentID 的对象', () => {
      const noParentId = {
        id: 'ses_abc123',
        projectID: 'proj_001',
        title: '测试会话',
        directory: '/test/project',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'running' as SessionStatus,
      };
      expect(isSessionDTO(noParentId)).toBe(true);
    });

    it('应该拒绝类型错误的 parentID', () => {
      const invalidParentID = { ...validSessionDTO, parentID: 123 };
      expect(isSessionDTO(invalidParentID)).toBe(false);
    });

    it('应该拒绝非 Date 类型的 createdAt', () => {
      const invalidCreatedAt = { ...validSessionDTO, createdAt: '2025-01-01' };
      expect(isSessionDTO(invalidCreatedAt)).toBe(false);
    });

    it('应该拒绝非 Date 类型的 updatedAt', () => {
      const invalidUpdatedAt = { ...validSessionDTO, updatedAt: '2025-01-01' };
      expect(isSessionDTO(invalidUpdatedAt)).toBe(false);
    });

    it('应该拒绝无效的 status 值', () => {
      const invalidStatus = { ...validSessionDTO, status: 'invalid' };
      expect(isSessionDTO(invalidStatus)).toBe(false);
    });

    it('应该接受所有有效的 status 值', () => {
      const statuses: SessionStatus[] = ['running', 'waiting', 'completed', 'error'];
      
      for (const status of statuses) {
        const session = { ...validSessionDTO, status };
        expect(isSessionDTO(session)).toBe(true);
      }
    });
  });

  describe('sessionMetaToDTO 函数', () => {
    it('应该正确转换 SessionMeta 为 SessionDTO', () => {
      const meta = {
        id: 'ses_abc123',
        projectID: 'proj_001',
        parentID: 'ses_parent',
        title: '测试会话',
        directory: '/test/project',
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-01-02T10:00:00Z'),
        status: 'running' as SessionStatus,
      };

      const dto = sessionMetaToDTO(meta);

      expect(dto).toEqual(meta);
      expect(isSessionDTO(dto)).toBe(true);
    });

    it('应该正确处理没有 parentID 的情况', () => {
      const meta = {
        id: 'ses_abc123',
        projectID: 'proj_001',
        title: '测试会话',
        directory: '/test/project',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'completed' as SessionStatus,
      };

      const dto = sessionMetaToDTO(meta);

      expect(dto.parentID).toBeUndefined();
      expect(isSessionDTO(dto)).toBe(true);
    });
  });
});

describe('SessionSummary 类型', () => {
  describe('isSessionSummary 类型守卫', () => {
    const validSessionSummary: SessionSummary = {
      id: 'ses_abc123',
      title: '测试会话',
      status: 'running',
      updatedAt: new Date('2025-01-02T10:00:00Z'),
    };

    it('应该识别有效的 SessionSummary', () => {
      expect(isSessionSummary(validSessionSummary)).toBe(true);
    });

    it('应该拒绝 null', () => {
      expect(isSessionSummary(null)).toBe(false);
    });

    it('should reject undefined', () => {
      expect(isSessionSummary(undefined)).toBe(false);
    });

    it('应该拒绝非对象类型', () => {
      expect(isSessionSummary('string')).toBe(false);
      expect(isSessionSummary(123)).toBe(false);
    });

    it('应该拒绝缺少必填字段的对象', () => {
      expect(isSessionSummary({})).toBe(false);
      expect(isSessionSummary({ id: 'test' })).toBe(false);
    });

    it('应该拒绝字段类型错误的对象', () => {
      const invalidId = { ...validSessionSummary, id: 123 };
      expect(isSessionSummary(invalidId)).toBe(false);

      const invalidTitle = { ...validSessionSummary, title: 123 };
      expect(isSessionSummary(invalidTitle)).toBe(false);
    });

    it('应该拒绝无效的 status 值', () => {
      const invalidStatus = { ...validSessionSummary, status: 'invalid' };
      expect(isSessionSummary(invalidStatus)).toBe(false);
    });

    it('应该拒绝非 Date 类型的 updatedAt', () => {
      const invalidUpdatedAt = { ...validSessionSummary, updatedAt: '2025-01-01' };
      expect(isSessionSummary(invalidUpdatedAt)).toBe(false);
    });

    it('应该接受所有有效的 status 值', () => {
      const statuses: SessionStatus[] = ['running', 'waiting', 'completed', 'error'];
      
      for (const status of statuses) {
        const summary = { ...validSessionSummary, status };
        expect(isSessionSummary(summary)).toBe(true);
      }
    });
  });
});

describe('类型守卫的联合类型处理', () => {
  it('应该能正确识别混合格式的对象', () => {
    const mixedData = [
      {
        id: 'ses_001',
        projectID: 'proj_001',
        title: '会话1',
        directory: '/test',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'running' as SessionStatus,
      },
      {
        id: 'ses_002',
        title: '会话2',
        status: 'completed' as SessionStatus,
        updatedAt: new Date(),
      },
    ];

    expect(isSessionDTO(mixedData[0])).toBe(true);
    expect(isSessionSummary(mixedData[1])).toBe(true);
  });
});