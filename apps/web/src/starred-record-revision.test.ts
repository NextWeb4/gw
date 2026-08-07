import { describe, expect, it } from 'vitest';
import { StarredRecordRevisionGate } from './starred-record-revision';

describe('StarredRecordRevisionGate', () => {
  it('rejects a delayed reload snapshot after a user mutation', () => {
    const gate = new StarredRecordRevisionGate();
    const delayedReload = gate.beginReload();

    gate.markUserMutation();

    expect(gate.canApplyReload(delayedReload)).toBe(false);
    expect(gate.canApplyReload(gate.beginReload())).toBe(true);
  });
});
