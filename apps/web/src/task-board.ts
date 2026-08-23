import { statusLabels, type Status, type Task } from '@hxhwang/domain';

export type TaskDisplayMode = 'list' | 'board';

export const TASK_STATUS_BOARD_ORDER = ['pending', 'progress', 'overdue', 'done'] as const satisfies readonly Status[];

export interface TaskStatusBoardColumn {
  status: Status;
  label: string;
  tasks: Task[];
}

export function buildTaskStatusBoard(tasks: readonly Task[]): TaskStatusBoardColumn[] {
  return TASK_STATUS_BOARD_ORDER.map((status) => ({
    status,
    label: statusLabels[status],
    tasks: tasks.filter((task) => task.status === status),
  }));
}
