export type Status = 'pending' | 'progress' | 'done' | 'overdue';
export type WorkSummaryTemplateId = 'progress' | 'coordination' | 'completion';
export type ArchiveType = 'meeting' | 'research' | 'seal' | 'material' | 'weekly' | 'unknown';

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

export function buildWeeklyReportSummary(tasks: Task[], documents: OfficialDocument[], startDate: string, endDate: string) {
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
  const pendingTasks = selectedTasks.filter((task) => task.status !== 'done');
  const nextLines = pendingTasks.length
    ? pendingTasks.map((task, index) => `${index + 1}. 继续推进${task.name}${task.deadline ? `，计划于${task.deadline}前完成` : ''}。`)
    : ['按既定安排跟踪后续事项，及时补充数据和佐证材料。'];
  const contentText = [
    '一、总体情况',
    `本期共跟进${selectedTasks.length}项任务，登记${selectedDocuments.length}份文件。`,
    '二、重点进展',
    ...progressLines,
    '三、文件办理',
    ...documentLines,
    '四、下期安排',
    ...nextLines
  ].join('\n');
  return { contentText, taskIds: selectedTasks.map((task) => task.id), documentIds: selectedDocuments.map((document) => document.id) };
}

export const sampleTasks: Task[] = [
  {
    id: 'task_demo_1', name: '推进基层治理年度工作总结', category: '重点项目', source: '会议议定', assigner: '办公室',
    assignDate: '2026-07-20', deadline: '2026-07-28', status: 'progress', partnerStatus: [], stages: [],
    remark: '汇总各科室数据，保留来源和口径。', workSummary: '已完成任务清单整理。', files: [],
    createdAt: '2026-07-20T08:00:00.000Z', updatedAt: '2026-07-22T08:00:00.000Z'
  },
  {
    id: 'task_demo_2', name: '整理上级来文并建立关联', category: '日常工作', source: '文件收发', assigner: '综合科',
    assignDate: '2026-07-21', deadline: '2026-07-25', status: 'pending', partnerStatus: [], stages: [],
    remark: '按工作类目归档。', workSummary: '', files: [],
    createdAt: '2026-07-21T08:00:00.000Z', updatedAt: '2026-07-21T08:00:00.000Z'
  }
];

export const sampleDocuments: OfficialDocument[] = [
  {
    id: 'doc_demo_1', title: '关于做好年度重点工作的通知', code: '淮社工办发〔2026〕12号', docType: '收文',
    docDate: '2026-07-18', securityLevel: '公开', fromUnit: '区委办公室', fileCategory: '重点项目', workCategory: '重点项目',
    handler: '综合科', sendScope: '各科室', receiptStatus: '已登记', remark: '待关联任务。', files: [],
    createdAt: '2026-07-21T08:00:00.000Z', updatedAt: '2026-07-21T08:00:00.000Z'
  }
];
