import { describe, expect, it } from 'vitest';
import {
  createRecordVisitHistory,
  jumpRecordVisitHistory,
  moveRecordVisitHistory,
  pruneRecordVisitHistory,
  recordVisitHistoryNavigation,
  rememberRecordVisit,
  RECORD_VISIT_HISTORY_LIMIT,
  type RecordVisit,
  type RecordVisitHistory,
} from './record-visit-history';

type Tab = 'tasks' | 'meetings' | 'documents';
const visit = (tab: Tab, id: string): RecordVisit<Tab> => ({ tab, id });

describe('session record visit history', () => {
  it('records explicit visits, ignores consecutive duplicates and remains immutable', () => {
    const empty = createRecordVisitHistory<Tab>();
    const first = rememberRecordVisit(empty, visit('tasks', 'task-1'));
    const duplicate = rememberRecordVisit(first, visit('tasks', 'task-1'));
    const second = rememberRecordVisit(duplicate, visit('documents', 'document-1'));

    expect(empty).toEqual({ entries: [], cursor: -1 });
    expect(first).toEqual({ entries: [visit('tasks', 'task-1')], cursor: 0 });
    expect(duplicate).toEqual(first);
    expect(second).toEqual({ entries: [visit('tasks', 'task-1'), visit('documents', 'document-1')], cursor: 1 });
    expect(first.entries).toEqual([visit('tasks', 'task-1')]);
  });

  it('moves through back and forward boundaries without recording navigation again', () => {
    let history = createRecordVisitHistory<Tab>();
    history = rememberRecordVisit(history, visit('tasks', 'task-1'));
    history = rememberRecordVisit(history, visit('documents', 'document-1'));
    history = rememberRecordVisit(history, visit('meetings', 'meeting-1'));

    expect(recordVisitHistoryNavigation(history)).toEqual({
      previous: visit('documents', 'document-1'),
      next: undefined,
      position: 3,
      total: 3,
    });

    const back = moveRecordVisitHistory(history, 'back');
    expect(back.target).toEqual(visit('documents', 'document-1'));
    expect(back.history).toEqual({ entries: history.entries, cursor: 1 });
    const first = moveRecordVisitHistory(back.history, 'back');
    expect(first.target).toEqual(visit('tasks', 'task-1'));
    expect(moveRecordVisitHistory(first.history, 'back')).toEqual({ history: first.history, target: undefined });

    const forward = moveRecordVisitHistory(first.history, 'forward');
    expect(forward.target).toEqual(visit('documents', 'document-1'));
    expect(forward.history.cursor).toBe(1);
  });

  it('truncates the forward branch after a new visit and keeps repeated non-consecutive visits', () => {
    let history = createRecordVisitHistory<Tab>();
    history = rememberRecordVisit(history, visit('tasks', 'task-1'));
    history = rememberRecordVisit(history, visit('documents', 'document-1'));
    history = rememberRecordVisit(history, visit('meetings', 'meeting-1'));
    history = moveRecordVisitHistory(history, 'back').history;
    const duplicateCurrent = rememberRecordVisit(history, visit('documents', 'document-1'));
    expect(duplicateCurrent).toEqual(history);
    expect(recordVisitHistoryNavigation(duplicateCurrent).next).toEqual(visit('meetings', 'meeting-1'));
    history = rememberRecordVisit(history, visit('tasks', 'task-1'));

    expect(history).toEqual({
      entries: [visit('tasks', 'task-1'), visit('documents', 'document-1'), visit('tasks', 'task-1')],
      cursor: 2,
    });
    expect(recordVisitHistoryNavigation(history).next).toBeUndefined();
  });

  it('jumps to an existing entry without changing the stack', () => {
    let history = createRecordVisitHistory<Tab>();
    history = rememberRecordVisit(history, visit('tasks', 'task-1'));
    history = rememberRecordVisit(history, visit('documents', 'document-1'));
    history = rememberRecordVisit(history, visit('meetings', 'meeting-1'));

    const jumped = jumpRecordVisitHistory(history, visit('documents', 'document-1'));
    expect(jumped).toEqual({ history: { entries: history.entries, cursor: 1 }, target: visit('documents', 'document-1') });
    expect(jumped.history.entries).toEqual(history.entries);
  });

  it('ignores a jump target that is no longer in the session stack', () => {
    const history = { entries: [visit('tasks', 'task-1')], cursor: 0 } satisfies RecordVisitHistory<Tab>;
    expect(jumpRecordVisitHistory(history, visit('meetings', 'meeting-1'))).toEqual({ history, target: undefined });
  });

  it('enforces the shared limit and prunes inactive targets while keeping a usable cursor', () => {
    let history = createRecordVisitHistory<Tab>();
    for (let index = 0; index < RECORD_VISIT_HISTORY_LIMIT + 3; index += 1) {
      history = rememberRecordVisit(history, visit('tasks', `task-${index}`));
    }
    expect(history.entries).toHaveLength(RECORD_VISIT_HISTORY_LIMIT);
    expect(history.entries[0]).toEqual(visit('tasks', 'task-3'));
    expect(history.cursor).toBe(RECORD_VISIT_HISTORY_LIMIT - 1);

    history = moveRecordVisitHistory(history, 'back').history;
    const current = history.entries[history.cursor];
    const removedBefore = history.entries[0];
    const removedAfter = history.entries.at(-1)!;
    const active = new Set(history.entries
      .filter((entry) => entry !== removedBefore && entry !== removedAfter && entry !== current)
      .map((entry) => `${entry.tab}:${entry.id}`));
    const pruned = pruneRecordVisitHistory(history, active);

    expect(pruned.entries).not.toContainEqual(removedBefore);
    expect(pruned.entries).not.toContainEqual(current);
    expect(pruned.entries).not.toContainEqual(removedAfter);
    expect(pruned.cursor).toBe(pruned.entries.length - 1);
    expect(history.entries).toHaveLength(RECORD_VISIT_HISTORY_LIMIT);
  });

  it('moves the cursor to the nearest surviving visit when the current target disappears', () => {
    let history = createRecordVisitHistory<Tab>();
    history = rememberRecordVisit(history, visit('tasks', 'task-1'));
    history = rememberRecordVisit(history, visit('documents', 'document-1'));
    history = rememberRecordVisit(history, visit('meetings', 'meeting-1'));
    const current = moveRecordVisitHistory(history, 'back').history;
    const active = new Set(['tasks:task-1', 'meetings:meeting-1']);

    const pruned = pruneRecordVisitHistory(current, active);

    expect(pruned).toEqual({
      entries: [visit('tasks', 'task-1'), visit('meetings', 'meeting-1')],
      cursor: 0,
    });
    expect(pruned.entries[pruned.cursor]).toEqual(visit('tasks', 'task-1'));
    expect(recordVisitHistoryNavigation(pruned).next).toEqual(visit('meetings', 'meeting-1'));
  });
});
