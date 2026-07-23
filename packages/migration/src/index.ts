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

function sourceVersion(raw: RawRecord) {
  const meta = raw._meta as RawRecord | undefined;
  if (meta?.sourceApp && typeof meta.sourceApp === 'string') return meta.sourceApp;
  const storage = raw.localStorage as RawRecord | undefined;
  return storage?.wenxi_skills ? 'WenXiBuddy 0722' : 'WenXiBuddy 升级版04';
}

function taskFromLegacy(raw: RawRecord, version: string): Task {
  const createdAt = text(raw.createdAt) || nowIso();
  return {
    id: text(raw.id) || createId('task'), name: text(raw.name) || '未命名任务', category: text(raw.category) || '其他', source: text(raw.source),
    assigner: text(raw.assigner), assignDate: text(raw.assignDate), deadline: text(raw.deadline),
    status: ['pending', 'progress', 'done', 'overdue'].includes(text(raw.status)) ? text(raw.status) as Task['status'] : 'pending',
    partnerStatus: Array.isArray(raw.partnerStatus) ? raw.partnerStatus as Task['partnerStatus'] : [],
    stages: Array.isArray(raw.stages) ? raw.stages as Task['stages'] : [], remark: text(raw.remark), workSummary: text(raw.workSummary),
    files: list(raw.files), createdAt, updatedAt: text(raw.updatedAt) || createdAt, sourceVersion: version, legacyPayload: raw
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

function archiveFromLegacy(type: ArchiveRecord['type'], raw: RawRecord, version: string): ArchiveRecord {
  const title = text(raw.subject) || text(raw.docName) || text(raw.name) || text(raw.title) || '历史记录';
  const date = text(raw.meetingTime) || text(raw.researchTime) || text(raw.sealTime) || text(raw.createdAt);
  const summary = text(raw.remark) || text(raw.summary) || text(raw.achievements);
  const files = list(raw.files).concat(list(raw.photos));
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
  const data = text(raw.data) || text(raw.base64);
  return { id, name: text(raw.name) || `附件-${id}`, mimeType: text(raw.type) || text(raw.mimeType) || 'application/octet-stream', size: Number(raw.size) || data.length, data, sha256: await sha256Base64(data), createdAt: text(raw.createdAt) || nowIso() };
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
  const materials = parseStored(values, 'work_materials_data').map((record) => archiveFromLegacy('material', record, version));
  const weekly = parseStored(values, 'work_weekly_data').map((record) => archiveFromLegacy('weekly', record, version));
  const archives: ArchiveRecord[] = [...meetings, ...researches, ...seals, ...materials, ...weekly];
  const skills = parseStored(values, 'wenxi_skills').map((record) => skillFromLegacy(record, version));
  const files = Array.isArray(exportObject.indexedDBFiles) ? exportObject.indexedDBFiles.filter((entry): entry is RawRecord => Boolean(entry) && typeof entry === 'object') : [];
  const settings = Object.entries(values)
    .filter(([key]) => key.startsWith('wenxi_') || key.startsWith('work_') || key.startsWith('attach_'))
    .filter(([key]) => !['work_tasks_data', 'work_documents_data', 'work_meetings_data', 'work_researches_data', 'work_seals_data', 'work_materials_data', 'work_weekly_data', 'wenxi_skills'].includes(key))
    .map(([id, value]) => ({ id, value }));
  const warnings: string[] = [];
  if (!files.length) warnings.push('未发现 IndexedDB 附件；正文数据已导入。');
  return {
    tasks, documents, archives, attachments: await Promise.all(files.map(attachmentFromLegacy)), skills, settings,
    report: { sourceVersion: version, imported: { tasks: tasks.length, meetings: meetings.length, documents: documents.length, researches: researches.length, seals: seals.length, materials: materials.length, weekly: weekly.length, skills: skills.length, settings: settings.length }, attachments: files.length, warnings }
  };
}
