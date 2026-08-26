import type { AgendaKind, AgendaSources } from './agenda';
import { buildWorkOverview, type WorkOverviewBucket, type WorkOverviewItem } from './work-overview';

const moduleLabels: Record<AgendaKind, string> = {
  tasks: '任务',
  meetings: '会议',
  documents: '文件',
  researches: '外出',
  seals: '用章',
  materials: '物资',
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function shortDate(value: string) {
  const [, month, day] = value.split('-').map(Number);
  return `${month}月${day}日`;
}

function itemSchedule(item: WorkOverviewItem) {
  if (item.bucket === 'overdue') return `截止 ${shortDate(item.date)}`;
  if (item.bucket === 'today') return item.time ? `今天 ${item.time}` : '今天 全天';
  if (item.bucket === 'upcoming') return item.time ? `${shortDate(item.date)} ${item.time}` : shortDate(item.date);
  return '待补日期';
}

function briefingLine(item: WorkOverviewItem) {
  return `- ${moduleLabels[item.kind]}｜${normalizeText(item.title) || '未命名记录'}｜${itemSchedule(item)}`;
}

function addSection(lines: string[], title: string, bucket: WorkOverviewBucket, items: readonly WorkOverviewItem[]) {
  lines.push(title);
  const bucketItems = items.filter((item) => item.bucket === bucket);
  if (!bucketItems.length) lines.push('- 暂无');
  else bucketItems.forEach((item) => lines.push(briefingLine(item)));
}

export function buildWorkBriefing(sources: AgendaSources, today: string): string {
  const overview = buildWorkOverview(sources, today);
  const lines = [`【今日工作简报】${today}`];
  addSection(lines, '逾期', 'overdue', overview.today);
  addSection(lines, '今天', 'today', overview.today);
  addSection(lines, '未来 7 天', 'upcoming', overview.upcoming);
  addSection(lines, '未排期', 'unscheduled', overview.unscheduled);
  return lines.join('\n');
}
