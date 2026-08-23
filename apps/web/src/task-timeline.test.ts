import { describe, expect, it } from 'vitest';
import { sampleTasks, type Task } from '@hxhwang/domain';
import { buildTaskTimeline } from './task-timeline';

describe('task deadline timeline projection', () => {
  it('keeps fixed context groups and puts dated tasks in chronological groups', () => {
    const tasks: Task[] = [
      { ...sampleTasks[0], id: 'later', name: '更远', deadline: '2026-09-15', status: 'progress' },
      { ...sampleTasks[1], id: 'today', name: '今天', deadline: '2026-08-23', status: 'pending' },
      { ...sampleTasks[0], id: 'next-two', name: '后天甲', deadline: '2026-08-25', status: 'progress' },
      { ...sampleTasks[1], id: 'overdue', name: '过去', deadline: '2026-08-20', status: 'pending' },
      { ...sampleTasks[0], id: 'next-two-b', name: '后天乙', deadline: '2026-08-25', status: 'done' },
      { ...sampleTasks[1], id: 'unscheduled', name: '未排期', deadline: '', status: 'pending' },
    ];
    const before = JSON.stringify(tasks);

    const groups = buildTaskTimeline(tasks, '2026-08-23');

    expect(groups.map((group) => group.id)).toEqual(['overdue', 'today', 'date:2026-08-25', 'later', 'unscheduled']);
    expect(groups.map((group) => group.tasks.map((task) => task.id))).toEqual([
      ['overdue'], ['today'], ['next-two', 'next-two-b'], ['later'], ['unscheduled'],
    ]);
    expect(groups.find((group) => group.id === 'date:2026-08-25')?.detail).toBe('距今天 2 天');
    expect(JSON.stringify(tasks)).toBe(before);
  });

  it('preserves empty fixed groups, treats invalid dates as unscheduled and rejects invalid today', () => {
    const groups = buildTaskTimeline([{ ...sampleTasks[0], id: 'invalid', deadline: '2026-02-30' }], '2026-08-23');
    expect(groups.map((group) => ({ id: group.id, count: group.tasks.length }))).toEqual([
      { id: 'overdue', count: 0 },
      { id: 'today', count: 0 },
      { id: 'later', count: 0 },
      { id: 'unscheduled', count: 1 },
    ]);
    expect(() => buildTaskTimeline([], '2026-8-23')).toThrow('无效时间轴日期');
  });
});
