import { describe, expect, it } from 'vitest';
import { getVisibleRecordPosition } from './visible-record-navigation';

describe('getVisibleRecordPosition', () => {
  const records = [{ id: 'record-c' }, { id: 'record-a' }, { id: 'record-b' }];

  it('returns no position for an empty list or a selection outside the visible order', () => {
    expect(getVisibleRecordPosition([], 'record-a')).toBeNull();
    expect(getVisibleRecordPosition(records, '')).toBeNull();
    expect(getVisibleRecordPosition(records, 'record-missing')).toBeNull();
  });

  it('disables both directions for a single visible record', () => {
    expect(getVisibleRecordPosition([{ id: 'only' }], 'only')).toEqual({
      index: 0,
      total: 1,
      previousId: undefined,
      nextId: undefined,
    });
  });

  it('derives first, middle and last neighbors from the supplied visible order', () => {
    expect(getVisibleRecordPosition(records, 'record-c')).toEqual({ index: 0, total: 3, previousId: undefined, nextId: 'record-a' });
    expect(getVisibleRecordPosition(records, 'record-a')).toEqual({ index: 1, total: 3, previousId: 'record-c', nextId: 'record-b' });
    expect(getVisibleRecordPosition(records, 'record-b')).toEqual({ index: 2, total: 3, previousId: 'record-a', nextId: undefined });
  });

  it('does not mutate or reorder the current filtered and sorted input', () => {
    const before = records.map((record) => ({ ...record }));

    getVisibleRecordPosition(records, 'record-a');

    expect(records).toEqual(before);
  });
});
