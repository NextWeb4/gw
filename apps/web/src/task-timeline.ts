import { isValidIsoDate, type Task } from '@hxhwang/domain';

export type TaskTimelineGroupId = 'overdue' | 'today' | `date:${string}` | 'later' | 'unscheduled';

export interface TaskTimelineGroup {
  id: TaskTimelineGroupId;
  label: string;
  detail: string;
  date?: string;
  tasks: Task[];
}

function localDateValue(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftLocalDate(value: string, delta: number) {
  const [year, month, day] = value.split('-').map(Number);
  return localDateValue(new Date(year, month - 1, day + delta));
}

function formatTimelineDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
  return `${month}月${day}日 · ${weekday}`;
}

function distanceLabel(today: string, date: string) {
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  const [year, month, day] = date.split('-').map(Number);
  const delta = Math.round((new Date(year, month - 1, day).getTime() - new Date(todayYear, todayMonth - 1, todayDay).getTime()) / 86400000);
  return `距今天 ${delta} 天`;
}

function fixedGroup(id: Exclude<TaskTimelineGroupId, `date:${string}`>, label: string, detail: string): TaskTimelineGroup {
  return { id, label, detail, tasks: [] };
}

export function taskTimelineToday() {
  return localDateValue(new Date());
}

export function buildTaskTimeline(tasks: readonly Task[], today: string): TaskTimelineGroup[] {
  if (!isValidIsoDate(today, false)) throw new Error(`无效时间轴日期：${today}`);
  const overdue = fixedGroup('overdue', '已过截止日期', '截止日早于今天，保留当前筛选结果');
  const todayGroup = fixedGroup('today', '今天', today);
  const later = fixedGroup('later', '更远日期', '第 8 天以后');
  const unscheduled = fixedGroup('unscheduled', '未排期', '没有有效截止日期');
  const dated = new Map<string, TaskTimelineGroup>();
  const daySeven = shiftLocalDate(today, 7);

  for (const task of tasks) {
    const deadline = isValidIsoDate(task.deadline, false) ? task.deadline : '';
    if (!deadline) {
      unscheduled.tasks.push(task);
    } else if (deadline < today) {
      overdue.tasks.push(task);
    } else if (deadline === today) {
      todayGroup.tasks.push(task);
    } else if (deadline <= daySeven) {
      const group = dated.get(deadline) || { id: `date:${deadline}`, label: formatTimelineDate(deadline), detail: distanceLabel(today, deadline), date: deadline, tasks: [] };
      group.tasks.push(task);
      dated.set(deadline, group);
    } else {
      later.tasks.push(task);
    }
  }

  return [overdue, todayGroup, ...[...dated.values()].sort((left, right) => (left.date || '').localeCompare(right.date || '')), later, unscheduled];
}
