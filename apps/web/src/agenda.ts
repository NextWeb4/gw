import {
  isValidIsoDate,
  isValidIsoDateTime,
  statusLabels,
  type MaterialRecord,
  type MeetingRecord,
  type OfficialDocument,
  type ResearchRecord,
  type SealRecord,
  type Task,
} from '@hxhwang/domain';

export type AgendaKind = 'tasks' | 'meetings' | 'documents' | 'researches' | 'seals' | 'materials';
export type AgendaFilter = 'all' | AgendaKind;

export interface AgendaSources {
  tasks: Task[];
  meetings: MeetingRecord[];
  documents: OfficialDocument[];
  researches: ResearchRecord[];
  seals: SealRecord[];
  materials: MaterialRecord[];
}

export interface AgendaEvent {
  key: string;
  kind: AgendaKind;
  recordId: string;
  date: string;
  time: string;
  title: string;
  detail: string;
  badge: string;
  sourceIndex: number;
}

export interface AgendaDay {
  date: string;
  day: number;
  inCurrentMonth: boolean;
  eventCount: number;
  kinds: AgendaKind[];
}

const kindOrder: Record<AgendaKind, number> = {
  tasks: 0,
  meetings: 1,
  documents: 2,
  researches: 3,
  seals: 4,
  materials: 5,
};

function validDate(value: string) {
  return isValidIsoDate(value, false) ? value : '';
}

function validDateTime(value: string) {
  if (!isValidIsoDateTime(value, false)) return null;
  return { date: value.slice(0, 10), time: value.slice(11, 16) };
}

function compareAgendaEvents(left: AgendaEvent, right: AgendaEvent) {
  const byDate = left.date.localeCompare(right.date);
  if (byDate) return byDate;
  const byTime = (left.time || '00:00').localeCompare(right.time || '00:00');
  if (byTime) return byTime;
  const byKind = kindOrder[left.kind] - kindOrder[right.kind];
  if (byKind) return byKind;
  return left.sourceIndex - right.sourceIndex;
}

export function buildAgendaEvents(sources: AgendaSources) {
  const events: AgendaEvent[] = [];
  sources.tasks.forEach((task, sourceIndex) => {
    const date = validDate(task.deadline);
    if (!date) return;
    events.push({ key: `tasks:${task.id}`, kind: 'tasks', recordId: task.id, date, time: '', title: task.name, detail: `${task.category || '未分类'} · ${statusLabels[task.status]}`, badge: '任务截止', sourceIndex });
  });
  sources.meetings.forEach((meeting, sourceIndex) => {
    const value = validDateTime(meeting.meetingTime);
    if (!value) return;
    events.push({ key: `meetings:${meeting.id}`, kind: 'meetings', recordId: meeting.id, date: value.date, time: value.time, title: meeting.subject, detail: meeting.location || meeting.sendTo || '未填写地点或对象', badge: '会议', sourceIndex });
  });
  sources.documents.forEach((document, sourceIndex) => {
    const date = validDate(document.docDate);
    if (!date) return;
    events.push({ key: `documents:${document.id}`, kind: 'documents', recordId: document.id, date, time: '', title: document.title, detail: `${document.docType}${document.code ? ` · ${document.code}` : ''}`, badge: '文件', sourceIndex });
  });
  sources.researches.forEach((research, sourceIndex) => {
    const date = validDate(research.researchTime);
    if (!date) return;
    events.push({ key: `researches:${research.id}`, kind: 'researches', recordId: research.id, date, time: '', title: research.subject, detail: `${research.direction}${research.location ? ` · ${research.location}` : ''}`, badge: '外出', sourceIndex });
  });
  sources.seals.forEach((seal, sourceIndex) => {
    const date = validDate(seal.sealTime);
    if (!date) return;
    events.push({ key: `seals:${seal.id}`, kind: 'seals', recordId: seal.id, date, time: '', title: seal.docName, detail: `${seal.docType || '未分类'}${seal.userName ? ` · ${seal.userName}` : ''}`, badge: '用章', sourceIndex });
  });
  sources.materials.forEach((material, sourceIndex) => {
    const date = validDate(material.handlerTime);
    if (!date) return;
    events.push({ key: `materials:${material.id}`, kind: 'materials', recordId: material.id, date, time: '', title: material.materialName, detail: `${material.type === 'in' ? '入库' : '领用'} ${material.quantity}${material.spec ? ` · ${material.spec}` : ''}`, badge: '物资', sourceIndex });
  });
  return events.sort(compareAgendaEvents);
}

export function filterAgendaEvents(events: AgendaEvent[], filter: AgendaFilter) {
  return filter === 'all' ? [...events] : events.filter((event) => event.kind === filter);
}

function parseMonthKey(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) throw new Error(`无效月份：${monthKey}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1000 || year > 9999 || month < 1 || month > 12) throw new Error(`无效月份：${monthKey}`);
  return { year, monthIndex: month - 1 };
}

function localDateValue(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildAgendaMonth(monthKey: string, events: AgendaEvent[]) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const monthStart = new Date(year, monthIndex, 1);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(year, monthIndex, 1 - mondayOffset);
  const eventsByDate = new Map<string, AgendaEvent[]>();
  for (const event of events) {
    const bucket = eventsByDate.get(event.date) || [];
    bucket.push(event);
    eventsByDate.set(event.date, bucket);
  }

  return Array.from({ length: 42 }, (_, index): AgendaDay => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const value = localDateValue(date);
    const dayEvents = eventsByDate.get(value) || [];
    return {
      date: value,
      day: date.getDate(),
      inCurrentMonth: date.getFullYear() === year && date.getMonth() === monthIndex,
      eventCount: dayEvents.length,
      kinds: [...new Set(dayEvents.map((event) => event.kind))],
    };
  });
}

export function shiftAgendaMonth(monthKey: string, delta: number) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const shifted = new Date(year, monthIndex + delta, 1);
  return localDateValue(shifted).slice(0, 7);
}

export function agendaEventsForDate(events: AgendaEvent[], date: string) {
  return events.filter((event) => event.date === date);
}
