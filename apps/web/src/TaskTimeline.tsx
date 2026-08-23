import { CalendarDays, CheckSquare2, CircleAlert, FileArchive, FolderOpen, Link2, UserRound } from 'lucide-react';
import { resolveCategoryTint, taskChecklistProgress, type CategoryTint, type Task } from '@hxhwang/domain';
import { buildTaskTimeline, type TaskTimelineGroup } from './task-timeline';

function TimelineTaskCard({ task, selectedId, relationCounts, categoryTints, onSelect }: {
  task: Task;
  selectedId?: string;
  relationCounts: ReadonlyMap<string, number>;
  categoryTints: ReadonlyMap<string, CategoryTint>;
  onSelect: (id: string) => void;
}) {
  const checklist = taskChecklistProgress(task.checklist);
  const related = relationCounts.get(task.id) || 0;
  return <button
    type="button"
    className={`task-timeline-card ${selectedId === task.id ? 'selected' : ''}`}
    aria-label={`查看任务详情：${task.name}`}
    aria-current={selectedId === task.id ? 'true' : undefined}
    onClick={() => onSelect(task.id)}
  >
    <span className="task-timeline-card-title">{task.name || '未命名任务'}</span>
    <span className="task-timeline-card-category"><i className={`category-dot tint-${resolveCategoryTint(task.category, categoryTints)}`} aria-hidden="true" />{task.category || '未分类'}</span>
    <span className="task-timeline-card-meta"><CalendarDays size={13} />{task.deadline || '未设截止日期'}</span>
    <span className="task-timeline-card-meta"><UserRound size={13} />{task.assigner || '未指定交办人'}</span>
    <span className="task-timeline-card-signals">
      {task.status === 'overdue' && <span title="任务状态"><CircleAlert size={13} />已超期</span>}
      {checklist.total > 0 && <span title="检查清单进度"><CheckSquare2 size={13} />{checklist.completed}/{checklist.total}</span>}
      <span title="附件数量"><FileArchive size={13} />{task.files.length}</span>
      {related > 0 && <span title="关联文件数量"><Link2 size={13} />{related}</span>}
    </span>
  </button>;
}

function TimelineGroup({ group, selectedId, relationCounts, categoryTints, onSelect }: {
  group: TaskTimelineGroup;
  selectedId?: string;
  relationCounts: ReadonlyMap<string, number>;
  categoryTints: ReadonlyMap<string, CategoryTint>;
  onSelect: (id: string) => void;
}) {
  return <section className={`task-timeline-group timeline-${group.id.replace(':', '-')}`} aria-label={`${group.label}，${group.tasks.length} 条任务`}>
    <header className="task-timeline-group-heading">
      <span className="task-timeline-marker" aria-hidden="true" />
      <div><strong>{group.label}</strong><small>{group.detail}</small></div>
      <span>{group.tasks.length}</span>
    </header>
    <div className="task-timeline-group-list">
      {group.tasks.map((task) => <TimelineTaskCard key={task.id} task={task} selectedId={selectedId} relationCounts={relationCounts} categoryTints={categoryTints} onSelect={onSelect} />)}
      {!group.tasks.length && <div className="task-timeline-empty"><FolderOpen size={18} />暂无任务</div>}
    </div>
  </section>;
}

export function TaskTimeline({ tasks, today, selectedId, relationCounts, categoryTints, onSelect }: {
  tasks: readonly Task[];
  today: string;
  selectedId?: string;
  relationCounts: ReadonlyMap<string, number>;
  categoryTints: ReadonlyMap<string, CategoryTint>;
  onSelect: (id: string) => void;
}) {
  const groups = buildTaskTimeline(tasks, today);
  return <section className="panel task-timeline-panel" aria-label="任务截止时间轴">
    <div className="task-timeline-axis" aria-hidden="true" />
    <div className="task-timeline-groups">
      {groups.map((group) => <TimelineGroup key={group.id} group={group} selectedId={selectedId} relationCounts={relationCounts} categoryTints={categoryTints} onSelect={onSelect} />)}
    </div>
  </section>;
}
