import { describe, expect, it } from 'vitest';
import { parseLocalSnapshot } from './index.js';

describe('local snapshot validation', () => {
  it('accepts supported records and reports malformed entries', () => {
    const result = parseLocalSnapshot({
      format: 'hxhwang-gw-local-v1',
      records: [
        { id: 'task_1', kind: 'task', payload: { id: 'task_1', name: '恢复任务' }, updatedAt: '2026-07-23T00:00:00.000Z' },
        { id: 'task_1', kind: 'attachment', payload: { id: 'task_1', name: '冲突附件' } },
        { id: 'task_1', kind: 'task', payload: { id: 'task_1', name: '重复任务' } },
        { id: 'secret_1', kind: 'secret', payload: {} },
        { id: 'bad_payload', kind: 'task', payload: null },
        null
      ]
    });
    expect(result.records).toEqual([{ id: 'task_1', kind: 'task', payload: { id: 'task_1', name: '恢复任务' }, updatedAt: '2026-07-23T00:00:00.000Z' }]);
    expect(result.warnings).toEqual(['跳过跨类型 ID 冲突：task_1（task/attachment）', '跳过重复记录 ID：task_1', '跳过未知类型记录：secret_1', '跳过无效 payload：bad_payload', '跳过非对象记录']);
  });

  it('rejects invalid formats and excessive record counts', () => {
    expect(() => parseLocalSnapshot({ format: 'unknown', records: [] })).toThrow(/不是有效/);
    expect(() => parseLocalSnapshot({ format: 'hxhwang-gw-local-v1', records: Array.from({ length: 50_001 }) })).toThrow(/50000/);
  });
});
