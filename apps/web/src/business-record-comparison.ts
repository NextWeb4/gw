import {
  isActiveBusinessRecord,
  relatedDocumentsForTask,
  relatedTasksForDocument,
  statusLabels,
  type MaterialRecord,
  type MeetingRecord,
  type OfficialDocument,
  type ResearchRecord,
  type SealRecord,
  type Task,
} from '@hxhwang/domain';

export type BusinessComparisonKind = 'task' | 'meeting' | 'document' | 'research' | 'seal' | 'material';

export interface BusinessComparisonRecordMap {
  task: Task;
  meeting: MeetingRecord;
  document: OfficialDocument;
  research: ResearchRecord;
  seal: SealRecord;
  material: MaterialRecord;
}

export interface BusinessComparisonCandidate {
  id: string;
  title: string;
}

export interface BusinessComparisonRow {
  key: string;
  label: string;
  sourceValue: string;
  targetValue: string;
  changed: boolean;
}

export interface BusinessRecordComparison {
  kind: BusinessComparisonKind;
  kindLabel: string;
  sourceTitle: string;
  targetTitle: string;
  differenceCount: number;
  rows: BusinessComparisonRow[];
}

export interface BusinessComparisonContext {
  tasks: readonly Task[];
  documents: readonly OfficialDocument[];
}

const kindLabels: Record<BusinessComparisonKind, string> = {
  task: '任务',
  meeting: '会议',
  document: '文件',
  research: '外出活动',
  seal: '用章记录',
  material: '物资记录',
};
const partnerStatusLabels: Record<Task['partnerStatus'][number]['status'], string> = { notified: '已通知', pending: '待反馈', progress: '进行中', done: '已完成' };

function recordTitle<K extends BusinessComparisonKind>(kind: K, record: BusinessComparisonRecordMap[K]) {
  if (kind === 'task') return (record as Task).name.trim() || '未命名任务';
  if (kind === 'meeting') return (record as MeetingRecord).subject.trim() || '未命名会议';
  if (kind === 'document') return (record as OfficialDocument).title.trim() || '未命名文件';
  if (kind === 'research') return (record as ResearchRecord).subject.trim() || '未命名外出活动';
  if (kind === 'seal') return (record as SealRecord).docName.trim() || '未命名用章文件';
  return (record as MaterialRecord).materialName.trim() || '未命名物资';
}

export function listBusinessComparisonCandidates<K extends BusinessComparisonKind>(
  kind: K,
  records: readonly BusinessComparisonRecordMap[K][],
  sourceId: string,
): BusinessComparisonCandidate[] {
  return records
    .filter(isActiveBusinessRecord)
    .filter((record) => record.id !== sourceId)
    .map((record) => ({ id: record.id, title: recordTitle(kind, record) }));
}

export function chooseInitialBusinessComparisonTarget(
  sourceId: string,
  candidates: readonly BusinessComparisonCandidate[],
  visibleIds: readonly string[],
): string | undefined {
  const candidateIds = new Set(candidates.filter((candidate) => candidate.id !== sourceId).map((candidate) => candidate.id));
  const sourceIndex = visibleIds.indexOf(sourceId);
  if (sourceIndex >= 0) {
    for (let index = sourceIndex + 1; index < visibleIds.length; index += 1) {
      if (candidateIds.has(visibleIds[index])) return visibleIds[index];
    }
    for (let index = sourceIndex - 1; index >= 0; index -= 1) {
      if (candidateIds.has(visibleIds[index])) return visibleIds[index];
    }
  }
  return candidates.find((candidate) => candidate.id !== sourceId)?.id;
}

function show(value: string | number | undefined) {
  const normalized = String(value ?? '').trim();
  return normalized || '未填写';
}

function timestamp(value: string) {
  return show(value.replace('T', ' ').slice(0, 16));
}

function attachmentCount(files: readonly string[]) {
  return `${files.length} 个`;
}

function partnerSummary(task: Task) {
  return show(task.partnerStatus
    .map((partner) => `${partner.name.trim() || '未填写单位'}：${partnerStatusLabels[partner.status]}`)
    .join('\n'));
}

function stageSummary(task: Task) {
  return show(task.stages.map((stage) => {
    const partners = stage.partnerStatus
      .map((partner) => `${partner.name.trim() || '未填写单位'}：${partnerStatusLabels[partner.status]}`)
      .join('；');
    return partners ? `${stage.name.trim() || '未命名阶段'}（${partners}）` : stage.name.trim() || '未命名阶段';
  }).join('\n'));
}

function relatedDocumentSummary(task: Task, documents: readonly OfficialDocument[]) {
  return show(relatedDocumentsForTask(task.id, documents).map((document) => document.title.trim()).filter(Boolean).join('\n'));
}

function relatedTaskSummary(document: OfficialDocument, tasks: readonly Task[]) {
  return show(relatedTasksForDocument(document, tasks).map((task) => task.name.trim()).filter(Boolean).join('\n'));
}

type FieldPair = { key: string; label: string; source: string | number | undefined; target: string | number | undefined };

function taskFields(source: Task, target: Task, context: BusinessComparisonContext): FieldPair[] {
  return [
    { key: 'name', label: '任务名称', source: source.name, target: target.name },
    { key: 'status', label: '状态', source: statusLabels[source.status], target: statusLabels[target.status] },
    { key: 'category', label: '工作类目', source: source.category, target: target.category },
    { key: 'source', label: '任务来源', source: source.source, target: target.source },
    { key: 'assigner', label: '交办人', source: source.assigner, target: target.assigner },
    { key: 'assignDate', label: '交办日期', source: source.assignDate, target: target.assignDate },
    { key: 'deadline', label: '截止日期', source: source.deadline, target: target.deadline },
    { key: 'partners', label: '配合单位', source: partnerSummary(source), target: partnerSummary(target) },
    { key: 'stages', label: '任务阶段', source: stageSummary(source), target: stageSummary(target) },
    { key: 'workSummary', label: '工作小结', source: source.workSummary, target: target.workSummary },
    { key: 'relatedDocuments', label: '关联文件', source: relatedDocumentSummary(source, context.documents), target: relatedDocumentSummary(target, context.documents) },
    { key: 'remark', label: '备注', source: source.remark, target: target.remark },
    { key: 'attachments', label: '附件数量', source: attachmentCount(source.files), target: attachmentCount(target.files) },
    { key: 'updatedAt', label: '最近更新', source: timestamp(source.updatedAt), target: timestamp(target.updatedAt) },
  ];
}

function meetingFields(source: MeetingRecord, target: MeetingRecord): FieldPair[] {
  return [
    { key: 'subject', label: '会议主题', source: source.subject, target: target.subject },
    { key: 'meetingTime', label: '会议时间', source: show(source.meetingTime.replace('T', ' ')), target: show(target.meetingTime.replace('T', ' ')) },
    { key: 'notifyTime', label: '通知日期', source: source.notifyTime, target: target.notifyTime },
    { key: 'sendTo', label: '发送对象', source: source.sendTo, target: target.sendTo },
    { key: 'receiver', label: '接收方', source: source.receiver, target: target.receiver },
    { key: 'location', label: '会议地点', source: source.location, target: target.location },
    { key: 'remark', label: '备注', source: source.remark, target: target.remark },
    { key: 'attachments', label: '附件数量', source: attachmentCount(source.files), target: attachmentCount(target.files) },
    { key: 'updatedAt', label: '最近更新', source: timestamp(source.updatedAt), target: timestamp(target.updatedAt) },
  ];
}

function documentFields(source: OfficialDocument, target: OfficialDocument, context: BusinessComparisonContext): FieldPair[] {
  return [
    { key: 'title', label: '文件标题', source: source.title, target: target.title },
    { key: 'code', label: '发文字号', source: source.code, target: target.code },
    { key: 'docType', label: '文件类型', source: source.docType, target: target.docType },
    { key: 'docDate', label: '文件日期', source: source.docDate, target: target.docDate },
    { key: 'securityLevel', label: '密级', source: source.securityLevel, target: target.securityLevel },
    { key: 'fromUnit', label: '来源单位', source: source.fromUnit, target: target.fromUnit },
    { key: 'fileCategory', label: '文件归类', source: source.fileCategory, target: target.fileCategory },
    { key: 'workCategory', label: '工作归类', source: source.workCategory, target: target.workCategory },
    { key: 'handler', label: '承办人', source: source.handler, target: target.handler },
    { key: 'sendScope', label: '发送范围', source: source.sendScope, target: target.sendScope },
    { key: 'receiptStatus', label: '登记状态', source: source.receiptStatus, target: target.receiptStatus },
    { key: 'relatedTasks', label: '关联任务', source: relatedTaskSummary(source, context.tasks), target: relatedTaskSummary(target, context.tasks) },
    { key: 'remark', label: '备注', source: source.remark, target: target.remark },
    { key: 'attachments', label: '附件数量', source: attachmentCount(source.files), target: attachmentCount(target.files) },
    { key: 'updatedAt', label: '最近更新', source: timestamp(source.updatedAt), target: timestamp(target.updatedAt) },
  ];
}

function researchFields(source: ResearchRecord, target: ResearchRecord): FieldPair[] {
  return [
    { key: 'subject', label: '活动主题', source: source.subject, target: target.subject },
    { key: 'direction', label: '活动类型', source: source.direction, target: target.direction },
    { key: 'researchTime', label: '活动日期', source: source.researchTime, target: target.researchTime },
    { key: 'location', label: '活动地点', source: source.location, target: target.location },
    { key: 'participants', label: '参与人员', source: source.participants, target: target.participants },
    { key: 'useCar', label: '是否用车', source: source.useCar, target: target.useCar },
    { key: 'summary', label: '活动摘要', source: source.summary, target: target.summary },
    { key: 'achievements', label: '成果记录', source: source.achievements, target: target.achievements },
    { key: 'remark', label: '备注', source: source.remark, target: target.remark },
    { key: 'attachments', label: '附件数量', source: attachmentCount(source.files), target: attachmentCount(target.files) },
    { key: 'updatedAt', label: '最近更新', source: timestamp(source.updatedAt), target: timestamp(target.updatedAt) },
  ];
}

function sealFields(source: SealRecord, target: SealRecord): FieldPair[] {
  return [
    { key: 'docName', label: '文件名称', source: source.docName, target: target.docName },
    { key: 'docType', label: '文件类型', source: source.docType, target: target.docType },
    { key: 'sealTime', label: '用章日期', source: source.sealTime, target: target.sealTime },
    { key: 'userName', label: '用章人', source: source.userName, target: target.userName },
    { key: 'approver', label: '审批人', source: source.approver, target: target.approver },
    { key: 'remark', label: '备注', source: source.remark, target: target.remark },
    { key: 'attachments', label: '附件数量', source: attachmentCount(source.files), target: attachmentCount(target.files) },
    { key: 'updatedAt', label: '最近更新', source: timestamp(source.updatedAt), target: timestamp(target.updatedAt) },
  ];
}

function materialFields(source: MaterialRecord, target: MaterialRecord): FieldPair[] {
  return [
    { key: 'materialName', label: '物资名称', source: source.materialName, target: target.materialName },
    { key: 'spec', label: '规格', source: source.spec, target: target.spec },
    { key: 'type', label: '收发类型', source: source.type === 'in' ? '入库' : '领用', target: target.type === 'in' ? '入库' : '领用' },
    { key: 'quantity', label: '数量', source: source.quantity, target: target.quantity },
    { key: 'handlerTime', label: '经手日期', source: source.handlerTime, target: target.handlerTime },
    { key: 'handler', label: '经手人', source: source.handler, target: target.handler },
    { key: 'fromUnit', label: '来源 / 领用单位', source: source.fromUnit, target: target.fromUnit },
    { key: 'remark', label: '备注', source: source.remark, target: target.remark },
    { key: 'attachments', label: '附件数量', source: attachmentCount(source.files), target: attachmentCount(target.files) },
    { key: 'updatedAt', label: '最近更新', source: timestamp(source.updatedAt), target: timestamp(target.updatedAt) },
  ];
}

export function buildBusinessRecordComparison<K extends BusinessComparisonKind>(
  kind: K,
  source: BusinessComparisonRecordMap[K],
  target: BusinessComparisonRecordMap[K],
  context: BusinessComparisonContext,
): BusinessRecordComparison {
  let fields: FieldPair[];
  if (kind === 'task') fields = taskFields(source as Task, target as Task, context);
  else if (kind === 'meeting') fields = meetingFields(source as MeetingRecord, target as MeetingRecord);
  else if (kind === 'document') fields = documentFields(source as OfficialDocument, target as OfficialDocument, context);
  else if (kind === 'research') fields = researchFields(source as ResearchRecord, target as ResearchRecord);
  else if (kind === 'seal') fields = sealFields(source as SealRecord, target as SealRecord);
  else fields = materialFields(source as MaterialRecord, target as MaterialRecord);

  const rows = fields.map((field) => {
    const sourceValue = show(field.source);
    const targetValue = show(field.target);
    return { key: field.key, label: field.label, sourceValue, targetValue, changed: sourceValue !== targetValue };
  });
  return {
    kind,
    kindLabel: kindLabels[kind],
    sourceTitle: recordTitle(kind, source),
    targetTitle: recordTitle(kind, target),
    differenceCount: rows.filter((row) => row.changed).length,
    rows,
  };
}
