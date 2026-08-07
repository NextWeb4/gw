import { describe, expect, it } from 'vitest';
import {
  createStarredBusinessRecordsSetting,
  normalizeStarredBusinessRecordRefs,
  parseStarredBusinessRecordsSetting,
  prunePurgedStarredBusinessRecords,
  STARRED_BUSINESS_RECORD_LIMIT,
  toggleStarredBusinessRecord,
  type StarredBusinessRecordRef,
} from './index.js';

const timestamps = {
  first: '2026-08-07T10:00:00.000Z',
  second: '2026-08-07T11:00:00.000Z',
};

describe('starred business record settings', () => {
  it('normalizes only canonical references, deduplicates by kind and id, and never mutates the source', () => {
    const source = [
      { kind: 'task', id: 'task-1', starredAt: timestamps.second, title: '不得保存的标题' },
      { kind: 'task', id: 'task-1', starredAt: timestamps.first },
      { kind: 'meeting', id: 'task-1', starredAt: timestamps.first },
      { kind: 'unknown', id: 'invalid-kind', starredAt: timestamps.first },
      { kind: 'document', id: ' ', starredAt: timestamps.first },
      { kind: 'seal', id: 'x'.repeat(181), starredAt: timestamps.first },
      { kind: 'material', id: 'material-1', starredAt: 'not-a-date' },
    ];

    expect(normalizeStarredBusinessRecordRefs(source)).toEqual([
      { kind: 'task', id: 'task-1', starredAt: timestamps.second },
      { kind: 'meeting', id: 'task-1', starredAt: timestamps.first },
    ]);
    expect(source[0]).toHaveProperty('title', '不得保存的标题');
  });

  it('adds newest references first, removes an existing reference, and reports the hard limit without eviction', () => {
    const first = toggleStarredBusinessRecord([], { kind: 'task', id: 'task-1' }, timestamps.first);
    expect(first).toEqual({
      items: [{ kind: 'task', id: 'task-1', starredAt: timestamps.first }],
      starred: true,
      limitReached: false,
    });

    const removed = toggleStarredBusinessRecord(first.items, { kind: 'task', id: 'task-1' }, timestamps.second);
    expect(removed).toEqual({ items: [], starred: false, limitReached: false });

    const full = Array.from({ length: STARRED_BUSINESS_RECORD_LIMIT }, (_, index): StarredBusinessRecordRef => ({
      kind: 'task', id: `task-${index}`, starredAt: timestamps.first,
    }));
    const limited = toggleStarredBusinessRecord(full, { kind: 'meeting', id: 'meeting-over-limit' }, timestamps.second);
    expect(limited).toEqual({ items: full, starred: false, limitReached: true });
    expect(full).toHaveLength(STARRED_BUSINESS_RECORD_LIMIT);
  });

  it('keeps trash or missing references for reversible restore but removes permanent tombstone references', () => {
    const refs: StarredBusinessRecordRef[] = [
      { kind: 'task', id: 'task-active', starredAt: timestamps.second },
      { kind: 'meeting', id: 'meeting-trash', starredAt: timestamps.first },
      { kind: 'document', id: 'document-purged', starredAt: timestamps.first },
    ];

    expect(prunePurgedStarredBusinessRecords(refs, new Set(['document:document-purged']))).toEqual(refs.slice(0, 2));
    expect(refs).toHaveLength(3);
  });

  it('parses a canonical setting while dropping unknown fields and rejects the wrong contract', () => {
    const setting = parseStarredBusinessRecordsSetting({
      type: 'starred-business-records',
      version: 1,
      items: [{ kind: 'research', id: 'research-1', starredAt: timestamps.first, remark: '不得保存的备注' }],
      updatedAt: timestamps.second,
      apiKey: '不得保存',
    });
    expect(setting).toEqual({
      type: 'starred-business-records',
      version: 1,
      items: [{ kind: 'research', id: 'research-1', starredAt: timestamps.first }],
      updatedAt: timestamps.second,
    });
    expect(parseStarredBusinessRecordsSetting({ type: 'starred-business-records', version: 2, items: [], updatedAt: timestamps.second })).toBeNull();
    expect(parseStarredBusinessRecordsSetting({ type: 'starred-business-records', version: 1, items: [], updatedAt: 'invalid' })).toBeNull();
    expect(createStarredBusinessRecordsSetting(setting?.items || [], timestamps.second)).toEqual(setting);

    const overLimit = Array.from({ length: STARRED_BUSINESS_RECORD_LIMIT + 1 }, (_, index) => ({
      kind: 'task' as const,
      id: `task-over-limit-${index}`,
      starredAt: timestamps.first,
    }));
    expect(parseStarredBusinessRecordsSetting({ type: 'starred-business-records', version: 1, items: overLimit, updatedAt: timestamps.second })).toBeNull();
    expect(() => createStarredBusinessRecordsSetting(overLimit, timestamps.second)).toThrow(/最多保留 12 条/);
  });
});
