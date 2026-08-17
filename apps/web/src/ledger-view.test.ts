import { describe, expect, it } from 'vitest';
import {
  calculateMaterialStock,
  sampleDocuments,
  sampleMaterials,
  sampleMeetings,
  sampleResearches,
  sampleSeals,
  sampleTasks,
  type MaterialRecord,
  type MeetingRecord,
  type Task,
} from '@hxhwang/domain';
import {
  createInitialLedgerViewStates,
  deriveLedgerRecords,
  getLedgerFilterOptions,
  LEDGER_SORT_OPTIONS,
  toggleLedgerPresenceFilter,
} from './ledger-view';

describe('ledger view derivation', () => {
  it('combines local query, structured filter and stable sorting without mutating task input', () => {
    const tasks: Task[] = [
      { ...sampleTasks[0], id: 'task-late', name: '治理复盘', deadline: '2026-08-12', status: 'progress' },
      { ...sampleTasks[1], id: 'task-early', name: '治理台账', deadline: '2026-08-02', status: 'progress' },
      { ...sampleTasks[1], id: 'task-done', name: '治理归档', deadline: '2026-08-01', status: 'done' },
      { ...sampleTasks[1], id: 'task-deleted', name: '治理已删除', category: '删除类目', deadline: '2026-08-01', status: 'progress', deletedAt: '2026-07-31T08:00:00.000Z' },
    ];
    const originalOrder = tasks.map((task) => task.id);

    const visible = deriveLedgerRecords('tasks', tasks, {
      query: '治理',
      filter: 'status:progress',
      sort: 'deadline:asc',
      date: 'all',
      attachments: 'all',
    });

    expect(visible.map((task) => task.id)).toEqual(['task-early', 'task-late']);
    expect(tasks.map((task) => task.id)).toEqual(originalOrder);
    expect(visible).not.toBe(tasks);
    expect(getLedgerFilterOptions('tasks', tasks).map((option) => option.value)).not.toContain('category:删除类目');
  });

  it('keeps blank dates after real dates and preserves source order for ties', () => {
    const meetings: MeetingRecord[] = [
      { ...sampleMeetings[0], id: 'meeting-blank', meetingTime: '', subject: '待排会议' },
      { ...sampleMeetings[0], id: 'meeting-b', meetingTime: '2026-08-02T09:00', subject: '乙会议' },
      { ...sampleMeetings[0], id: 'meeting-a', meetingTime: '2026-08-02T09:00', subject: '甲会议' },
    ];

    expect(deriveLedgerRecords('meetings', meetings, { query: '', filter: 'all', sort: 'meetingTime:asc', date: 'all', attachments: 'all' }).map((meeting) => meeting.id))
      .toEqual(['meeting-b', 'meeting-a', 'meeting-blank']);
    expect(deriveLedgerRecords('meetings', meetings, { query: '', filter: 'time:missing', sort: 'default', date: 'all', attachments: 'all' }).map((meeting) => meeting.id))
      .toEqual(['meeting-blank']);
  });

  it('offers module-specific filters and sort choices without duplicating dynamic values', () => {
    const tasks = [
      { ...sampleTasks[0], category: '重点项目' },
      { ...sampleTasks[1], category: '重点项目' },
      { ...sampleTasks[1], id: 'task-routine', category: '日常工作' },
    ];
    const taskFilters = getLedgerFilterOptions('tasks', tasks);

    expect(taskFilters.filter((option) => option.value === 'category:重点项目')).toHaveLength(1);
    expect(taskFilters.map((option) => option.label)).toEqual(expect.arrayContaining(['全部任务', '状态：进行中', '类目：重点项目']));
    expect(LEDGER_SORT_OPTIONS.documents.map((option) => option.value)).toEqual(expect.arrayContaining(['docDate:desc', 'title:asc']));
    expect(getLedgerFilterOptions('documents', sampleDocuments).map((option) => option.label)).toContain('类型：收文');
    expect(getLedgerFilterOptions('researches', sampleResearches).map((option) => option.label)).toContain('类型：外出调研');
    expect(getLedgerFilterOptions('seals', sampleSeals).map((option) => option.label)).toContain('类型：函');
  });

  it('filters material movement while stock remains derived from every source record', () => {
    const materials: MaterialRecord[] = [
      { ...sampleMaterials[0], id: 'material-in', quantity: 5, type: 'in' },
      { ...sampleMaterials[0], id: 'material-out', quantity: 2, type: 'out', handlerTime: '2026-07-25' },
    ];
    const visible = deriveLedgerRecords('materials', materials, { query: '', filter: 'movement:out', sort: 'handlerTime:desc', date: 'all', attachments: 'all' });
    const stock = calculateMaterialStock(materials);

    expect(visible.map((material) => material.id)).toEqual(['material-out']);
    expect(stock.get('A4 打印纸|70g / 500 张')).toBe(3);
    expect(getLedgerFilterOptions('materials', materials).map((option) => option.value)).toEqual(['all', 'movement:in', 'movement:out']);
  });

  it('creates independent session state for all six ledgers', () => {
    const state = createInitialLedgerViewStates();
    state.tasks.query = '只改任务';

    expect(state.meetings.query).toBe('');
    expect(state.tasks).toMatchObject({ date: 'all', attachments: 'all' });
    expect(state.meetings).toMatchObject({ date: 'all', attachments: 'all' });
    expect(Object.keys(state)).toEqual(['tasks', 'meetings', 'documents', 'researches', 'seals', 'materials']);
  });

  it('toggles one value per common filter dimension and returns to all', () => {
    expect(toggleLedgerPresenceFilter('all', 'present')).toBe('present');
    expect(toggleLedgerPresenceFilter('present', 'present')).toBe('all');
    expect(toggleLedgerPresenceFilter('present', 'missing')).toBe('missing');
    expect(toggleLedgerPresenceFilter('missing', 'missing')).toBe('all');
  });

  it('combines common date and attachment chips with the existing structured task filter without mutating input', () => {
    const tasks: Task[] = [
      { ...sampleTasks[0], id: 'task-match', status: 'progress', deadline: '2026-08-18', files: ['attachment-1'] },
      { ...sampleTasks[0], id: 'task-no-file', status: 'progress', deadline: '2026-08-18', files: [] },
      { ...sampleTasks[0], id: 'task-invalid-date', status: 'progress', deadline: '2026-02-30', files: ['attachment-2'] },
      { ...sampleTasks[0], id: 'task-invalid-year', status: 'progress', deadline: '200000-08-18', files: ['attachment-year'] },
      { ...sampleTasks[0], id: 'task-other-status', status: 'done', deadline: '2026-08-19', files: ['attachment-3'] },
    ];
    const original = tasks.map((task) => ({ id: task.id, files: [...task.files], deadline: task.deadline }));

    expect(deriveLedgerRecords('tasks', tasks, {
      query: '', filter: 'status:progress', sort: 'default', date: 'present', attachments: 'present',
    }).map((task) => task.id)).toEqual(['task-match']);
    expect(deriveLedgerRecords('tasks', tasks, {
      query: '', filter: 'status:progress', sort: 'default', date: 'missing', attachments: 'present',
    }).map((task) => task.id)).toEqual(['task-invalid-date', 'task-invalid-year']);
    expect(tasks.map((task) => ({ id: task.id, files: [...task.files], deadline: task.deadline }))).toEqual(original);
  });

  it('uses the fixed calendar date source for each of the six ledgers', () => {
    const common = { query: '', filter: 'all', sort: 'default', date: 'missing' as const, attachments: 'all' as const };
    const present = '2026-08-18';

    expect(deriveLedgerRecords('tasks', [
      { ...sampleTasks[0], id: 'task-present', deadline: present },
      { ...sampleTasks[0], id: 'task-missing', deadline: '' },
    ], common).map((record) => record.id)).toEqual(['task-missing']);
    expect(deriveLedgerRecords('meetings', [
      { ...sampleMeetings[0], id: 'meeting-present', meetingTime: `${present}T09:00` },
      { ...sampleMeetings[0], id: 'meeting-missing', meetingTime: '' },
    ], common).map((record) => record.id)).toEqual(['meeting-missing']);
    expect(deriveLedgerRecords('documents', [
      { ...sampleDocuments[0], id: 'document-present', docDate: present },
      { ...sampleDocuments[0], id: 'document-missing', docDate: '' },
    ], common).map((record) => record.id)).toEqual(['document-missing']);
    expect(deriveLedgerRecords('researches', [
      { ...sampleResearches[0], id: 'research-present', researchTime: present },
      { ...sampleResearches[0], id: 'research-missing', researchTime: '' },
    ], common).map((record) => record.id)).toEqual(['research-missing']);
    expect(deriveLedgerRecords('seals', [
      { ...sampleSeals[0], id: 'seal-present', sealTime: present },
      { ...sampleSeals[0], id: 'seal-missing', sealTime: '' },
    ], common).map((record) => record.id)).toEqual(['seal-missing']);
    expect(deriveLedgerRecords('materials', [
      { ...sampleMaterials[0], id: 'material-present', handlerTime: present },
      { ...sampleMaterials[0], id: 'material-missing', handlerTime: '' },
    ], common).map((record) => record.id)).toEqual(['material-missing']);
  });

  it('keeps the legacy meeting time filter aligned with strict date-chip validity', () => {
    const meetings = [
      { ...sampleMeetings[0], id: 'meeting-valid', meetingTime: '2026-08-18T09:00' },
      { ...sampleMeetings[0], id: 'meeting-invalid', meetingTime: '2026-02-30T09:00' },
      { ...sampleMeetings[0], id: 'meeting-empty', meetingTime: '' },
    ];
    const state = { query: '', sort: 'default', date: 'all' as const, attachments: 'all' as const };
    expect(deriveLedgerRecords('meetings', meetings, { ...state, filter: 'time:scheduled' }).map((record) => record.id)).toEqual(['meeting-valid']);
    expect(deriveLedgerRecords('meetings', meetings, { ...state, filter: 'time:missing' }).map((record) => record.id)).toEqual(['meeting-invalid', 'meeting-empty']);
  });
});
