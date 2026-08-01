import { describe, expect, it } from 'vitest';
import { pruneRecentRecords, RECENT_RECORD_LIMIT, rememberRecentRecord, type RecentRecordRef } from './recent-records';

type BusinessTab = 'tasks' | 'meetings' | 'documents' | 'researches' | 'seals' | 'materials';

describe('rememberRecentRecord', () => {
  it('keeps the latest unique record first without mutating the previous list', () => {
    const previous: RecentRecordRef<BusinessTab>[] = [
      { tab: 'tasks', id: 'task-1' },
      { tab: 'meetings', id: 'meeting-1' },
      { tab: 'documents', id: 'document-1' },
    ];

    const next = rememberRecentRecord(previous, { tab: 'meetings', id: 'meeting-1' });

    expect(next).toEqual([
      { tab: 'meetings', id: 'meeting-1' },
      { tab: 'tasks', id: 'task-1' },
      { tab: 'documents', id: 'document-1' },
    ]);
    expect(previous).toEqual([
      { tab: 'tasks', id: 'task-1' },
      { tab: 'meetings', id: 'meeting-1' },
      { tab: 'documents', id: 'document-1' },
    ]);
  });

  it('caps the session list while treating the same id in different ledgers as distinct', () => {
    const previous: RecentRecordRef<BusinessTab>[] = [
      { tab: 'tasks', id: 'shared' },
      { tab: 'meetings', id: 'shared' },
      { tab: 'documents', id: 'document-1' },
      { tab: 'researches', id: 'research-1' },
      { tab: 'seals', id: 'seal-1' },
      { tab: 'materials', id: 'material-1' },
    ];

    const next = rememberRecentRecord(previous, { tab: 'tasks', id: 'task-2' });

    expect(next).toHaveLength(RECENT_RECORD_LIMIT);
    expect(next[0]).toEqual({ tab: 'tasks', id: 'task-2' });
    expect(next).toContainEqual({ tab: 'tasks', id: 'shared' });
    expect(next).toContainEqual({ tab: 'meetings', id: 'shared' });
    expect(next).not.toContainEqual({ tab: 'materials', id: 'material-1' });
  });

  it('removes inactive references permanently without changing the source list', () => {
    const previous: RecentRecordRef<BusinessTab>[] = [
      { tab: 'tasks', id: 'task-active' },
      { tab: 'meetings', id: 'meeting-deleted' },
    ];

    const next = pruneRecentRecords(previous, new Set(['tasks:task-active']));

    expect(next).toEqual([{ tab: 'tasks', id: 'task-active' }]);
    expect(previous).toHaveLength(2);
  });
});
