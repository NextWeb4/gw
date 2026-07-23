export type Status = 'pending' | 'progress' | 'done' | 'overdue';
export type ArchiveType = 'meeting' | 'research' | 'seal' | 'material' | 'weekly' | 'unknown';

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
