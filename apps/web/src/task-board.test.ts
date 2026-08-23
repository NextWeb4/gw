import { describe, expect, it } from 'vitest';
import { sampleTasks, type Task } from '@hxhwang/domain';
import { buildTaskStatusBoard, TASK_STATUS_BOARD_ORDER } from './task-board';

describe('task status board projection', () => {
  it('keeps four fixed status columns and preserves the current visible order inside each column', () => {
    const tasks: Task[] = [
      { ...sampleTasks[0], id: 'progress-a', name: '推进甲', status: 'progress' },
      { ...sampleTasks[1], id: 'pending-a', name: '待办甲', status: 'pending' },
      { ...sampleTasks[0], id: 'progress-b', name: '推进乙', status: 'progress' },
      { ...sampleTasks[1], id: 'overdue-a', name: '超期甲', status: 'overdue' },
      { ...sampleTasks[0], id: 'done-a', name: '完成甲', status: 'done' },
    ];
    const before = JSON.stringify(tasks);

    const columns = buildTaskStatusBoard(tasks);

    expect(columns.map((column) => column.status)).toEqual(TASK_STATUS_BOARD_ORDER);
    expect(columns.map((column) => column.label)).toEqual(['未启动', '进行中', '已超期', '已完成']);
    expect(columns.find((column) => column.status === 'progress')?.tasks.map((task) => task.id)).toEqual(['progress-a', 'progress-b']);
    expect(columns.flatMap((column) => column.tasks)).toHaveLength(tasks.length);
    expect(JSON.stringify(tasks)).toBe(before);
    expect(columns.every((column) => column.tasks !== tasks)).toBe(true);
  });

  it('retains explicit empty columns for an empty or partial current result', () => {
    expect(buildTaskStatusBoard([]).map((column) => ({ status: column.status, count: column.tasks.length }))).toEqual([
      { status: 'pending', count: 0 },
      { status: 'progress', count: 0 },
      { status: 'overdue', count: 0 },
      { status: 'done', count: 0 },
    ]);

    const onlyDone = buildTaskStatusBoard([{ ...sampleTasks[0], id: 'done-only', status: 'done' }]);
    expect(onlyDone.map((column) => column.tasks.length)).toEqual([0, 0, 0, 1]);
  });
});
