import { isActiveBusinessRecord, isValidIsoDate, statusLabels, type MaterialRecord, type MeetingRecord, type OfficialDocument, type ResearchRecord, type SealRecord, type Task } from '@hxhwang/domain';
import { agendaKindOrder, buildAgendaEvents, type AgendaEvent, type AgendaKind, type AgendaSources } from './agenda';

export type WorkOverviewBucket = 'overdue' | 'today' | 'upcoming' | 'unscheduled';

export interface WorkOverviewItem extends AgendaEvent {
  bucket: WorkOverviewBucket;
}

export interface WorkOverview {
  today: WorkOverviewItem[];
  upcoming: WorkOverviewItem[];
  unscheduled: WorkOverviewItem[];
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

function withBucket(event: AgendaEvent, bucket: WorkOverviewBucket): WorkOverviewItem {
  return { ...event, bucket };
}

function unscheduledItem(kind: AgendaKind, record: Task | MeetingRecord | OfficialDocument | ResearchRecord | SealRecord | MaterialRecord, sourceIndex: number): WorkOverviewItem {
  if (kind === 'tasks') {
    const task = record as Task;
    return { key: `tasks:${task.id}`, kind, recordId: task.id, date: '', time: '', title: task.name, detail: `${task.category || '未分类'} · ${statusLabels[task.status]}`, badge: '任务 · 未排期', sourceIndex, bucket: 'unscheduled' };
  }
  if (kind === 'meetings') {
    const meeting = record as MeetingRecord;
    return { key: `meetings:${meeting.id}`, kind, recordId: meeting.id, date: '', time: '', title: meeting.subject, detail: meeting.location || meeting.sendTo || '未填写地点或对象', badge: '会议 · 未排期', sourceIndex, bucket: 'unscheduled' };
  }
  if (kind === 'documents') {
    const document = record as OfficialDocument;
    return { key: `documents:${document.id}`, kind, recordId: document.id, date: '', time: '', title: document.title, detail: `${document.docType}${document.code ? ` · ${document.code}` : ''}`, badge: '文件 · 未排期', sourceIndex, bucket: 'unscheduled' };
  }
  if (kind === 'researches') {
    const research = record as ResearchRecord;
    return { key: `researches:${research.id}`, kind, recordId: research.id, date: '', time: '', title: research.subject, detail: `${research.direction}${research.location ? ` · ${research.location}` : ''}`, badge: '外出 · 未排期', sourceIndex, bucket: 'unscheduled' };
  }
  if (kind === 'seals') {
    const seal = record as SealRecord;
    return { key: `seals:${seal.id}`, kind, recordId: seal.id, date: '', time: '', title: seal.docName, detail: `${seal.docType || '未分类'}${seal.userName ? ` · ${seal.userName}` : ''}`, badge: '用章 · 未排期', sourceIndex, bucket: 'unscheduled' };
  }
  const material = record as MaterialRecord;
  return { key: `materials:${material.id}`, kind, recordId: material.id, date: '', time: '', title: material.materialName, detail: `${material.type === 'in' ? '入库' : '领用'} ${material.quantity}${material.spec ? ` · ${material.spec}` : ''}`, badge: '物资 · 未排期', sourceIndex, bucket: 'unscheduled' };
}

function compareUnscheduled(left: WorkOverviewItem, right: WorkOverviewItem) {
  const byKind = agendaKindOrder[left.kind] - agendaKindOrder[right.kind];
  if (byKind) return byKind;
  const bySource = left.sourceIndex - right.sourceIndex;
  if (bySource) return bySource;
  return left.recordId.localeCompare(right.recordId);
}

export function buildWorkOverview(sources: AgendaSources, today: string): WorkOverview {
  if (!isValidIsoDate(today, false)) throw new Error(`无效概览日期：${today}`);
  const activeTaskIds = new Set(sources.tasks.filter(isActiveBusinessRecord).filter((task) => task.status !== 'done').map((task) => task.id));
  const events = buildAgendaEvents(sources).filter((event) => event.kind !== 'tasks' || activeTaskIds.has(event.recordId));
  const eventKeys = new Set(events.map((event) => event.key));
  const daySeven = shiftLocalDate(today, 7);
  const todayItems: WorkOverviewItem[] = [];
  const upcomingItems: WorkOverviewItem[] = [];
  for (const event of events) {
    if (event.kind === 'tasks' && event.date < today) {
      todayItems.push(withBucket(event, 'overdue'));
    } else if (event.date === today) {
      todayItems.push(withBucket(event, 'today'));
    } else if (event.date > today && event.date <= daySeven) {
      upcomingItems.push(withBucket(event, 'upcoming'));
    }
  }

  const unscheduledItems: WorkOverviewItem[] = [];
  const collect = <T extends Task | MeetingRecord | OfficialDocument | ResearchRecord | SealRecord | MaterialRecord>(kind: AgendaKind, records: T[]) => {
    records.filter(isActiveBusinessRecord).forEach((record, sourceIndex) => {
      if (kind === 'tasks' && (record as Task).status === 'done') return;
      if (!eventKeys.has(`${kind}:${record.id}`)) unscheduledItems.push(unscheduledItem(kind, record, sourceIndex));
    });
  };
  collect('tasks', sources.tasks);
  collect('meetings', sources.meetings);
  collect('documents', sources.documents);
  collect('researches', sources.researches);
  collect('seals', sources.seals);
  collect('materials', sources.materials);

  return {
    today: todayItems,
    upcoming: upcomingItems,
    unscheduled: unscheduledItems.sort(compareUnscheduled),
  };
}

export function workOverviewToday() {
  return localDateValue(new Date());
}
