import {
  calculateMaterialStock,
  materialStockKey,
  normalizeTaskChecklist,
  relatedDocumentsForTask,
  relatedTasksForDocument,
  statusLabels,
  type EditableBusinessRecord,
  type MaterialRecord,
  type MeetingRecord,
  type OfficialDocument,
  type PartnerStatus,
  type ResearchRecord,
  type SealRecord,
  type Task,
} from '@hxhwang/domain';
import { encodeCsv, type CsvCell } from '@hxhwang/documents';

export type LedgerCsvKind = 'tasks' | 'meetings' | 'documents' | 'researches' | 'seals' | 'materials';

export interface LedgerCsvFile {
  content: string;
  fileName: string;
  mimeType: 'text/csv;charset=utf-8';
  rowCount: number;
  label: string;
}

interface LedgerCsvOptions {
  date: string;
}

interface TaskLedgerCsvOptions extends LedgerCsvOptions {
  documents: readonly OfficialDocument[];
}

interface DocumentLedgerCsvOptions extends LedgerCsvOptions {
  tasks: readonly Task[];
}

interface MaterialLedgerCsvOptions extends LedgerCsvOptions {
  allMaterials: readonly MaterialRecord[];
}

const partnerStatusLabels: Record<PartnerStatus['status'], string> = {
  notified: '已通知',
  pending: '待反馈',
  progress: '进行中',
  done: '已完成',
};

const labels: Record<LedgerCsvKind, string> = {
  tasks: '任务管理',
  meetings: '会议管理',
  documents: '文件收发',
  researches: '外出活动',
  seals: '用章管理',
  materials: '物资收发',
};

const taskHeaders = ['任务名称', '工作类目', '任务来源', '交办人', '交办日期', '截止日期', '状态', '关联文件', '配合单位', '任务阶段', '检查清单', '备注', '工作小结', '附件数量', '创建时间', '更新时间'] as const;
const meetingHeaders = ['会议主题', '发送对象', '接收方', '通知日期', '会议时间', '地点', '备注', '附件数量', '创建时间', '更新时间'] as const;
const documentHeaders = ['文件标题', '文号', '文件类型', '文件日期', '密级', '来源单位', '文件归类', '工作归类', '承办人', '发送范围', '登记状态', '关联任务', '备注', '附件数量', '创建时间', '更新时间'] as const;
const researchHeaders = ['活动日期', '活动类型', '活动主题', '地点', '用车', '参与人员', '情况摘要', '活动成果', '备注', '附件数量', '创建时间', '更新时间'] as const;
const sealHeaders = ['用章日期', '用章人', '审批人', '所盖文件', '文件类型', '备注', '附件数量', '创建时间', '更新时间'] as const;
const materialHeaders = ['物资名称', '规格', '收发类型', '数量', '经手日期', '经手人', '来源或领用单位', '账面库存', '备注', '附件数量', '创建时间', '更新时间'] as const;

const formatDateTime = (value: string) => value.replace('T', ' ');
const formatPartners = (partners: readonly PartnerStatus[]) => partners
  .map((partner) => `${partner.name.trim()}（${partnerStatusLabels[partner.status]}）`)
  .filter((value) => !value.startsWith('（'))
  .join('；');

const taskRows = (records: readonly Task[], documents: readonly OfficialDocument[]): CsvCell[][] => records.map((task) => [
  task.name,
  task.category,
  task.source,
  task.assigner,
  task.assignDate,
  task.deadline,
  statusLabels[task.status],
  relatedDocumentsForTask(task.id, documents).map((document) => document.title).join('；'),
  formatPartners(task.partnerStatus),
  task.stages.map((stage, index) => {
    const partners = formatPartners(stage.partnerStatus);
    return `${index + 1}. ${stage.name.trim()}${partners ? `：${partners}` : ''}`;
  }).join('；'),
  normalizeTaskChecklist(task.checklist).map((item, index) => `${index + 1}. ${item.done ? '已完成' : '未完成'}：${item.text}`).join('；'),
  task.remark,
  task.workSummary,
  task.files.length,
  formatDateTime(task.createdAt),
  formatDateTime(task.updatedAt),
]);

const meetingRows = (records: readonly MeetingRecord[]): CsvCell[][] => records.map((meeting) => [
  meeting.subject,
  meeting.sendTo,
  meeting.receiver,
  meeting.notifyTime,
  formatDateTime(meeting.meetingTime),
  meeting.location,
  meeting.remark,
  meeting.files.length,
  formatDateTime(meeting.createdAt),
  formatDateTime(meeting.updatedAt),
]);

const documentRows = (records: readonly OfficialDocument[], tasks: readonly Task[]): CsvCell[][] => records.map((document) => [
  document.title,
  document.code,
  document.docType,
  document.docDate,
  document.securityLevel,
  document.fromUnit,
  document.fileCategory,
  document.workCategory,
  document.handler,
  document.sendScope,
  document.receiptStatus,
  relatedTasksForDocument(document, tasks).map((task) => task.name).join('；'),
  document.remark,
  document.files.length,
  formatDateTime(document.createdAt),
  formatDateTime(document.updatedAt),
]);

const researchRows = (records: readonly ResearchRecord[]): CsvCell[][] => records.map((research) => [
  research.researchTime,
  research.direction,
  research.subject,
  research.location,
  research.useCar,
  research.participants,
  research.summary,
  research.achievements,
  research.remark,
  research.files.length,
  formatDateTime(research.createdAt),
  formatDateTime(research.updatedAt),
]);

const sealRows = (records: readonly SealRecord[]): CsvCell[][] => records.map((seal) => [
  seal.sealTime,
  seal.userName,
  seal.approver,
  seal.docName,
  seal.docType,
  seal.remark,
  seal.files.length,
  formatDateTime(seal.createdAt),
  formatDateTime(seal.updatedAt),
]);

const materialRows = (records: readonly MaterialRecord[], allMaterials: readonly MaterialRecord[]): CsvCell[][] => {
  const balances = calculateMaterialStock([...allMaterials]);
  return records.map((material) => [
    material.materialName,
    material.spec,
    material.type === 'in' ? '入库' : '领用',
    material.quantity,
    material.handlerTime,
    material.handler,
    material.fromUnit,
    balances.get(materialStockKey(material)) || 0,
    material.remark,
    material.files.length,
    formatDateTime(material.createdAt),
    formatDateTime(material.updatedAt),
  ]);
};

export function buildLedgerCsv(kind: 'tasks', records: readonly Task[], options: TaskLedgerCsvOptions): LedgerCsvFile;
export function buildLedgerCsv(kind: 'meetings', records: readonly MeetingRecord[], options: LedgerCsvOptions): LedgerCsvFile;
export function buildLedgerCsv(kind: 'documents', records: readonly OfficialDocument[], options: DocumentLedgerCsvOptions): LedgerCsvFile;
export function buildLedgerCsv(kind: 'researches', records: readonly ResearchRecord[], options: LedgerCsvOptions): LedgerCsvFile;
export function buildLedgerCsv(kind: 'seals', records: readonly SealRecord[], options: LedgerCsvOptions): LedgerCsvFile;
export function buildLedgerCsv(kind: 'materials', records: readonly MaterialRecord[], options: MaterialLedgerCsvOptions): LedgerCsvFile;
export function buildLedgerCsv(kind: LedgerCsvKind, records: readonly EditableBusinessRecord[], options: LedgerCsvOptions & { allMaterials?: readonly MaterialRecord[]; documents?: readonly OfficialDocument[]; tasks?: readonly Task[] }): LedgerCsvFile {
  let headers: readonly string[];
  let rows: CsvCell[][];
  if (kind === 'tasks') {
    if (!options.documents) throw new Error('任务台账导出需要当前 active 文件数组');
    headers = taskHeaders; rows = taskRows(records as readonly Task[], options.documents);
  }
  else if (kind === 'meetings') { headers = meetingHeaders; rows = meetingRows(records as readonly MeetingRecord[]); }
  else if (kind === 'documents') {
    if (!options.tasks) throw new Error('文件台账导出需要当前 active 任务数组');
    headers = documentHeaders; rows = documentRows(records as readonly OfficialDocument[], options.tasks);
  }
  else if (kind === 'researches') { headers = researchHeaders; rows = researchRows(records as readonly ResearchRecord[]); }
  else if (kind === 'seals') { headers = sealHeaders; rows = sealRows(records as readonly SealRecord[]); }
  else {
    if (!options.allMaterials) throw new Error('物资台账导出需要完整 active 物资流水');
    headers = materialHeaders;
    rows = materialRows(records as readonly MaterialRecord[], options.allMaterials);
  }
  const label = labels[kind];
  return {
    content: encodeCsv([headers, ...rows]),
    fileName: `hxhwang-gw-${label}-当前结果-${options.date}.csv`,
    mimeType: 'text/csv;charset=utf-8',
    rowCount: records.length,
    label,
  };
}
