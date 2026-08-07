import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocumentRevision, createStarredBusinessRecordsSetting, STARRED_BUSINESS_RECORDS_SETTING_ID, type DocumentRevision, type Draft, type WeeklyReport } from '@hxhwang/domain';

vi.mock('rxdb/plugins/storage-dexie', async () => {
  const { getRxStorageMemory } = await import('rxdb/plugins/storage-memory');
  return { getRxStorageDexie: getRxStorageMemory };
});

import {
  attachmentIdsFromPayload, clearAllData, exportLocalSnapshot, getRecordOfKind, importLocalSnapshot, listRecords, LOCAL_SCHEMA_VERSION,
  parseLocalSnapshot, putRecord, removeRecordOfKind, snapshotPayloadForRecord, shouldRefreshDemoRecord
} from './index.js';

describe('local snapshot validation', () => {
  it('uses an explicit schema migration version for editable legacy business modules', () => {
    expect(LOCAL_SCHEMA_VERSION).toBe(2);
  });

  it('refreshes untouched legacy demo rows without overwriting user edits', () => {
    expect(shouldRefreshDemoRecord('doc_demo_1')).toBe(true);
    expect(shouldRefreshDemoRecord('doc_demo_1', { updatedAt: '2026-07-21T08:00:00.000Z' })).toBe(true);
    expect(shouldRefreshDemoRecord('doc_demo_1', { updatedAt: '2026-07-27T10:30:00.000Z' })).toBe(false);
    expect(shouldRefreshDemoRecord('user_document', { updatedAt: '2026-07-21T08:00:00.000Z' })).toBe(false);
  });

  it('accepts supported records and reports malformed entries', () => {
    const result = parseLocalSnapshot({
      format: 'hxhwang-gw-local-v1',
      records: [
        { id: 'task_1', kind: 'task', payload: { id: 'task_1', name: '恢复任务' }, updatedAt: '2026-07-23T00:00:00.000Z' },
        { id: 'weekly_1', kind: 'weekly', payload: { id: 'weekly_1', title: '恢复周报' }, updatedAt: '2026-07-23T00:00:00.000Z' },
        { id: 'meeting_1', kind: 'meeting', payload: { id: 'meeting_1', subject: '恢复会议' }, updatedAt: '2026-07-23T00:00:00.000Z' },
        { id: 'research_1', kind: 'research', payload: { id: 'research_1', subject: '恢复外出活动' }, updatedAt: '2026-07-23T00:00:00.000Z' },
        { id: 'seal_1', kind: 'seal', payload: { id: 'seal_1', docName: '恢复用章记录' }, updatedAt: '2026-07-23T00:00:00.000Z' },
        { id: 'material_1', kind: 'material', payload: { id: 'material_1', materialName: '恢复物资' }, updatedAt: '2026-07-23T00:00:00.000Z' },
        { id: 'task_1', kind: 'attachment', payload: { id: 'task_1', name: '冲突附件' } },
        { id: 'task_1', kind: 'task', payload: { id: 'task_1', name: '重复任务' } },
        { id: 'secret_1', kind: 'secret', payload: {} },
        { id: 'bad_payload', kind: 'task', payload: null },
        null
      ]
    });
    expect(result.records).toEqual([
      { id: 'task_1', kind: 'task', payload: { id: 'task_1', name: '恢复任务' }, updatedAt: '2026-07-23T00:00:00.000Z' },
      { id: 'weekly_1', kind: 'weekly', payload: { id: 'weekly_1', title: '恢复周报' }, updatedAt: '2026-07-23T00:00:00.000Z' },
      { id: 'meeting_1', kind: 'meeting', payload: { id: 'meeting_1', subject: '恢复会议' }, updatedAt: '2026-07-23T00:00:00.000Z' },
      { id: 'research_1', kind: 'research', payload: { id: 'research_1', subject: '恢复外出活动' }, updatedAt: '2026-07-23T00:00:00.000Z' },
      { id: 'seal_1', kind: 'seal', payload: { id: 'seal_1', docName: '恢复用章记录' }, updatedAt: '2026-07-23T00:00:00.000Z' },
      { id: 'material_1', kind: 'material', payload: { id: 'material_1', materialName: '恢复物资' }, updatedAt: '2026-07-23T00:00:00.000Z' }
    ]);
    expect(result.warnings).toEqual(['跳过跨类型 ID 冲突：task_1（task/attachment）', '跳过重复记录 ID：task_1', '跳过未知类型记录：secret_1', '跳过无效 payload：bad_payload', '跳过非对象记录']);
  });

  it('rejects invalid formats and excessive record counts', () => {
    expect(() => parseLocalSnapshot({ format: 'unknown', records: [] })).toThrow(/不是有效/);
    expect(() => parseLocalSnapshot({ format: 'hxhwang-gw-local-v1', records: Array.from({ length: 50_001 }) })).toThrow(/50000/);
  });

  it('collects current and nested attachment references without trusting legacy payload fields', () => {
    expect(attachmentIdsFromPayload({
      files: ['attachment_main', 'attachment_main'],
      partnerStatus: [{ name: '甲单位', files: ['attachment_partner'] }],
      stages: [{ partnerStatus: [{ files: ['attachment_stage'] }] }],
      legacyPayload: { files: ['attachment_legacy_only'] }
    })).toEqual(['attachment_main', 'attachment_partner', 'attachment_stage']);
  });

  it('removes permanently deleted business content from exported and imported snapshots', () => {
    const unsafePurgedPayload = {
      id: 'task-purged',
      name: '不应保留的任务正文',
      files: ['attachment-purged'],
      updatedAt: '2026-07-31T10:00:00.000Z',
      deletedAt: '2026-07-31T09:00:00.000Z',
      purgedAt: '2026-07-31T10:00:00.000Z'
    };

    expect(snapshotPayloadForRecord('task', unsafePurgedPayload)).toEqual({
      id: 'task-purged',
      updatedAt: '2026-07-31T10:00:00.000Z',
      deletedAt: '2026-07-31T09:00:00.000Z',
      purgedAt: '2026-07-31T10:00:00.000Z'
    });
    const parsed = parseLocalSnapshot({
      format: 'hxhwang-gw-local-v1',
      records: [{ id: 'task-purged', kind: 'task', payload: unsafePurgedPayload, updatedAt: unsafePurgedPayload.updatedAt }]
    });
    expect(parsed.records[0].payload).toEqual(snapshotPayloadForRecord('task', unsafePurgedPayload));
    expect(attachmentIdsFromPayload(parsed.records[0].payload)).toEqual([]);
  });

  it('preserves document-owned task links in snapshots without creating a second relation record', () => {
    const documentPayload = {
      id: 'doc-linked',
      title: '关联测试文件',
      relatedTaskIds: ['task-2', 'task-1'],
      updatedAt: '2026-08-01T04:00:00.000Z'
    };
    expect(snapshotPayloadForRecord('document', documentPayload)).toEqual(documentPayload);
    const parsed = parseLocalSnapshot({
      format: 'hxhwang-gw-local-v1',
      records: [{ id: documentPayload.id, kind: 'document', payload: documentPayload, updatedAt: documentPayload.updatedAt }]
    });
    expect(parsed.records).toEqual([{ id: documentPayload.id, kind: 'document', payload: documentPayload, updatedAt: documentPayload.updatedAt }]);
  });

  it('preserves a renamed custom template under its stable setting record id', () => {
    const payload = {
      type: 'custom-writing-template',
      id: 'custom-template-stable',
      name: '已重命名格式',
      custom: true,
      contentHtml: '<p>原正文</p>',
      contentText: '原正文',
      outline: ['原结构'],
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-04T05:00:00.000Z',
    };
    const record = { id: `custom-template:${payload.id}`, kind: 'setting', payload, updatedAt: payload.updatedAt };
    const parsed = parseLocalSnapshot({ format: 'hxhwang-gw-local-v1', records: [record] });
    expect(parsed.records).toEqual([record]);
    expect(snapshotPayloadForRecord('setting', payload)).toBe(payload);
  });

  it('skips custom templates whose outer setting id does not match the payload id', () => {
    const payload = {
      type: 'custom-writing-template',
      id: 'custom-template-target',
      name: '身份错配格式',
      custom: true,
      contentHtml: '<p>正文</p>',
      contentText: '正文',
      outline: ['结构'],
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-04T05:00:00.000Z',
    };
    const parsed = parseLocalSnapshot({
      format: 'hxhwang-gw-local-v1',
      records: [{ id: 'unrelated-setting-id', kind: 'setting', payload, updatedAt: payload.updatedAt }],
    });
    expect(parsed.records).toEqual([]);
    expect(parsed.warnings).toEqual(['跳过自定义格式身份不匹配：unrelated-setting-id']);
  });

  it('canonicalizes starred-record snapshots to reference-only data and rejects the wrong outer identity', () => {
    const updatedAt = '2026-08-07T12:00:00.000Z';
    const parsed = parseLocalSnapshot({
      format: 'hxhwang-gw-local-v1',
      records: [{
        id: STARRED_BUSINESS_RECORDS_SETTING_ID,
        kind: 'setting',
        payload: {
          type: 'starred-business-records', version: 1, updatedAt,
          items: [
            { kind: 'task', id: 'task-1', starredAt: updatedAt, title: '不得进入快照' },
            { kind: 'task', id: 'task-1', starredAt: updatedAt },
            { kind: 'unknown', id: 'invalid', starredAt: updatedAt },
          ],
          apiKey: '不得进入快照',
        },
        updatedAt,
      }],
    });

    expect(parsed.records).toEqual([{
      id: STARRED_BUSINESS_RECORDS_SETTING_ID,
      kind: 'setting',
      payload: {
        type: 'starred-business-records', version: 1, updatedAt,
        items: [{ kind: 'task', id: 'task-1', starredAt: updatedAt }],
      },
      updatedAt,
    }]);
    expect(JSON.stringify(parsed.records)).not.toMatch(/不得进入快照|apiKey|title/);

    const invalid = parseLocalSnapshot({
      format: 'hxhwang-gw-local-v1',
      records: [{
        id: 'unrelated-setting-id', kind: 'setting',
        payload: { type: 'starred-business-records', version: 1, items: [], updatedAt }, updatedAt,
      }],
    });
    expect(invalid.records).toEqual([]);
    expect(invalid.warnings).toEqual(['跳过星标记录设置身份不匹配：unrelated-setting-id']);
  });

  it('fails closed instead of exporting a malformed starred-record payload', () => {
    expect(() => snapshotPayloadForRecord('setting', {
      type: 'starred-business-records', version: 2, items: [], updatedAt: 'invalid', apiKey: '不得导出',
    })).toThrow(/星标记录设置无效.*拒绝导出/);
  });

  it('skips draft and weekly records whose outer ids do not match their payload ids', () => {
    const parsed = parseLocalSnapshot({
      format: 'hxhwang-gw-local-v1',
      records: [
        { id: 'draft_outer', kind: 'draft', payload: { id: 'draft_inner' } },
        { id: 'weekly_outer', kind: 'weekly', payload: { id: 'weekly_inner' } },
      ],
    });
    expect(parsed.records).toEqual([]);
    expect(parsed.warnings).toEqual(['跳过主草稿身份不匹配：draft_outer', '跳过周报身份不匹配：weekly_outer']);
  });

  it('accepts only canonical document revision setting identities and targets', () => {
    const draft: Draft = { id: 'draft_main', title: '历史文稿', documentType: '报告', contentHtml: '<p>正文</p>', contentText: '正文', templateId: 'work-report', version: 2, updatedAt: '2026-08-05T01:00:00.000Z' };
    const revision = createDocumentRevision('draft', draft, 'document-revision_valid', draft.updatedAt);
    const valid = { id: revision.id, kind: 'setting', payload: revision, updatedAt: revision.createdAt };
    expect(parseLocalSnapshot({ format: 'hxhwang-gw-local-v1', records: [valid] }).records).toEqual([valid]);

    const invalid = parseLocalSnapshot({
      format: 'hxhwang-gw-local-v1',
      records: [
        { ...valid, id: 'document-revision_wrong-outer' },
        { ...valid, id: 'document-revision_wrong-payload', payload: { ...revision, id: 'document-revision_wrong-payload', targetId: 'other-draft' } },
        { ...valid, id: 'document-revision_wrong-version', payload: { ...revision, id: 'document-revision_wrong-version', version: 99 } },
        { ...valid, id: 'document-revision_wrong-kind', payload: { ...revision, id: 'document-revision_wrong-kind', targetKind: 'weekly' } },
        { ...valid, id: 'document-revision_wrong-snapshot-id', payload: { ...revision, id: 'document-revision_wrong-snapshot-id', snapshot: { ...revision.snapshot, id: 'other-draft' } } },
        { ...valid, id: 'document-revision_wrong-snapshot-version', payload: { ...revision, id: 'document-revision_wrong-snapshot-version', snapshot: { ...revision.snapshot, version: 99 } } },
        { ...valid, id: 'document-revision_wrong-updated-at', payload: { ...revision, id: 'document-revision_wrong-updated-at', snapshot: { ...revision.snapshot, updatedAt: '2026-08-05T02:00:00.000Z' } } },
        { ...valid, id: 'document-revision_wrong-outer-updated-at', payload: { ...revision, id: 'document-revision_wrong-outer-updated-at' }, updatedAt: '2026-08-05T02:00:00.000Z' },
        { ...valid, id: 'document-revision_missing-type', payload: { id: 'document-revision_missing-type' } },
      ],
    });
    expect(invalid.records).toEqual([]);
    expect(invalid.warnings).toEqual([
      '跳过文稿历史身份不匹配：document-revision_wrong-outer',
      '跳过文稿历史身份不匹配：document-revision_wrong-payload',
      '跳过文稿历史身份不匹配：document-revision_wrong-version',
      '跳过文稿历史身份不匹配：document-revision_wrong-kind',
      '跳过文稿历史身份不匹配：document-revision_wrong-snapshot-id',
      '跳过文稿历史身份不匹配：document-revision_wrong-snapshot-version',
      '跳过文稿历史身份不匹配：document-revision_wrong-updated-at',
      '跳过文稿历史身份不匹配：document-revision_wrong-outer-updated-at',
      '跳过文稿历史身份不匹配：document-revision_missing-type',
    ]);
  });
});

describe('kind-safe local persistence and snapshot restore', () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it('serializes writes before checking cross-kind identity and exposes kind-safe reads and deletes', async () => {
    const [taskWrite, attachmentWrite] = await Promise.allSettled([
      putRecord('task', 'shared-record-id', { id: 'shared-record-id', name: '先写入任务' }),
      putRecord('attachment', 'shared-record-id', { id: 'shared-record-id', name: '不得覆盖的附件' }),
    ]);
    expect(taskWrite.status).toBe('fulfilled');
    expect(attachmentWrite.status).toBe('rejected');
    expect(await getRecordOfKind<Record<string, unknown>>('task', 'shared-record-id')).toMatchObject({ name: '先写入任务' });
    await expect(getRecordOfKind('attachment', 'shared-record-id')).rejects.toThrow(/拒绝按 attachment 类型读取/);
    await expect(removeRecordOfKind('attachment', 'shared-record-id')).rejects.toThrow(/拒绝按 attachment 类型删除/);
    expect(await getRecordOfKind<Record<string, unknown>>('task', 'shared-record-id')).toMatchObject({ name: '先写入任务' });
  });

  it('rejects direct draft and revision identity mismatches', async () => {
    await expect(putRecord('draft', 'draft_outer', { id: 'draft_inner' })).rejects.toThrow(/主草稿身份不匹配/);
    await expect(putRecord('setting', 'document-revision_fake', { id: 'document-revision_fake' })).rejects.toThrow(/文稿历史身份不匹配/);
    expect(await getRecordOfKind('draft', 'draft_outer')).toBeUndefined();
    expect(await getRecordOfKind('setting', 'document-revision_fake')).toBeUndefined();
  });

  it('canonicalizes direct starred-record writes and rejects an incorrect setting identity', async () => {
    const updatedAt = '2026-08-07T12:30:00.000Z';
    await putRecord('setting', STARRED_BUSINESS_RECORDS_SETTING_ID, {
      type: 'starred-business-records',
      version: 1,
      items: [{ kind: 'seal', id: 'seal-direct', starredAt: updatedAt, title: '不得持久化' }],
      updatedAt,
      apiKey: '不得持久化',
    });

    expect(await getRecordOfKind('setting', STARRED_BUSINESS_RECORDS_SETTING_ID)).toEqual({
      type: 'starred-business-records',
      version: 1,
      items: [{ kind: 'seal', id: 'seal-direct', starredAt: updatedAt }],
      updatedAt,
    });
    await expect(putRecord('setting', 'wrong-starred-setting-id', {
      type: 'starred-business-records', version: 1, items: [], updatedAt,
    })).rejects.toThrow(/星标记录设置身份不匹配/);
    expect(await getRecordOfKind('setting', 'wrong-starred-setting-id')).toBeUndefined();
  });

  it('preflights every existing id conflict before writing any snapshot record', async () => {
    await putRecord('attachment', 'occupied-id', { id: 'occupied-id', name: '原附件' });
    const restore = importLocalSnapshot({
      format: 'hxhwang-gw-local-v1',
      records: [
        { id: 'new-task', kind: 'task', payload: { id: 'new-task', name: '不得部分导入' } },
        { id: 'occupied-id', kind: 'task', payload: { id: 'occupied-id', name: '冲突任务' } },
      ],
    });
    await expect(restore).rejects.toThrow(/occupied-id.*attachment.*task/);
    expect(await getRecordOfKind('task', 'new-task')).toBeUndefined();
    expect(await getRecordOfKind<Record<string, unknown>>('attachment', 'occupied-id')).toMatchObject({ name: '原附件' });
  });

  it('prunes imported revision settings to the shared domain retention limits', async () => {
    const records = Array.from({ length: 21 }, (_, index) => {
      const day = String(index + 1).padStart(2, '0');
      const updatedAt = `2026-08-${day}T01:00:00.000Z`;
      const draft: Draft = {
        id: 'draft_main', title: `版本 ${index + 1}`, documentType: '报告', contentHtml: `<p>正文 ${index + 1}</p>`, contentText: `正文 ${index + 1}`,
        templateId: 'work-report', version: index + 1, updatedAt,
      };
      const revision = createDocumentRevision('draft', draft, `document-revision_import-${day}`, updatedAt);
      return { id: revision.id, kind: 'setting', payload: revision, updatedAt };
    });
    const restored = await importLocalSnapshot({ format: 'hxhwang-gw-local-v1', records });
    const revisions = await listRecords<DocumentRevision>('setting');
    expect(restored.imported).toBe(21);
    expect(restored.warnings).toContain('已按本机版本历史上限裁剪 1 条最旧记录');
    expect(revisions.map((revision) => revision.version).sort((left, right) => left - right)).toEqual(Array.from({ length: 20 }, (_, index) => index + 2));
    expect(await getRecordOfKind('setting', 'document-revision_import-01')).toBeUndefined();
  });

  it('accepts canonical weekly revision records through the same persistence path', async () => {
    const weekly: WeeklyReport = {
      id: 'weekly-local', title: '周报历史', startDate: '2026-08-03', endDate: '2026-08-09', contentText: '周报正文',
      taskIds: [], documentIds: [], version: 1, createdAt: '2026-08-05T00:00:00.000Z', updatedAt: '2026-08-05T01:00:00.000Z',
    };
    const revision = createDocumentRevision('weekly', weekly, 'document-revision_weekly-local', weekly.updatedAt);
    await putRecord('setting', revision.id, revision);
    expect(await getRecordOfKind<DocumentRevision>('setting', revision.id)).toEqual(revision);
  });

  it('waits for a queued starred-record write before reading the export snapshot', async () => {
    const updatedAt = '2026-08-07T13:00:00.000Z';
    const setting = createStarredBusinessRecordsSetting([{ kind: 'task', id: 'task-export-race', starredAt: updatedAt }], updatedAt);
    const write = putRecord('setting', STARRED_BUSINESS_RECORDS_SETTING_ID, setting);

    const snapshot = await exportLocalSnapshot();
    await write;

    expect(snapshot.records).toContainEqual({
      id: STARRED_BUSINESS_RECORDS_SETTING_ID,
      kind: 'setting',
      payload: setting,
      updatedAt,
    });
  });
});
