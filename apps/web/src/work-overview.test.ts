import { describe, expect, it } from 'vitest';
import { sampleDocuments, sampleMaterials, sampleMeetings, sampleResearches, sampleSeals, sampleTasks } from '@hxhwang/domain';
import { buildWorkOverview } from './work-overview';

describe('local work overview derivation', () => {
  it('keeps overdue tasks actionable while separating today, upcoming and unscheduled records', () => {
    const overview = buildWorkOverview({
      tasks: [
        { ...sampleTasks[0], id: 'task-overdue', deadline: '2026-07-25', status: 'progress' },
        { ...sampleTasks[0], id: 'task-today', deadline: '2026-07-26', status: 'pending' },
        { ...sampleTasks[0], id: 'task-boundary', deadline: '2026-08-02', status: 'pending' },
        { ...sampleTasks[0], id: 'task-outside', deadline: '2026-08-03', status: 'pending' },
        { ...sampleTasks[0], id: 'task-done', deadline: '2026-07-26', status: 'done' },
        { ...sampleTasks[0], id: 'task-unscheduled', deadline: '', status: 'pending' },
        { ...sampleTasks[0], id: 'task-invalid', deadline: '2026-02-30', status: 'pending' },
        { ...sampleTasks[0], id: 'task-deleted', deadline: '2026-07-26', status: 'pending', deletedAt: '2026-07-31T08:00:00.000Z' },
        { ...sampleTasks[0], id: 'task-deleted-unscheduled', deadline: '', status: 'pending', deletedAt: '2026-07-31T08:00:00.000Z' },
      ],
      meetings: [
        { ...sampleMeetings[0], id: 'meeting-today', meetingTime: '2026-07-26T09:00' },
        { ...sampleMeetings[0], id: 'meeting-past', meetingTime: '2026-07-20T09:00' },
        { ...sampleMeetings[0], id: 'meeting-upcoming', meetingTime: '2026-08-02T09:00' },
      ],
      documents: [{ ...sampleDocuments[0], id: 'document-unscheduled', docDate: '' }],
      researches: sampleResearches,
      seals: sampleSeals,
      materials: sampleMaterials,
    }, '2026-07-26');

    expect(overview.today.map((item) => item.recordId)).toEqual(['task-overdue', 'task-today', 'meeting-today']);
    expect(overview.today.find((item) => item.recordId === 'task-overdue')).toMatchObject({ bucket: 'overdue', date: '2026-07-25' });
    expect(overview.upcoming.map((item) => item.recordId)).toEqual(['task-boundary', 'meeting-upcoming']);
    expect(overview.unscheduled.map((item) => item.recordId)).toEqual(['task-unscheduled', 'task-invalid', 'document-unscheduled']);
    expect(overview.today.some((item) => item.recordId === 'meeting-past')).toBe(false);
    expect(overview.today.some((item) => item.recordId === 'task-done')).toBe(false);
    expect(overview.upcoming.some((item) => item.recordId === 'task-outside')).toBe(false);
    expect([...overview.today, ...overview.upcoming, ...overview.unscheduled].some((item) => item.recordId.startsWith('task-deleted'))).toBe(false);
  });

  it('keeps same-day ordering deterministic and does not mutate source records', () => {
    const tasks = [{ ...sampleTasks[0], id: 'task-same-day', deadline: '2026-07-26', status: 'pending' as const }];
    const original = tasks.map((task) => task.deadline);
    const overview = buildWorkOverview({
      tasks,
      meetings: [{ ...sampleMeetings[0], id: 'meeting-same-day', meetingTime: '2026-07-26T08:00' }],
      documents: [{ ...sampleDocuments[0], id: 'document-same-day', docDate: '2026-07-26' }],
      researches: [],
      seals: [],
      materials: [],
    }, '2026-07-26');

    expect(overview.today.map((item) => item.kind)).toEqual(['tasks', 'documents', 'meetings']);
    expect(tasks.map((task) => task.deadline)).toEqual(original);
  });
});
