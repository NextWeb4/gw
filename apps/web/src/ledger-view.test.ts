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
} from './ledger-view';

describe('ledger view derivation', () => {
  it('combines local query, structured filter and stable sorting without mutating task input', () => {
    const tasks: Task[] = [
      { ...sampleTasks[0], id: 'task-late', name: '治理复盘', deadline: '2026-08-12', status: 'progress' },
      { ...sampleTasks[1], id: 'task-early', name: '治理台账', deadline: '2026-08-02', status: 'progress' },
      { ...sampleTasks[1], id: 'task-done', name: '治理归档', deadline: '2026-08-01', status: 'done' },
    ];
    const originalOrder = tasks.map((task) => task.id);

    const visible = deriveLedgerRecords('tasks', tasks, {
      query: '治理',
      filter: 'status:progress',
      sort: 'deadline:asc',
    });

    expect(visible.map((task) => task.id)).toEqual(['task-early', 'task-late']);
    expect(tasks.map((task) => task.id)).toEqual(originalOrder);
    expect(visible).not.toBe(tasks);
  });

  it('keeps blank dates after real dates and preserves source order for ties', () => {
    const meetings: MeetingRecord[] = [
      { ...sampleMeetings[0], id: 'meeting-blank', meetingTime: '', subject: '待排会议' },
      { ...sampleMeetings[0], id: 'meeting-b', meetingTime: '2026-08-02T09:00', subject: '乙会议' },
      { ...sampleMeetings[0], id: 'meeting-a', meetingTime: '2026-08-02T09:00', subject: '甲会议' },
    ];

    expect(deriveLedgerRecords('meetings', meetings, { query: '', filter: 'all', sort: 'meetingTime:asc' }).map((meeting) => meeting.id))
      .toEqual(['meeting-b', 'meeting-a', 'meeting-blank']);
    expect(deriveLedgerRecords('meetings', meetings, { query: '', filter: 'time:missing', sort: 'default' }).map((meeting) => meeting.id))
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
    const visible = deriveLedgerRecords('materials', materials, { query: '', filter: 'movement:out', sort: 'handlerTime:desc' });
    const stock = calculateMaterialStock(materials);

    expect(visible.map((material) => material.id)).toEqual(['material-out']);
    expect(stock.get('A4 打印纸|70g / 500 张')).toBe(3);
    expect(getLedgerFilterOptions('materials', materials).map((option) => option.value)).toEqual(['all', 'movement:in', 'movement:out']);
  });

  it('creates independent session state for all six ledgers', () => {
    const state = createInitialLedgerViewStates();
    state.tasks.query = '只改任务';

    expect(state.meetings.query).toBe('');
    expect(Object.keys(state)).toEqual(['tasks', 'meetings', 'documents', 'researches', 'seals', 'materials']);
  });
});
