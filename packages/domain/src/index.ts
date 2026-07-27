export type Status = 'pending' | 'progress' | 'done' | 'overdue';
export type WorkSummaryTemplateId = 'progress' | 'coordination' | 'completion';
export type ArchiveType = 'meeting' | 'research' | 'seal' | 'material' | 'weekly' | 'unknown';
export type ResearchDirection = '外出调研' | '外出开会' | '外出活动' | '慰问活动' | '上级来访';
export type MaterialMovement = 'in' | 'out';

export const statusLabels: Record<Status, string> = { pending: '未启动', progress: '进行中', done: '已完成', overdue: '已超期' };
export const workSummaryTemplateLabels: Record<WorkSummaryTemplateId, string> = { progress: '进展摘要', coordination: '协同推进', completion: '办结总结' };

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data?: string;
  sha256?: string;
  createdAt: string;
}

export interface PartnerStatus {
  name: string;
  status: 'notified' | 'pending' | 'progress' | 'done';
  files?: string[];
}

export interface TaskStage {
  id: string;
  name: string;
  partnerStatus: PartnerStatus[];
}

export interface Task {
  id: string;
  name: string;
  category: string;
  source: string;
  assigner: string;
  assignDate: string;
  deadline: string;
  status: Status;
  partnerStatus: PartnerStatus[];
  stages: TaskStage[];
  remark: string;
  workSummary: string;
  files: string[];
  createdAt: string;
  updatedAt: string;
  sourceVersion?: string;
  legacyPayload?: Record<string, unknown>;
}

export interface OfficialDocument {
  id: string;
  title: string;
  code: string;
  docType: '收文' | '发文' | '其他';
  docDate: string;
  securityLevel: string;
  fromUnit: string;
  fileCategory: string;
  workCategory: string;
  handler: string;
  sendScope: string;
  receiptStatus: string;
  remark: string;
  files: string[];
  createdAt: string;
  updatedAt: string;
  sourceVersion?: string;
  legacyPayload?: Record<string, unknown>;
}

export interface MeetingRecord {
  id: string;
  subject: string;
  sendTo: string;
  receiver: string;
  notifyTime: string;
  meetingTime: string;
  location: string;
  remark: string;
  files: string[];
  createdAt: string;
  updatedAt: string;
  sourceVersion?: string;
  legacyPayload?: Record<string, unknown>;
}

export interface ResearchRecord {
  id: string;
  researchTime: string;
  direction: ResearchDirection;
  subject: string;
  location: string;
  useCar: '' | '是' | '否';
  participants: string;
  summary: string;
  achievements: string;
  remark: string;
  files: string[];
  createdAt: string;
  updatedAt: string;
  sourceVersion?: string;
  legacyPayload?: Record<string, unknown>;
}

export interface SealRecord {
  id: string;
  sealTime: string;
  userName: string;
  approver: string;
  docName: string;
  docType: string;
  remark: string;
  files: string[];
  createdAt: string;
  updatedAt: string;
  sourceVersion?: string;
  legacyPayload?: Record<string, unknown>;
}

export interface MaterialRecord {
  id: string;
  materialName: string;
  spec: string;
  quantity: number;
  type: MaterialMovement;
  handlerTime: string;
  handler: string;
  fromUnit: string;
  remark: string;
  files: string[];
  createdAt: string;
  updatedAt: string;
  sourceVersion?: string;
  legacyPayload?: Record<string, unknown>;
}

export interface WritingRule {
  id: string;
  title: string;
  description: string;
  severity: 'advisory' | 'warning' | 'error';
  sourceId: string;
  sourceVersion?: string;
  documentTypes: string[];
}

export interface WritingTemplate {
  id: string;
  name: string;
  documentType: string;
  outline: string[];
  sourceId?: string;
  sourceVersion?: string;
}

export interface CustomWritingTemplate extends WritingTemplate {
  custom: true;
  contentHtml: string;
  contentText: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactDirectory {
  people: string[];
  units: string[];
  updatedAt: string;
}

export const sampleContactDirectory: ContactDirectory = {
  people: ['林晓岚', '陈致远', '郑明川', '周宁'],
  units: [
    '福建省人民政府办公厅',
    '福建省发展和改革委员会',
    '福建省财政厅',
    '福建省民政厅',
    '福建省住房和城乡建设厅',
    '福建省人民政府办公厅综合处',
    '福建省人民政府办公厅秘书一处',
    '福建省人民政府办公厅秘书二处',
    '福建省人民政府办公厅信息处',
    '福建省人民政府督查室'
  ],
  updatedAt: '2026-07-27T00:00:00.000Z'
};

export interface AiSkill {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerGroup {
  id: string;
  name: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

export function mergePartnerGroupMembers(current: PartnerStatus[], members: string[]): { partners: PartnerStatus[]; added: number; skipped: number } {
  const existing = new Set(current.map((partner) => partner.name.trim()).filter(Boolean));
  const uniqueMembers = [...new Set(members.map((member) => member.trim()).filter(Boolean))];
  const additions: PartnerStatus[] = [];
  let skipped = 0;
  for (const name of uniqueMembers) {
    if (existing.has(name)) { skipped += 1; continue; }
    existing.add(name);
    additions.push({ name, status: 'pending', files: [] });
  }
  return { partners: [...current, ...additions], added: additions.length, skipped };
}

export const CATEGORY_TINTS = ['acid', 'green', 'violet', 'neutral'] as const;
export type CategoryTint = (typeof CATEGORY_TINTS)[number];

export interface CategoryStyle {
  id: string;
  name: string;
  tint: CategoryTint;
  createdAt: string;
  updatedAt: string;
}

export function defaultCategoryTint(name: string): CategoryTint {
  const trimmed = name.trim();
  if (!trimmed) return 'neutral';
  let hash = 0;
  for (const character of trimmed) hash = (hash * 31 + (character.codePointAt(0) || 0)) >>> 0;
  return CATEGORY_TINTS[hash % CATEGORY_TINTS.length];
}

export function resolveCategoryTint(name: string, overrides: ReadonlyMap<string, CategoryTint>): CategoryTint {
  return overrides.get(name.trim()) || defaultCategoryTint(name);
}

export interface Draft {
  id: string;
  title: string;
  documentType: string;
  contentHtml: string;
  contentText: string;
  templateId: string;
  version: number;
  updatedAt: string;
}

export interface WeeklyReport {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  contentText: string;
  taskIds: string[];
  documentIds: string[];
  meetingIds?: string[];
  researchIds?: string[];
  sealIds?: string[];
  materialIds?: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArchiveRecord {
  id: string;
  type: ArchiveType;
  title: string;
  date: string;
  summary: string;
  sourceVersion: string;
  legacyPayload: Record<string, unknown>;
  files: string[];
  createdAt: string;
}

export interface MigrationReport {
  sourceVersion: string;
  imported: Record<string, number>;
  attachments: number;
  warnings: string[];
}

export interface LegacySkill {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  sourceVersion: string;
  legacyPayload: Record<string, unknown>;
}

export interface KnowledgePack {
  version: number;
  generatedAt: string;
  sources: Array<{ id: string; title: string; kind: string; url: string; status: string; version?: string }>;
  rules: WritingRule[];
  templates: WritingTemplate[];
}

export const nowIso = () => new Date().toISOString();

export const createId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function mergeContactDirectory(
  current: ContactDirectory,
  people: string[] = [],
  units: string[] = [],
  updatedAt = nowIso()
): ContactDirectory {
  const mergeValues = (existing: string[], additions: string[]) => [...new Set(
    [...existing, ...additions].map((value) => value.trim()).filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, 'zh-CN'));
  return {
    people: mergeValues(current.people, people),
    units: mergeValues(current.units, units),
    updatedAt
  };
}

export function isValidIsoDate(value: string, allowEmpty = true) {
  if (!value) return allowEmpty;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidIsoDateTime(value: string, allowEmpty = true) {
  if (!value) return allowEmpty;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match || !isValidIsoDate(`${match[1]}-${match[2]}-${match[3]}`, false)) return false;
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export const materialStockKey = (record: Pick<MaterialRecord, 'materialName' | 'spec'>) => `${record.materialName.trim()}|${record.spec.trim()}`;

export function calculateMaterialStock(records: MaterialRecord[]) {
  const balances = new Map<string, number>();
  for (const record of records) {
    const key = materialStockKey(record);
    const quantity = Number.isInteger(record.quantity) && record.quantity > 0 ? record.quantity : 0;
    balances.set(key, (balances.get(key) || 0) + (record.type === 'in' ? quantity : -quantity));
  }
  return balances;
}

export function generateTaskWorkSummary(task: Task, template: WorkSummaryTemplateId) {
  const status = statusLabels[task.status];
  const partners = task.partnerStatus.map((partner) => partner.name.trim()).filter(Boolean);
  const partnerText = partners.join('、');
  if (template === 'coordination') {
    return `${task.name}由${task.assigner.trim() || '相关负责人'}交办，当前处于${status}阶段。${partnerText ? `已协调${partnerText}等单位按任务分工协同推进。` : '已按任务分工推进相关工作。'}${task.deadline ? `计划于${task.deadline}前完成阶段目标。` : '后续将持续跟踪办理进度。'}`;
  }
  if (template === 'completion') {
    return `${task.name}已完成${task.status === 'done' ? '既定任务' : '阶段性工作'}。${partnerText ? `${partnerText}等单位已完成协同事项。` : ''}${task.remark.trim() ? `有关情况：${task.remark.trim()}。` : '相关资料已整理，后续按要求归档。'}`;
  }
  return `${task.name}当前状态为${status}。${task.assigner.trim() ? `交办人为${task.assigner.trim()}。` : ''}${partnerText ? `已与${partnerText}沟通衔接。` : ''}${task.deadline ? `下一步将在${task.deadline}前继续推进并补充佐证材料。` : '下一步将继续推进并及时补充佐证材料。'}`;
}

const isoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : value.slice(0, 10);
const inRange = (value: string, startDate: string, endDate: string) => {
  const date = isoDate(value);
  return isValidIsoDate(date, false) && date >= startDate && date <= endDate;
};

export interface WeeklyBusinessSources {
  meetings?: MeetingRecord[];
  researches?: ResearchRecord[];
  seals?: SealRecord[];
  materials?: MaterialRecord[];
}

export type WeeklySectionSource = 'overview' | 'tasks' | 'documents' | 'activities' | 'support' | 'next' | 'manual';

export interface WeeklyTemplateSection {
  heading: string;
  source: WeeklySectionSource;
  note?: string;
}

export interface WeeklyTemplate {
  id: string;
  name: string;
  sections: WeeklyTemplateSection[];
  createdAt?: string;
  updatedAt?: string;
}

export const weeklySectionSourceLabels: Record<WeeklySectionSource, string> = {
  overview: '总体数字（自动汇总）',
  tasks: '任务进展（自动汇总）',
  documents: '文件办理（自动汇总）',
  activities: '会议与外出（自动汇总）',
  support: '用章与物资（自动汇总）',
  next: '下期安排（自动汇总）',
  manual: '手工填写（插入占位提示）'
};

export const DEFAULT_WEEKLY_TEMPLATE: WeeklyTemplate = {
  id: 'weekly-template-default',
  name: '默认周报结构',
  sections: [
    { heading: '总体情况', source: 'overview' },
    { heading: '重点进展', source: 'tasks' },
    { heading: '文件办理', source: 'documents' },
    { heading: '会议与外出活动', source: 'activities' },
    { heading: '用章与物资保障', source: 'support' },
    { heading: '下期安排', source: 'next' }
  ]
};

const chineseOrdinals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
const chineseOrdinal = (index: number) => chineseOrdinals[index] || String(index + 1);
const weeklySectionSources = new Set<WeeklySectionSource>(['overview', 'tasks', 'documents', 'activities', 'support', 'next', 'manual']);

export function parseWeeklyTemplate(input: unknown): { name: string; sections: WeeklyTemplateSection[] } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('不是有效的周报模板 JSON');
  const raw = input as { name?: unknown; sections?: unknown };
  if (!Array.isArray(raw.sections) || !raw.sections.length || raw.sections.length > 20) throw new Error('周报模板必须包含 1 至 20 个章节');
  const sections = raw.sections.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`第 ${index + 1} 个章节无效`);
    const section = entry as { heading?: unknown; source?: unknown; note?: unknown };
    const heading = typeof section.heading === 'string' ? section.heading.trim() : '';
    if (!heading || heading.length > 60) throw new Error(`第 ${index + 1} 个章节标题必须是 1 至 60 个字符`);
    if (typeof section.source !== 'string' || !weeklySectionSources.has(section.source as WeeklySectionSource)) throw new Error(`第 ${index + 1} 个章节的数据来源无效`);
    const note = typeof section.note === 'string' && section.note.trim() ? section.note.trim().slice(0, 500) : undefined;
    return { heading, source: section.source as WeeklySectionSource, ...(note ? { note } : {}) } as WeeklyTemplateSection;
  });
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 60) : '导入的周报模板';
  return { name, sections };
}

const inferSectionSource = (heading: string): WeeklySectionSource => {
  if (/总体|概况|概述|总述/.test(heading)) return 'overview';
  if (/下周|下期|下步|下一步|计划|安排/.test(heading)) return 'next';
  if (/会议|外出|调研|活动|协调/.test(heading)) return 'activities';
  if (/用章|物资|保障|后勤/.test(heading)) return 'support';
  if (/文件|收文|发文|来文|公文/.test(heading)) return 'documents';
  if (/任务|进展|工作|落实|推进/.test(heading)) return 'tasks';
  return 'manual';
};

export function extractWeeklyTemplateFromSample(rawText: string): { name: string; sections: WeeklyTemplateSection[] } {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error('请先粘贴范文内容');
  const headingPatterns = [/^([一二三四五六七八九十]{1,3})、\s*(.{1,60})$/, /^[（(]([一二三四五六七八九十]{1,3})[）)]\s*(.{1,60})$/];
  const sections: WeeklyTemplateSection[] = [];
  let pendingNoteIndex = -1;
  for (const line of lines) {
    const match = headingPatterns.map((pattern) => pattern.exec(line)).find(Boolean);
    if (match) {
      if (sections.length >= 20) break;
      const heading = match[2].replace(/[。：:；;，,\s]+$/, '').trim();
      if (!heading) continue;
      const source = inferSectionSource(heading);
      sections.push({ heading, source });
      pendingNoteIndex = source === 'manual' ? sections.length - 1 : -1;
      continue;
    }
    if (pendingNoteIndex >= 0 && !sections[pendingNoteIndex].note) {
      sections[pendingNoteIndex] = { ...sections[pendingNoteIndex], note: `参考范文该节开头：${line.slice(0, 80)}` };
      pendingNoteIndex = -1;
    }
  }
  if (!sections.length) throw new Error('未识别出“一、……”或“（一）……”样式的章节标题');
  const firstLine = lines[0];
  const isHeading = headingPatterns.some((pattern) => pattern.test(firstLine));
  const name = !isHeading && firstLine.length <= 40 ? `范文结构：${firstLine.replace(/[。：:；;，,\s]+$/, '')}` : '从范文提取的结构';
  return { name: name.slice(0, 60), sections };
}

export function buildWeeklyReportSummary(tasks: Task[], documents: OfficialDocument[], startDate: string, endDate: string, sources: WeeklyBusinessSources = {}, template: WeeklyTemplate = DEFAULT_WEEKLY_TEMPLATE) {
  if (!isValidIsoDate(startDate, false) || !isValidIsoDate(endDate, false) || startDate > endDate) {
    throw new Error('周报起止日期无效');
  }
  const selectedTasks = tasks.filter((task) => {
    const eventDates = [task.assignDate, task.deadline, task.createdAt, task.updatedAt];
    if (eventDates.some((date) => date && inRange(date, startDate, endDate))) return true;
    const assignDate = isoDate(task.assignDate);
    const deadline = isoDate(task.deadline);
    return task.status !== 'done'
      && (!task.assignDate || (isValidIsoDate(assignDate, false) && assignDate <= endDate))
      && (!task.deadline || (isValidIsoDate(deadline, false) && deadline >= startDate));
  });
  const selectedDocuments = documents.filter((document) => [document.docDate, document.createdAt, document.updatedAt].some((date) => date && inRange(date, startDate, endDate)));
  const selectedMeetings = (sources.meetings || []).filter((meeting) => [meeting.meetingTime, meeting.notifyTime, meeting.createdAt, meeting.updatedAt].some((date) => date && inRange(date, startDate, endDate)));
  const selectedResearches = (sources.researches || []).filter((research) => [research.researchTime, research.createdAt, research.updatedAt].some((date) => date && inRange(date, startDate, endDate)));
  const selectedSeals = (sources.seals || []).filter((seal) => [seal.sealTime, seal.createdAt, seal.updatedAt].some((date) => date && inRange(date, startDate, endDate)));
  const selectedMaterials = (sources.materials || []).filter((material) => [material.handlerTime, material.createdAt, material.updatedAt].some((date) => date && inRange(date, startDate, endDate)));
  const statusLabels: Record<Status, string> = { pending: '未启动', progress: '推进中', done: '已办结', overdue: '已超期' };
  const progressLines = selectedTasks.length
    ? selectedTasks.map((task, index) => {
      const detail = task.workSummary.trim().replace(/\s+/g, ' ') || `当前状态为${statusLabels[task.status]}`;
      return `${index + 1}. ${task.name}：${detail}${/[。！？!?]$/.test(detail) ? '' : '。'}`;
    })
    : ['本期没有匹配日期范围的任务记录。'];
  const documentLines = selectedDocuments.length
    ? selectedDocuments.map((document, index) => `${index + 1}. ${document.title}${document.code ? `（${document.code}）` : ''}，${document.receiptStatus || '待登记'}。`)
    : ['本期没有匹配日期范围的文件记录。'];
  const activityLines = [
    ...selectedMeetings.map((meeting, index) => `${index + 1}. 会议：${meeting.subject}${meeting.meetingTime ? `，时间${meeting.meetingTime.replace('T', ' ')}` : ''}${meeting.location ? `，地点${meeting.location}` : ''}。`),
    ...selectedResearches.map((research, index) => `${selectedMeetings.length + index + 1}. ${research.direction}：${research.subject}${research.location ? `，地点${research.location}` : ''}${research.achievements ? `；成果：${research.achievements}` : research.summary ? `；摘要：${research.summary}` : ''}。`)
  ];
  const supportLines = [
    ...selectedSeals.map((seal, index) => `${index + 1}. 用章：${seal.docName}，用章人${seal.userName}，审批人${seal.approver}。`),
    ...selectedMaterials.map((material, index) => `${selectedSeals.length + index + 1}. 物资${material.type === 'in' ? '入库' : '领用'}：${material.materialName}${material.spec ? `（${material.spec}）` : ''} ${material.quantity}。`)
  ];
  const pendingTasks = selectedTasks.filter((task) => task.status !== 'done');
  const nextLines = pendingTasks.length
    ? pendingTasks.map((task, index) => `${index + 1}. 继续推进${task.name}${task.deadline ? `，计划于${task.deadline}前完成` : ''}。`)
    : ['按既定安排跟踪后续事项，及时补充数据和佐证材料。'];
  const sectionLines: Record<Exclude<WeeklySectionSource, 'manual'>, string[]> = {
    overview: [`本期共跟进${selectedTasks.length}项任务，登记${selectedDocuments.length}份文件，记录${selectedMeetings.length}场会议、${selectedResearches.length}项外出活动、${selectedSeals.length}次用章和${selectedMaterials.length}笔物资收发。`],
    tasks: progressLines,
    documents: documentLines,
    activities: activityLines.length ? activityLines : ['本期没有匹配日期范围的会议或外出活动记录。'],
    support: supportLines.length ? supportLines : ['本期没有匹配日期范围的用章或物资收发记录。'],
    next: nextLines
  };
  const sections = template.sections.length ? template.sections : DEFAULT_WEEKLY_TEMPLATE.sections;
  const contentText = sections.flatMap((section, index) => [
    `${chineseOrdinal(index)}、${section.heading}`,
    ...(section.source === 'manual' ? [section.note?.trim() || '（本节内容请在此手工填写。）'] : sectionLines[section.source])
  ]).join('\n');
  return {
    contentText,
    taskIds: selectedTasks.map((task) => task.id),
    documentIds: selectedDocuments.map((document) => document.id),
    meetingIds: selectedMeetings.map((meeting) => meeting.id),
    researchIds: selectedResearches.map((research) => research.id),
    sealIds: selectedSeals.map((seal) => seal.id),
    materialIds: selectedMaterials.map((material) => material.id)
  };
}

export interface WorkStatisticsInput {
  tasks: Task[];
  meetings: MeetingRecord[];
  documents: OfficialDocument[];
  researches: ResearchRecord[];
  seals: SealRecord[];
  materials: MaterialRecord[];
}

export interface WorkStatistics {
  monthKey: string;
  category: string;
  taskTotal: number;
  taskNew: number;
  taskDone: number;
  taskProgress: number;
  taskPending: number;
  taskOverdue: number;
  statusBreakdown: Array<{ status: Status; count: number }>;
  categoryBreakdown: Array<{ name: string; count: number }>;
  meetings: number;
  documents: number;
  researches: number;
  seals: number;
  materialIn: number;
  materialOut: number;
}

const statisticsAnchor = {
  task: (task: Task) => task.assignDate || task.createdAt.slice(0, 10),
  meeting: (meeting: MeetingRecord) => meeting.meetingTime.slice(0, 10) || meeting.notifyTime || meeting.createdAt.slice(0, 10),
  document: (document: OfficialDocument) => document.docDate || document.createdAt.slice(0, 10),
  research: (research: ResearchRecord) => research.researchTime || research.createdAt.slice(0, 10),
  seal: (seal: SealRecord) => seal.sealTime || seal.createdAt.slice(0, 10),
  material: (material: MaterialRecord) => material.handlerTime || material.createdAt.slice(0, 10)
};

const inStatisticsMonth = (anchor: string, monthKey: string) => !monthKey || anchor.startsWith(monthKey);

export function listStatisticsMonths(input: WorkStatisticsInput): string[] {
  const keys = new Set<string>();
  const collect = (anchor: string) => { const key = anchor.slice(0, 7); if (/^\d{4}-\d{2}$/.test(key)) keys.add(key); };
  for (const task of input.tasks) collect(statisticsAnchor.task(task));
  for (const meeting of input.meetings) collect(statisticsAnchor.meeting(meeting));
  for (const document of input.documents) collect(statisticsAnchor.document(document));
  for (const research of input.researches) collect(statisticsAnchor.research(research));
  for (const seal of input.seals) collect(statisticsAnchor.seal(seal));
  for (const material of input.materials) collect(statisticsAnchor.material(material));
  return [...keys].sort((left, right) => right.localeCompare(left));
}

export function buildWorkStatistics(input: WorkStatisticsInput, options: { monthKey?: string; category?: string; today: string }): WorkStatistics {
  const monthKey = options.monthKey || '';
  const category = (options.category || '').trim();
  const monthTasks = input.tasks.filter((task) => inStatisticsMonth(statisticsAnchor.task(task), monthKey));
  const scopeTasks = category ? monthTasks.filter((task) => task.category.trim() === category) : monthTasks;
  const statusCounts: Record<Status, number> = { pending: 0, progress: 0, done: 0, overdue: 0 };
  let derivedOverdue = 0;
  for (const task of scopeTasks) {
    statusCounts[task.status] += 1;
    if (task.status === 'overdue' || (task.status !== 'done' && Boolean(task.deadline) && task.deadline < options.today)) derivedOverdue += 1;
  }
  const categoryCounts = new Map<string, number>();
  for (const task of monthTasks) {
    const name = task.category.trim() || '未分类';
    categoryCounts.set(name, (categoryCounts.get(name) || 0) + 1);
  }
  const taskNew = input.tasks.filter((task) => (!category || task.category.trim() === category) && inStatisticsMonth(task.createdAt.slice(0, 10), monthKey)).length;
  const countMonthly = <T,>(records: T[], anchor: (record: T) => string) => records.filter((record) => inStatisticsMonth(anchor(record), monthKey)).length;
  const monthMaterials = input.materials.filter((material) => inStatisticsMonth(statisticsAnchor.material(material), monthKey));
  return {
    monthKey,
    category,
    taskTotal: scopeTasks.length,
    taskNew,
    taskDone: statusCounts.done,
    taskProgress: statusCounts.progress,
    taskPending: statusCounts.pending,
    taskOverdue: derivedOverdue,
    statusBreakdown: (Object.entries(statusCounts) as Array<[Status, number]>).map(([status, count]) => ({ status, count })),
    categoryBreakdown: [...categoryCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'zh-CN')),
    meetings: countMonthly(input.meetings, statisticsAnchor.meeting),
    documents: countMonthly(input.documents, statisticsAnchor.document),
    researches: countMonthly(input.researches, statisticsAnchor.research),
    seals: countMonthly(input.seals, statisticsAnchor.seal),
    materialIn: monthMaterials.filter((material) => material.type === 'in').length,
    materialOut: monthMaterials.filter((material) => material.type === 'out').length
  };
}

export interface ExtractedTaskFields {
  name?: string;
  assigner?: string;
  assignDate?: string;
  deadline?: string;
  source?: string;
}

export interface TaskTextExtraction {
  fields: ExtractedTaskFields;
  recognized: string[];
}

const extractionDatePattern = /(\d{4})[-/年.](\d{1,2})[-/月.](\d{1,2})日?|(\d{1,2})月(\d{1,2})日/g;
const toIsoExtractionDate = (match: RegExpExecArray, today: string) => {
  const year = match[1] ? Number(match[1]) : Number(today.slice(0, 4));
  const month = Number(match[1] ? match[2] : match[4]);
  const day = Number(match[1] ? match[3] : match[5]);
  const candidate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isValidIsoDate(candidate, false) ? candidate : '';
};

export function extractTaskFromText(rawText: string, today: string): TaskTextExtraction {
  const text = rawText.replace(/\r\n/g, '\n').trim();
  const fields: ExtractedTaskFields = {};
  const recognized: string[] = [];
  if (!text) return { fields, recognized };

  const dates: Array<{ iso: string; index: number; length: number }> = [];
  extractionDatePattern.lastIndex = 0;
  for (let match = extractionDatePattern.exec(text); match; match = extractionDatePattern.exec(text)) {
    const iso = toIsoExtractionDate(match, today);
    if (iso) dates.push({ iso, index: match.index, length: match[0].length });
  }
  const deadlineBefore = /截止|期限|最晚|不迟于/;
  const deadlineAfter = /^[)）]?(之?前)(完成|报送|提交|反馈|上报|办结|报)?/;
  const assignBefore = /交办|安排|布置|收到|下达/;
  for (const date of dates) {
    const before = text.slice(Math.max(0, date.index - 10), date.index);
    const after = text.slice(date.index + date.length, date.index + date.length + 8);
    if (!fields.deadline && (deadlineBefore.test(before) || deadlineAfter.test(after))) { fields.deadline = date.iso; continue; }
    if (!fields.assignDate && assignBefore.test(before)) fields.assignDate = date.iso;
  }
  if (!fields.assignDate && dates.length && dates[0].index <= 2) fields.assignDate = dates[0].iso;

  const assignerPatterns = [
    /(?:交办人|安排人|布置人)[:：]\s*([^\s，。,;；、\n]{2,12})/,
    /(?:由|经)([^\s，。,;；、\n]{2,8}?(?:同志|主任|书记|局长|处长|科长|部长|镇长|区长|经理)?)(?:交办|安排|布置)/,
    /([^\s，。,;；、\n]{1,8}(?:主任|书记|局长|处长|科长|部长|镇长|区长|办公室|综合科))(?:要求|安排|布置|交办|通知)/
  ];
  for (const pattern of assignerPatterns) {
    const match = pattern.exec(text);
    if (match?.[1]) { fields.assigner = match[1]; break; }
  }

  const namedTask = /(?:任务|事项|工作内容)[:：]\s*([^\n。；;]{4,60})/.exec(text);
  if (namedTask?.[1]) {
    fields.name = namedTask[1].trim();
  } else {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      const cleaned = line
        .replace(/^\d{4}[-/年.]\d{1,2}[-/月.]\d{1,2}日?\s*(\d{1,2}[:：]\d{2})?\s*/, '')
        .replace(/^【[^】]*】\s*/, '')
        .replace(/^[\s:：、,，.。]+/, '')
        .replace(/[。！!？?\s]+$/, '');
      if (cleaned.length >= 4) { fields.name = cleaned.slice(0, 60); break; }
    }
  }

  if (/微信/.test(text)) fields.source = '微信';
  else if (/会议|议定|例会|调度会/.test(text)) fields.source = '会议';
  else if (/来文|收文|发文|文件|通知要求/.test(text)) fields.source = '收发文';
  else if (/电话|口头/.test(text)) fields.source = '口头安排';

  if (fields.name) recognized.push('任务名称');
  if (fields.assigner) recognized.push('交办人');
  if (fields.assignDate) recognized.push('交办日期');
  if (fields.deadline) recognized.push('截止日期');
  if (fields.source) recognized.push('任务来源');
  return { fields, recognized };
}

export const sampleTasks: Task[] = [
  {
    id: 'task_demo_1', name: '推进全省基层治理年度工作总结', category: '重点项目', source: '会议议定', assigner: '林晓岚',
    assignDate: '2026-07-20', deadline: '2026-07-28', status: 'progress', partnerStatus: [{ name: '福建省民政厅', status: 'progress', files: [] }], stages: [],
    remark: '汇总省直有关单位和厅机关处室数据，保留来源和口径。', workSummary: '已完成省级任务清单整理。', files: [],
    createdAt: '2026-07-20T08:00:00.000Z', updatedAt: '2026-07-27T01:00:00.000Z'
  },
  {
    id: 'task_demo_2', name: '整理省政府办公厅来文并建立关联', category: '日常工作', source: '文件收发', assigner: '陈致远',
    assignDate: '2026-07-21', deadline: '2026-07-25', status: 'pending', partnerStatus: [], stages: [],
    remark: '按省级公文工作类目归档。', workSummary: '', files: [],
    createdAt: '2026-07-21T08:00:00.000Z', updatedAt: '2026-07-27T01:01:00.000Z'
  }
];

export const sampleDocuments: OfficialDocument[] = [
  {
    id: 'doc_demo_1', title: '关于做好2026年全省重点工作的通知', code: '闽政〔2026〕1号', docType: '收文',
    docDate: '2026-07-18', securityLevel: '公开', fromUnit: '福建省人民政府办公厅', fileCategory: '重点项目', workCategory: '重点项目',
    handler: '陈致远', sendScope: '厅机关各处室', receiptStatus: '已登记', remark: '待关联省级重点任务。', files: [],
    createdAt: '2026-07-21T08:00:00.000Z', updatedAt: '2026-07-27T01:02:00.000Z'
  }
];

export const sampleMeetings: MeetingRecord[] = [{
  id: 'meeting_demo_1', subject: '全省重点工作协调推进会', sendTo: '福建省发展和改革委员会', receiver: '林晓岚、陈致远',
  notifyTime: '2026-07-22', meetingTime: '2026-07-24T09:00', location: '省政府会议室', remark: '虚构省级演示记录。', files: [],
  createdAt: '2026-07-22T08:00:00.000Z', updatedAt: '2026-07-27T01:03:00.000Z'
}];

export const sampleResearches: ResearchRecord[] = [{
  id: 'research_demo_1', researchTime: '2026-07-23', direction: '外出调研', subject: '基层服务阵地运行情况调研', location: '福州市鼓楼区',
  useCar: '否', participants: '林晓岚、郑明川', summary: '查看省级演示流程和台账字段。', achievements: '形成虚构问题清单。', remark: '虚构省级演示记录。', files: [],
  createdAt: '2026-07-23T08:00:00.000Z', updatedAt: '2026-07-27T01:04:00.000Z'
}];

export const sampleSeals: SealRecord[] = [{
  id: 'seal_demo_1', sealTime: '2026-07-24', userName: '郑明川', approver: '周宁', docName: '省直单位工作联系函', docType: '函',
  remark: '虚构省级演示记录，不代表真实审批。', files: [], createdAt: '2026-07-24T08:00:00.000Z', updatedAt: '2026-07-27T01:05:00.000Z'
}];

export const sampleMaterials: MaterialRecord[] = [{
  id: 'material_demo_1', materialName: 'A4 打印纸', spec: '70g / 500 张', quantity: 5, type: 'in', handlerTime: '2026-07-24', handler: '陈致远',
  fromUnit: '福建省人民政府办公厅综合处', remark: '虚构省级演示入库记录。', files: [], createdAt: '2026-07-24T09:00:00.000Z', updatedAt: '2026-07-27T01:06:00.000Z'
}];
