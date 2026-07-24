import { createId, nowIso, type ArchiveRecord, type Attachment, type LegacySkill, type MigrationReport, type OfficialDocument, type Task } from '@hxhwang/domain';

export interface MigrationBundle {
  tasks: Task[];
  documents: OfficialDocument[];
  archives: ArchiveRecord[];
  attachments: Attachment[];
  skills: LegacySkill[];
  settings: Array<{ id: string; value: unknown }>;
  report: MigrationReport;
}

type RawRecord = Record<string, unknown>;

const parseStored = (storage: Record<string, unknown>, key: string): RawRecord[] => {
  const value = storage[key];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is RawRecord => Boolean(entry) && typeof entry === 'object') : [];
  } catch { return []; }
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const list = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const records = (value: unknown): RawRecord[] => {
  if (typeof value === 'string') {
    try { return records(JSON.parse(value)); } catch { return []; }
  }
  return Array.isArray(value) ? value.filter((entry): entry is RawRecord => Boolean(entry) && typeof entry === 'object') : [];
};

function collectTaskFileIds(raw: RawRecord) {
  const ids = new Set([...list(raw.files), ...list(raw.outputFiles)]);
  const collectPartners = (value: unknown) => {
    for (const partner of records(value)) for (const id of list(partner.files)) ids.add(id);
  };
  collectPartners(raw.partnerStatus);
  for (const stage of records(raw.stages)) collectPartners(stage.partnerStatus);
  for (const phase of records(raw.phaseHistory)) {
    for (const id of list(phase.outputFiles)) ids.add(id);
    for (const stage of records(phase.stageSnapshot)) collectPartners(stage.partnerStatus);
  }
  return [...ids];
}

function sourceVersion(raw: RawRecord) {
  const meta = raw._meta as RawRecord | undefined;
  const storage = raw.localStorage as RawRecord | undefined;
  if (storage?.wenxi_skills || storage?.wenxi_active_skill_id || raw.wenxiSkills || raw.skills) return 'WenXiBuddy 0722';
  if (meta?.sourceApp && typeof meta.sourceApp === 'string' && meta.sourceApp !== '任务管理系统LV08') return meta.sourceApp;
  return '任务管理系统LV08（升级版04 / WenXiBuddy 0722 导出格式未区分）';
}

function taskFromLegacy(raw: RawRecord, version: string): Task {
  const createdAt = text(raw.createdAt) || nowIso();
  return {
    id: text(raw.id) || createId('task'), name: text(raw.name) || '未命名任务', category: text(raw.category) || '其他', source: text(raw.source),
    assigner: text(raw.assigner), assignDate: text(raw.assignDate), deadline: text(raw.deadline),
    status: ['pending', 'progress', 'done', 'overdue'].includes(text(raw.status)) ? text(raw.status) as Task['status'] : 'pending',
    partnerStatus: Array.isArray(raw.partnerStatus) ? raw.partnerStatus as Task['partnerStatus'] : [],
    stages: Array.isArray(raw.stages) ? raw.stages as Task['stages'] : [], remark: text(raw.remark), workSummary: text(raw.workSummary),
    files: collectTaskFileIds(raw), createdAt, updatedAt: text(raw.updatedAt) || createdAt, sourceVersion: version, legacyPayload: raw
  };
}

function documentFromLegacy(raw: RawRecord, version: string): OfficialDocument {
  const createdAt = text(raw.createdAt) || nowIso();
  const docType = text(raw.docType);
  return {
    id: text(raw.id) || createId('doc'), title: text(raw.title) || '未命名文件', code: text(raw.code),
    docType: docType === '收文' || docType === '发文' ? docType : '其他', docDate: text(raw.docDate), securityLevel: text(raw.securityLevel),
    fromUnit: text(raw.fromUnit), fileCategory: text(raw.fileCategory), workCategory: text(raw.workCategory), handler: text(raw.handler),
    sendScope: text(raw.sendScope), receiptStatus: text(raw.receiptStatus), remark: text(raw.remark), files: list(raw.files),
    createdAt, updatedAt: text(raw.updatedAt) || createdAt, sourceVersion: version, legacyPayload: raw
  };
}

function archiveFromLegacy(type: ArchiveRecord['type'], raw: RawRecord, version: string, extraFiles: string[] = []): ArchiveRecord {
  const title = text(raw.subject) || text(raw.docName) || text(raw.materialName) || text(raw.name) || text(raw.title) || '历史记录';
  const date = text(raw.meetingTime) || text(raw.researchTime) || text(raw.sealTime) || text(raw.handlerTime) || text(raw.createdAt);
  const summary = text(raw.remark) || text(raw.summary) || text(raw.achievements);
  const files = [...new Set([...list(raw.files), ...list(raw.photos), ...extraFiles])];
  return { id: `${type}_${text(raw.id) || createId('legacy')}`, type, title, date, summary, sourceVersion: version, legacyPayload: raw, files, createdAt: text(raw.createdAt) || nowIso() };
}

function skillFromLegacy(raw: RawRecord, version: string): LegacySkill {
  return {
    id: text(raw.id) || createId('skill'),
    name: text(raw.name) || '未命名 Skill',
    content: text(raw.content),
    createdAt: text(raw.createdAt) || nowIso(),
    sourceVersion: version,
    legacyPayload: raw
  };
}

async function attachmentFromLegacy(raw: RawRecord): Promise<Attachment> {
  const id = text(raw.id) || createId('attachment');
  const sourceData = text(raw.data) || text(raw.base64);
  const dataUrl = /^data:([^;,]+)?(?:;[^,]*)?;base64,([\s\S]*)$/i.exec(sourceData);
  const data = (dataUrl?.[2] ?? sourceData).replace(/\s/g, '');
  const decodedSize = base64ByteLength(data);
  return {
    id,
    name: text(raw.name) || `附件-${id}`,
    mimeType: dataUrl?.[1] || text(raw.mimeType) || (text(raw.type).includes('/') ? text(raw.type) : '') || 'application/octet-stream',
    size: decodedSize ?? (Number(raw.size) || 0),
    data,
    sha256: await sha256Base64(data),
    createdAt: text(raw.createdAt) || text(raw.uploadedAt) || nowIso()
  };
}

function inlineMaterialAttachmentId(material: RawRecord, materialIndex: number, attachmentIndex: number) {
  const materialId = (text(material.id) || String(materialIndex)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return `material_inline_${materialId}_${attachmentIndex}`;
}

function base64ByteLength(data: string) {
  try { return atob(data).length; } catch { return undefined; }
}

async function sha256Base64(data: string) {
  try {
    const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  } catch { return undefined; }
}

export async function migrateLegacyExport(raw: unknown): Promise<MigrationBundle> {
  if (!raw || typeof raw !== 'object') throw new Error('导入文件不是 JSON 对象');
  const exportObject = raw as RawRecord;
  const storage = exportObject.localStorage;
  if (!storage || typeof storage !== 'object') throw new Error('导入文件缺少 localStorage 数据');
  const values = storage as Record<string, unknown>;
  const version = sourceVersion(exportObject);
  const tasks = parseStored(values, 'work_tasks_data').map((record) => taskFromLegacy(record, version));
  const documents = parseStored(values, 'work_documents_data').map((record) => documentFromLegacy(record, version));
  const meetings = parseStored(values, 'work_meetings_data').map((record) => archiveFromLegacy('meeting', record, version));
  const researches = parseStored(values, 'work_researches_data').map((record) => archiveFromLegacy('research', record, version));
  const seals = parseStored(values, 'work_seals_data').map((record) => archiveFromLegacy('seal', record, version));
  const materialRecords = parseStored(values, 'work_materials_data');
  const inlineMaterialRecords: RawRecord[] = [];
  const materials = materialRecords.map((record, materialIndex) => {
    const inlineIds = records(record.attachments).map((attachment, attachmentIndex) => {
      const id = text(attachment.id) || inlineMaterialAttachmentId(record, materialIndex, attachmentIndex);
      inlineMaterialRecords.push({ ...attachment, id, createdAt: text(attachment.createdAt) || text(record.createdAt) });
      return id;
    });
    return archiveFromLegacy('material', record, version, inlineIds);
  });
  const weekly = parseStored(values, 'work_weekly_data').map((record) => archiveFromLegacy('weekly', record, version));
  const archives: ArchiveRecord[] = [...meetings, ...researches, ...seals, ...materials, ...weekly];
  const skillRecords = parseStored(values, 'wenxi_skills');
  if (!skillRecords.length) skillRecords.push(...records(exportObject.wenxiSkills || exportObject.skills));
  const skills = skillRecords.map((record) => skillFromLegacy(record, version));
  const files = Array.isArray(exportObject.indexedDBFiles) ? exportObject.indexedDBFiles.filter((entry): entry is RawRecord => Boolean(entry) && typeof entry === 'object') : [];
  const settings = Object.entries(values)
    .filter(([key]) => key.startsWith('wenxi_') || key.startsWith('work_') || key.startsWith('attach_'))
    .filter(([key]) => !['work_tasks_data', 'work_documents_data', 'work_meetings_data', 'work_researches_data', 'work_seals_data', 'work_materials_data', 'work_weekly_data', 'wenxi_skills'].includes(key))
    .map(([id, value]) => ({ id, value }));
  const warnings: string[] = [];
  if (version.includes('未区分')) warnings.push('历史两版导出器使用相同 sourceApp/version，无法仅凭导出包可靠区分升级版04与 WenXiBuddy 0722。');
  if (!skills.length) warnings.push('导出包未包含 Skill；历史导出器默认只收集 work_/attach_ 前缀，如原系统存在 Skill 需另行补充 wenxi_skills。');
  if (!files.length) warnings.push('未发现 IndexedDB 附件；正文数据已导入。');
  const migratedAttachments = await Promise.all([...files, ...inlineMaterialRecords].map(attachmentFromLegacy));
  const attachmentById = new Map<string, Attachment>();
  for (const attachment of migratedAttachments) {
    if (attachmentById.has(attachment.id)) { warnings.push(`附件 ID 重复，已保留首条记录：${attachment.id}`); continue; }
    attachmentById.set(attachment.id, attachment);
  }
  const attachments = [...attachmentById.values()];
  const referencedAttachmentIds = new Set([
    ...tasks.flatMap((task) => task.files),
    ...documents.flatMap((document) => document.files),
    ...archives.flatMap((archive) => archive.files)
  ]);
  const missingAttachmentIds = [...referencedAttachmentIds].filter((id) => !attachmentById.has(id));
  if (missingAttachmentIds.length) warnings.push(`${missingAttachmentIds.length} 个附件引用未包含在导出包中：${missingAttachmentIds.slice(0, 10).join('、')}`);
  const invalidAttachments = attachments.filter((attachment) => !attachment.sha256).length;
  if (inlineMaterialRecords.length) warnings.push(`已从物资记录迁移 ${inlineMaterialRecords.length} 个内嵌附件。`);
  if (invalidAttachments) warnings.push(`${invalidAttachments} 个附件的数据不是有效 Base64，已保留原始字段但无法生成内容哈希。`);
  return {
    tasks, documents, archives, attachments, skills, settings,
    report: { sourceVersion: version, imported: { tasks: tasks.length, meetings: meetings.length, documents: documents.length, researches: researches.length, seals: seals.length, materials: materials.length, weekly: weekly.length, skills: skills.length, settings: settings.length }, attachments: attachments.length, warnings }
  };
}
