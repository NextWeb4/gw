import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, FileText, MapPin, Package, Stamp } from 'lucide-react';
import type { MaterialRecord, MeetingRecord, OfficialDocument, ResearchRecord, SealRecord, Task } from '@hxhwang/domain';
import {
  agendaEventsForDate,
  buildAgendaEvents,
  buildAgendaMonth,
  filterAgendaEvents,
  shiftAgendaMonth,
  type AgendaFilter,
  type AgendaKind,
} from './agenda';

interface AgendaViewProps {
  tasks: Task[];
  meetings: MeetingRecord[];
  documents: OfficialDocument[];
  researches: ResearchRecord[];
  seals: SealRecord[];
  materials: MaterialRecord[];
  onOpenRecord: (kind: AgendaKind, id: string) => void;
}

const filterOptions: Array<{ value: AgendaFilter; label: string; actionLabel: string }> = [
  { value: 'all', label: '全部', actionLabel: '查看全部事项' },
  { value: 'tasks', label: '任务', actionLabel: '只看任务' },
  { value: 'meetings', label: '会议', actionLabel: '只看会议' },
  { value: 'documents', label: '文件', actionLabel: '只看文件' },
  { value: 'researches', label: '外出', actionLabel: '只看外出' },
  { value: 'seals', label: '用章', actionLabel: '只看用章' },
  { value: 'materials', label: '物资', actionLabel: '只看物资' },
];

const eventIcons = { tasks: ClipboardList, meetings: CalendarDays, documents: FileText, researches: MapPin, seals: Stamp, materials: Package };
const recordLabels: Record<AgendaKind, string> = { tasks: '任务', meetings: '会议', documents: '文件', researches: '外出', seals: '用章', materials: '物资' };
const weekdayLabels = ['一', '二', '三', '四', '五', '六', '日'];
const longWeekdayLabels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

function localDateValue(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return `${year} 年 ${month} 月`;
}

export function AgendaView({ tasks, meetings, documents, researches, seals, materials, onOpenRecord }: AgendaViewProps) {
  const today = localDateValue(new Date());
  const [activeMonth, setActiveMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState<AgendaFilter>('all');
  const events = useMemo(() => buildAgendaEvents({ tasks, meetings, documents, researches, seals, materials }), [tasks, meetings, documents, researches, seals, materials]);
  const visibleEvents = useMemo(() => filterAgendaEvents(events, filter), [events, filter]);
  const days = useMemo(() => buildAgendaMonth(activeMonth, visibleEvents), [activeMonth, visibleEvents]);
  const selectedEvents = useMemo(() => agendaEventsForDate(visibleEvents, selectedDate), [visibleEvents, selectedDate]);
  const selectedDateValue = parseLocalDate(selectedDate);
  const counts = useMemo(() => new Map(filterOptions.map((option) => [option.value, filterAgendaEvents(events, option.value).length])), [events]);

  const changeMonth = (delta: number) => {
    const nextMonth = shiftAgendaMonth(activeMonth, delta);
    setActiveMonth(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  };
  const returnToToday = () => { setActiveMonth(today.slice(0, 7)); setSelectedDate(today); };
  const selectDate = (date: string) => { setSelectedDate(date); if (date.slice(0, 7) !== activeMonth) setActiveMonth(date.slice(0, 7)); };

  return <>
    <div className="page-heading agenda-page-heading"><div className="heading-copy"><span className="eyebrow">LOCAL SCHEDULE</span><h1>事务日历</h1><p>把六类台账已有日期汇到一个只读时间视图，按天查看后回到原记录继续处理。</p></div><span className="heading-signal" aria-hidden="true">CAL</span></div>
    <div className="agenda-toolbar" aria-label="事务日历控制">
      <div className="agenda-month-control">
        <button type="button" className="icon-button" aria-label="上一个月" title="上一个月" onClick={() => changeMonth(-1)}><ChevronLeft size={17} /></button>
        <strong aria-live="polite">{formatMonthLabel(activeMonth)}</strong>
        <button type="button" className="icon-button" aria-label="下一个月" title="下一个月" onClick={() => changeMonth(1)}><ChevronRight size={17} /></button>
        <button type="button" className="secondary-button agenda-today" onClick={returnToToday}><CalendarDays size={15} />回到今天</button>
      </div>
      <span className="agenda-summary">显示 {visibleEvents.length} / {events.length} 条事项</span>
    </div>
    <div className="agenda-filter-bar" aria-label="事务类型筛选">
      {filterOptions.map((option) => <button type="button" key={option.value} className={`agenda-filter-button kind-${option.value} ${filter === option.value ? 'active' : ''}`} aria-label={option.actionLabel} aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}><span>{option.label}</span><strong>{counts.get(option.value) || 0}</strong></button>)}
    </div>
    <div className="agenda-layout">
      <section className="panel agenda-calendar" aria-label={`${formatMonthLabel(activeMonth)}月历`}>
        <div className="agenda-weekdays" aria-hidden="true">{weekdayLabels.map((label) => <span key={label}>周{label}</span>)}</div>
        <div className="agenda-month-grid">
          {days.map((day) => <button type="button" key={day.date} className={`agenda-day-button ${day.inCurrentMonth ? '' : 'outside'} ${day.date === today ? 'today' : ''} ${selectedDate === day.date ? 'selected' : ''}`} aria-label={`${formatDateLabel(day.date)}，${day.eventCount} 条事项`} aria-current={day.date === today ? 'date' : undefined} aria-pressed={selectedDate === day.date} onClick={() => selectDate(day.date)}>
            <span className="agenda-day-number">{day.day}</span>
            {day.eventCount > 0 && <span className="agenda-day-count">{day.eventCount}</span>}
            <span className="agenda-day-kinds" aria-hidden="true">{day.kinds.slice(0, 4).map((kind) => <i className={`kind-${kind}`} key={kind} />)}</span>
          </button>)}
        </div>
      </section>
      <aside className="panel agenda-day-panel" aria-label="所选日期议程">
        <div className="agenda-day-heading"><div><span className="eyebrow">SELECTED DAY</span><h2>{selectedDateValue.getMonth() + 1} 月 {selectedDateValue.getDate()} 日</h2><p>{longWeekdayLabels[selectedDateValue.getDay()]} · {selectedEvents.length} 条事项</p></div><span className="agenda-date-index">{String(selectedDateValue.getDate()).padStart(2, '0')}</span></div>
        <div className="agenda-event-list">
          {selectedEvents.map((event) => { const Icon = eventIcons[event.kind]; return <button type="button" className={`agenda-event kind-${event.kind}`} aria-label={`打开${recordLabels[event.kind]}记录：${event.title}`} key={event.key} onClick={() => onOpenRecord(event.kind, event.recordId)}><span className="agenda-event-icon"><Icon size={16} /></span><span className="agenda-event-copy"><span><strong>{event.title}</strong><small>{event.time || '全天'}</small></span><span>{event.badge} · {event.detail}</span></span><ChevronRight size={16} /></button>; })}
          {!selectedEvents.length && <div className="agenda-empty"><CalendarDays size={24} /><strong>当天没有匹配事项</strong><span>可切换类型，或选择月历中的其他日期。</span></div>}
        </div>
      </aside>
    </div>
  </>;
}
