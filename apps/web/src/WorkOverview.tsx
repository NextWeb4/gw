import { useMemo, useState } from 'react';
import { CalendarClock, CalendarDays, ChevronRight, CircleAlert, ClipboardCopy, ClipboardList, FileText, MapPin, Package, Stamp } from 'lucide-react';
import type { AgendaKind, AgendaSources } from './agenda';
import { buildWorkBriefing } from './work-briefing';
import { buildWorkOverview, workOverviewToday, type WorkOverviewBucket, type WorkOverviewItem } from './work-overview';

interface WorkOverviewProps extends AgendaSources {
  onOpenRecord: (kind: AgendaKind, id: string) => void;
  onOpenAgenda: () => void;
  onCopyBriefing: (briefing: string) => void;
}

type WorkOverviewView = Exclude<WorkOverviewBucket, 'overdue'> | 'today';

const recordLabels: Record<AgendaKind, string> = { tasks: '任务', meetings: '会议', documents: '文件', researches: '外出', seals: '用章', materials: '物资' };
const eventIcons = { tasks: ClipboardList, meetings: CalendarDays, documents: FileText, researches: MapPin, seals: Stamp, materials: Package };

function formatDate(value: string) {
  if (!value) return '待补日期';
  const [, month, day] = value.split('-').map(Number);
  return `${month}月${day}日`;
}

function itemDateLabel(item: WorkOverviewItem) {
  if (item.bucket === 'overdue') return `逾期 · ${formatDate(item.date)}`;
  if (item.bucket === 'today') return item.time ? `今天 · ${item.time}` : '今天 · 全天';
  if (item.bucket === 'upcoming') return item.time ? `${formatDate(item.date)} · ${item.time}` : formatDate(item.date);
  return '未排期';
}

function emptyCopy(view: WorkOverviewView) {
  if (view === 'today') return { title: '今天没有需要处理的记录', detail: '已排期事项会保留在事务日历中。' };
  if (view === 'upcoming') return { title: '未来 7 天没有排期事项', detail: '可在事务日历或对应台账中补充日期。' };
  return { title: '没有待补日期的记录', detail: '当前六类台账都已有可识别的日期。' };
}

export function WorkOverview({ tasks, meetings, documents, researches, seals, materials, onOpenRecord, onOpenAgenda, onCopyBriefing }: WorkOverviewProps) {
  const today = workOverviewToday();
  const overview = useMemo(() => buildWorkOverview({ tasks, meetings, documents, researches, seals, materials }, today), [tasks, meetings, documents, researches, seals, materials, today]);
  const briefing = useMemo(() => buildWorkBriefing({ tasks, meetings, documents, researches, seals, materials }, today), [tasks, meetings, documents, researches, seals, materials, today]);
  const [view, setView] = useState<WorkOverviewView>('today');
  const items = overview[view];
  const visibleItems = items.slice(0, 8);
  const overdueCount = overview.today.filter((item) => item.bucket === 'overdue').length;
  const viewOptions: Array<{ id: WorkOverviewView; label: string; count: number; note: string }> = [
    { id: 'today', label: '今日与逾期', count: overview.today.length, note: overdueCount ? `${overdueCount} 项逾期` : '按日期进入' },
    { id: 'upcoming', label: '未来 7 天', count: overview.upcoming.length, note: '含第 7 天' },
    { id: 'unscheduled', label: '未排期', count: overview.unscheduled.length, note: '需要补日期' },
  ];
  const empty = emptyCopy(view);

  return <section className="panel work-overview" aria-label="工作焦点概览">
    <div className="panel-heading work-overview-heading">
      <div><span className="eyebrow">ACTION BOARD / {today}</span><h2>工作焦点</h2><p>从六类本机台账提炼可继续处理的记录。</p></div>
      <div className="work-overview-heading-actions">
        <button type="button" className="text-button" onClick={() => onCopyBriefing(briefing)}><ClipboardCopy size={15} />复制今日简报</button>
        <button type="button" className="text-button" onClick={onOpenAgenda}>查看完整日历 <ChevronRight size={15} /></button>
      </div>
    </div>
    <div className="work-overview-tabs" role="tablist" aria-label="工作焦点范围">
      {viewOptions.map((option) => <button type="button" role="tab" key={option.id} className={`work-overview-tab ${view === option.id ? 'active' : ''}`} aria-selected={view === option.id} onClick={() => setView(option.id)}><span>{option.label}</span><strong>{option.count}</strong><small>{option.note}</small></button>)}
    </div>
    <div className="work-overview-list">
      {visibleItems.map((item) => { const Icon = eventIcons[item.kind]; return <button type="button" className={`work-overview-item ${item.bucket}`} key={item.key} aria-label={`打开${recordLabels[item.kind]}记录：${item.title}`} onClick={() => onOpenRecord(item.kind, item.recordId)}><span className="work-overview-icon"><Icon size={17} strokeWidth={1.7} /></span><span className="work-overview-copy"><strong>{item.title || '未命名记录'}</strong><small>{item.badge} · {item.detail}</small></span><span className={`work-overview-date ${item.bucket}`}>{item.bucket === 'overdue' && <CircleAlert size={13} />}{item.bucket === 'unscheduled' && <CalendarClock size={13} />}{itemDateLabel(item)}</span><ChevronRight size={16} aria-hidden="true" /></button>; })}
      {!visibleItems.length && <div className="work-overview-empty"><CalendarDays size={23} /><strong>{empty.title}</strong><span>{empty.detail}</span></div>}
    </div>
    {items.length > visibleItems.length && <small className="work-overview-count">显示前 {visibleItems.length} / {items.length} 条；完整记录仍在对应台账中。</small>}
  </section>;
}
