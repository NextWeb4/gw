import { describe, expect, it } from 'vitest';
import {
  sampleDocuments,
  sampleMaterials,
  sampleMeetings,
  sampleResearches,
  sampleSeals,
  sampleTasks,
  type Task,
} from '@hxhwang/domain';
import {
  buildAgendaEvents,
  buildAgendaMonth,
  filterAgendaEvents,
  shiftAgendaMonth,
} from './agenda';

describe('local agenda derivation', () => {
  it('maps the six fixed business dates and excludes blank or invalid values without mutating inputs', () => {
    const tasks: Task[] = [
      { ...sampleTasks[0], id: 'task-valid', deadline: '2026-07-24' },
      { ...sampleTasks[1], id: 'task-blank', deadline: '' },
      { ...sampleTasks[1], id: 'task-invalid', deadline: '2026-02-30' },
      { ...sampleTasks[1], id: 'task-wide-year', deadline: '200026-07-24' },
    ];
    const originalTaskIds = tasks.map((task) => task.id);

    const events = buildAgendaEvents({
      tasks,
      meetings: sampleMeetings,
      documents: sampleDocuments,
      researches: sampleResearches,
      seals: sampleSeals,
      materials: sampleMaterials,
    });

    expect(events.map((event) => event.recordId)).toEqual([
      'doc_demo_1',
      'research_demo_1',
      'task-valid',
      'seal_demo_1',
      'material_demo_1',
      'meeting_demo_1',
    ]);
    expect(events.find((event) => event.recordId === 'meeting_demo_1')).toMatchObject({
      kind: 'meetings',
      date: '2026-07-24',
      time: '09:00',
      title: '全省重点工作协调推进会',
    });
    expect(events.find((event) => event.recordId === 'task-valid')).toMatchObject({
      kind: 'tasks',
      date: '2026-07-24',
      time: '',
    });
    expect(tasks.map((task) => task.id)).toEqual(originalTaskIds);
  });

  it('builds a Monday-first 42-day month grid and counts only the filtered events', () => {
    const events = buildAgendaEvents({
      tasks: [{ ...sampleTasks[0], deadline: '2026-08-01' }],
      meetings: [{ ...sampleMeetings[0], meetingTime: '2026-08-01T09:00' }],
      documents: [],
      researches: [],
      seals: [],
      materials: [],
    });
    const taskEvents = filterAgendaEvents(events, 'tasks');
    const days = buildAgendaMonth('2026-08', taskEvents);

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({ date: '2026-07-27', inCurrentMonth: false, eventCount: 0 });
    expect(days.at(-1)).toMatchObject({ date: '2026-09-06', inCurrentMonth: false, eventCount: 0 });
    expect(days.find((day) => day.date === '2026-08-01')).toMatchObject({ inCurrentMonth: true, eventCount: 1 });
    expect(events).toHaveLength(2);
  });

  it('keeps deterministic same-day order and shifts months without UTC date drift', () => {
    const events = buildAgendaEvents({
      tasks: [{ ...sampleTasks[0], deadline: '2026-07-24' }],
      meetings: [{ ...sampleMeetings[0], meetingTime: '2026-07-24T09:00' }],
      documents: [{ ...sampleDocuments[0], docDate: '2026-07-24' }],
      researches: [],
      seals: [],
      materials: [],
    });

    expect(events.map((event) => event.kind)).toEqual(['tasks', 'documents', 'meetings']);
    expect(shiftAgendaMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftAgendaMonth('2026-12', 1)).toBe('2027-01');
  });
});
