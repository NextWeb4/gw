import { CalendarDays, CheckSquare2, FileArchive, FolderOpen, Link2, UserRound } from 'lucide-react';
import { resolveCategoryTint, taskChecklistProgress, type CategoryTint, type Task } from '@hxhwang/domain';
import { buildTaskStatusBoard } from './task-board';

export function TaskBoard({ tasks, selectedId, relationCounts, categoryTints, onSelect }: {
  tasks: readonly Task[];
  selectedId?: string;
  relationCounts: ReadonlyMap<string, number>;
  categoryTints: ReadonlyMap<string, CategoryTint>;
  onSelect: (id: string) => void;
}) {
  const columns = buildTaskStatusBoard(tasks);
  return <section className="panel task-board-panel" aria-label="任务状态看板">
    <div className="task-board-grid">
      {columns.map((column) => <section className={`task-board-column status-${column.status}`} aria-label={`${column.label}，${column.tasks.length} 条任务`} key={column.status}>
        <header className="task-board-column-heading"><span className={`task-board-status-mark ${column.status}`} aria-hidden="true" /><strong>{column.label}</strong><span>{column.tasks.length}</span></header>
        <div className="task-board-column-list">
          {column.tasks.map((task) => {
            const checklist = taskChecklistProgress(task.checklist);
            const related = relationCounts.get(task.id) || 0;
            return <button
              type="button"
              className={`task-board-card ${selectedId === task.id ? 'selected' : ''}`}
              aria-label={`查看任务详情：${task.name}`}
              aria-current={selectedId === task.id ? 'true' : undefined}
              onClick={() => onSelect(task.id)}
              key={task.id}
            >
              <span className="task-board-card-title">{task.name || '未命名任务'}</span>
              <span className="task-board-card-category"><i className={`category-dot tint-${resolveCategoryTint(task.category, categoryTints)}`} aria-hidden="true" />{task.category || '未分类'}</span>
              <span className="task-board-card-meta"><CalendarDays size={13} />{task.deadline || '未设截止日期'}</span>
              <span className="task-board-card-meta"><UserRound size={13} />{task.assigner || '未指定交办人'}</span>
              <span className="task-board-card-signals">
                {checklist.total > 0 && <span title="检查清单进度"><CheckSquare2 size={13} />{checklist.completed}/{checklist.total}</span>}
                <span title="附件数量"><FileArchive size={13} />{task.files.length}</span>
                {related > 0 && <span title="关联文件数量"><Link2 size={13} />{related}</span>}
              </span>
            </button>;
          })}
          {!column.tasks.length && <div className="task-board-column-empty"><FolderOpen size={18} /><span>暂无任务</span></div>}
        </div>
      </section>)}
    </div>
  </section>;
}
