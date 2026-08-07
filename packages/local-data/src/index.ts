import { addRxPlugin, createRxDatabase, type RxCollection, type RxDatabase } from 'rxdb';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import type {
  ArchiveRecord, Attachment, DocumentRevision, Draft, MaterialRecord, MeetingRecord, OfficialDocument, PurgedBusinessRecord, ResearchRecord, SealRecord, StarredBusinessRecordsSetting, Task, WeeklyReport
} from '@hxhwang/domain';
import {
  isDocumentRevision, isPurgedBusinessRecord, mergeContactDirectory, minimizePurgedBusinessRecord, parseStarredBusinessRecordsSetting, pruneDocumentRevisions,
  STARRED_BUSINESS_RECORDS_SETTING_ID, STARRED_BUSINESS_RECORDS_SETTING_TYPE,
  sampleContactDirectory, sampleDocuments, sampleMaterials, sampleMeetings, sampleResearches, sampleSeals, sampleTasks
} from '@hxhwang/domain';

export type Kind = 'task' | 'meeting' | 'document' | 'research' | 'seal' | 'material' | 'attachment' | 'draft' | 'weekly' | 'archive' | 'setting';
export type BusinessKind = Extract<Kind, 'task' | 'meeting' | 'document' | 'research' | 'seal' | 'material'>;
type RecordPayload = Task | MeetingRecord | OfficialDocument | ResearchRecord | SealRecord | MaterialRecord | PurgedBusinessRecord | Attachment | Draft | WeeklyReport | ArchiveRecord | DocumentRevision | StarredBusinessRecordsSetting | Record<string, unknown>;
interface StoredRecord { id: string; kind: Kind; payload: RecordPayload; updatedAt: string; }
interface SnapshotRecord { id: string; kind: Kind; payload: RecordPayload; updatedAt?: string; }
const allowedKinds = new Set<Kind>(['task', 'meeting', 'document', 'research', 'seal', 'material', 'attachment', 'draft', 'weekly', 'archive', 'setting']);
const businessKinds = new Set<Kind>(['task', 'meeting', 'document', 'research', 'seal', 'material']);
const attachmentReferencingKinds = new Set<Kind>(['task', 'meeting', 'document', 'research', 'seal', 'material', 'archive']);
export const LOCAL_SCHEMA_VERSION = 2;
addRxPlugin(RxDBMigrationSchemaPlugin);

const schema = {
  title: 'hxhwang record schema', version: LOCAL_SCHEMA_VERSION, primaryKey: 'id', type: 'object', additionalProperties: false,
  properties: {
    id: { type: 'string', maxLength: 180 },
    kind: { type: 'string', enum: ['task', 'meeting', 'document', 'research', 'seal', 'material', 'attachment', 'draft', 'weekly', 'archive', 'setting'] },
    payload: { type: 'object', additionalProperties: true },
    updatedAt: { type: 'string', maxLength: 50 }
  }, required: ['id', 'kind', 'payload', 'updatedAt']
} as const;

type LocalCollections = { records: RxCollection<StoredRecord> };
type LocalDatabase = RxDatabase<LocalCollections>;
type DatabaseGlobal = typeof globalThis & { __hxhwangLocalDatabase?: Promise<LocalDatabase> };
const databaseGlobal = globalThis as DatabaseGlobal;
let recordMutationTail: Promise<void> = Promise.resolve();

function serializeRecordMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = recordMutationTail.then(operation);
  recordMutationTail = result.then(() => undefined, () => undefined);
  return result;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 50) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isDocumentRevisionCandidate(id: string, payload: RecordPayload) {
  return id.startsWith('document-revision_') || (isObjectRecord(payload) && payload.type === 'document-revision');
}

function isCanonicalDocumentRevisionRecord(id: string, payload: RecordPayload, updatedAt: unknown): payload is DocumentRevision {
  if (!isDocumentRevision(payload) || id !== payload.id) return false;
  return payload.targetId === payload.snapshot.id
    && payload.version === payload.snapshot.version
    && payload.createdAt === payload.snapshot.updatedAt
    && updatedAt === payload.createdAt
    && isCanonicalIsoTimestamp(payload.createdAt);
}

function isStarredBusinessRecordsCandidate(id: string, payload: RecordPayload) {
  return id === STARRED_BUSINESS_RECORDS_SETTING_ID
    || (isObjectRecord(payload) && payload.type === STARRED_BUSINESS_RECORDS_SETTING_TYPE);
}

function canonicalPayloadForRecord(kind: Kind, id: string, payload: RecordPayload): RecordPayload {
  if (kind !== 'setting' || !isStarredBusinessRecordsCandidate(id, payload)) return payload;
  return parseStarredBusinessRecordsSetting(payload) || payload;
}

function recordIdentityError(kind: Kind, id: string, payload: RecordPayload, updatedAt?: unknown) {
  if (kind === 'draft' && (!isObjectRecord(payload) || payload.id !== id)) return `主草稿身份不匹配：${id}`;
  if (kind === 'weekly' && (!isObjectRecord(payload) || payload.id !== id)) return `周报身份不匹配：${id}`;
  if (kind === 'setting' && isStarredBusinessRecordsCandidate(id, payload)) {
    if (id !== STARRED_BUSINESS_RECORDS_SETTING_ID) return `星标记录设置身份不匹配：${id}`;
    if (!parseStarredBusinessRecordsSetting(payload)) return `星标记录设置无效：${id}`;
  }
  if (kind === 'setting' && isDocumentRevisionCandidate(id, payload) && !isCanonicalDocumentRevisionRecord(id, payload, updatedAt)) {
    return `文稿历史身份不匹配：${id}`;
  }
  return undefined;
}

function storedUpdatedAt(kind: Kind, payload: RecordPayload, preferred?: unknown) {
  if (kind === 'setting' && isDocumentRevision(payload)) return payload.createdAt;
  if (kind === 'setting' && isObjectRecord(payload) && payload.type === STARRED_BUSINESS_RECORDS_SETTING_TYPE && isCanonicalIsoTimestamp(payload.updatedAt)) return payload.updatedAt;
  return isCanonicalIsoTimestamp(preferred) ? preferred : new Date().toISOString();
}

async function getDb() {
  const database = databaseGlobal.__hxhwangLocalDatabase ??= createRxDatabase<LocalCollections>({ name: 'hxhwang_gw_local', storage: getRxStorageDexie(), multiInstance: false })
      .then(async (database) => {
        await database.addCollections({ records: { schema, migrationStrategies: { 1: (document: StoredRecord) => document, 2: (document: StoredRecord) => document } } });
        await database.records.migratePromise();
        return database;
      });
  const db = await database;
  return db.records;
}

export async function listRecords<T extends RecordPayload>(kind: Kind): Promise<T[]> {
  const collection = await getDb();
  const docs = await collection.find({ selector: { kind } }).exec();
  return docs.map((doc: any) => doc.payload as T);
}

export async function getRecord<T extends RecordPayload>(id: string): Promise<T | undefined> {
  const collection = await getDb();
  const doc = await collection.findOne(id).exec();
  return doc?.payload as T | undefined;
}

export async function getRecordOfKind<T extends RecordPayload>(kind: Kind, id: string): Promise<T | undefined> {
  const collection = await getDb();
  const doc = await collection.findOne(id).exec();
  if (!doc) return undefined;
  if (doc.kind !== kind) throw new Error(`记录 ID ${id} 属于 ${doc.kind}，拒绝按 ${kind} 类型读取`);
  return doc.payload as T;
}

async function putRecordUnlocked<T extends RecordPayload>(collection: RxCollection<StoredRecord>, kind: Kind, id: string, payload: T, preferredUpdatedAt?: unknown) {
  const canonicalPayload = canonicalPayloadForRecord(kind, id, payload);
  const updatedAt = storedUpdatedAt(kind, canonicalPayload, preferredUpdatedAt);
  const identityError = recordIdentityError(kind, id, canonicalPayload, updatedAt);
  if (identityError) throw new Error(identityError);
  const existing = await collection.findOne(id).exec();
  if (existing && existing.kind !== kind) throw new Error(`记录 ID ${id} 已被 ${existing.kind} 类型占用，拒绝覆盖为 ${kind}`);
  await collection.upsert({ id, kind, payload: canonicalPayload, updatedAt });
}

export function putRecord<T extends RecordPayload>(kind: Kind, id: string, payload: T): Promise<void> {
  return serializeRecordMutation(async () => {
    const collection = await getDb();
    await putRecordUnlocked(collection, kind, id, payload);
  });
}

async function removeRecordUnlocked(collection: RxCollection<StoredRecord>, id: string) {
  const doc = await collection.findOne(id).exec();
  if (doc) await doc.remove();
}

async function removeRecordOfKindUnlocked(collection: RxCollection<StoredRecord>, kind: Kind, id: string) {
  const doc = await collection.findOne(id).exec();
  if (!doc) return;
  if (doc.kind !== kind) throw new Error(`记录 ID ${id} 属于 ${doc.kind}，拒绝按 ${kind} 类型删除`);
  await doc.remove();
}

export function removeRecord(id: string): Promise<void> {
  return serializeRecordMutation(async () => {
    const collection = await getDb();
    await removeRecordUnlocked(collection, id);
  });
}

export function removeRecordOfKind(kind: Kind, id: string): Promise<void> {
  return serializeRecordMutation(async () => {
    const collection = await getDb();
    await removeRecordOfKindUnlocked(collection, kind, id);
  });
}

export function attachmentIdsFromPayload(payload: unknown) {
  const ids = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'legacyPayload') continue;
      if (key === 'files' && Array.isArray(child)) {
        for (const id of child) if (typeof id === 'string' && id) ids.add(id);
        continue;
      }
      visit(child);
    }
  };
  visit(payload);
  return [...ids];
}

export function removeAttachmentsIfUnreferenced(candidateIds: string[]) {
  const candidates = new Set(candidateIds.filter(Boolean));
  if (!candidates.size) return Promise.resolve([] as string[]);
  return serializeRecordMutation(async () => {
    const collection = await getDb();
    const docs = await collection.find().exec();
    const referenced = new Set<string>();
    for (const doc of docs) {
      const record = doc.toJSON() as StoredRecord;
      if (!attachmentReferencingKinds.has(record.kind)) continue;
      for (const id of attachmentIdsFromPayload(record.payload)) referenced.add(id);
    }
    const removed: string[] = [];
    for (const id of candidates) {
      if (referenced.has(id)) continue;
      const attachment = await collection.findOne(id).exec();
      if (attachment?.toJSON().kind !== 'attachment') continue;
      await attachment.remove();
      removed.push(id);
    }
    return removed;
  });
}

export async function putPurgedBusinessRecord(kind: BusinessKind, id: string, payload: PurgedBusinessRecord) {
  const previous = await getRecordOfKind<RecordPayload>(kind, id);
  const attachmentIds = attachmentIdsFromPayload(previous);
  await putRecord(kind, id, minimizePurgedBusinessRecord(payload));
  return removeAttachmentsIfUnreferenced(attachmentIds);
}

const previousDemoUpdatedAt = new Map([
  ['task_demo_1', '2026-07-22T08:00:00.000Z'],
  ['task_demo_2', '2026-07-21T08:00:00.000Z'],
  ['doc_demo_1', '2026-07-21T08:00:00.000Z'],
  ['meeting_demo_1', '2026-07-22T08:00:00.000Z'],
  ['research_demo_1', '2026-07-23T08:00:00.000Z'],
  ['seal_demo_1', '2026-07-24T08:00:00.000Z'],
  ['material_demo_1', '2026-07-24T09:00:00.000Z']
]);

export function shouldRefreshDemoRecord(id: string, existing?: { updatedAt?: string }) {
  return !existing || existing.updatedAt === previousDemoUpdatedAt.get(id);
}

export async function seedDemoData(): Promise<void> {
  const seedMarker = await getRecordOfKind<Record<string, unknown>>('setting', 'demo-seed-v3');
  if (seedMarker) return;
  const groups: Array<[Kind, Array<{ id: string }>]> = [
    ['task', sampleTasks],
    ['meeting', sampleMeetings],
    ['document', sampleDocuments],
    ['research', sampleResearches],
    ['seal', sampleSeals],
    ['material', sampleMaterials]
  ];
  for (const [kind, samples] of groups) {
    for (const sample of samples) {
      const existing = await getRecordOfKind<{ id: string; updatedAt?: string } & Record<string, unknown>>(kind, sample.id);
      if (shouldRefreshDemoRecord(sample.id, existing)) await putRecord(kind, sample.id, sample as RecordPayload);
    }
  }
  const existingDirectory = await getRecordOfKind<Record<string, unknown>>('setting', 'contact-directory');
  if (!existingDirectory) {
    const [tasks, meetings, documents, researches, seals, materials] = await Promise.all([
      listRecords<Task>('task'), listRecords<MeetingRecord>('meeting'), listRecords<OfficialDocument>('document'),
      listRecords<ResearchRecord>('research'), listRecords<SealRecord>('seal'), listRecords<MaterialRecord>('material')
    ]);
    const people = [
      ...tasks.map((task) => task.assigner), ...meetings.flatMap((meeting) => meeting.receiver.split(/[、，,;；\n]/)),
      ...documents.map((document) => document.handler), ...researches.flatMap((research) => research.participants.split(/[、，,;；\n]/)),
      ...seals.flatMap((seal) => [seal.userName, seal.approver]), ...materials.map((material) => material.handler)
    ];
    const units = [
      ...tasks.flatMap((task) => [...task.partnerStatus.map((partner) => partner.name), ...task.stages.flatMap((stage) => stage.partnerStatus.map((partner) => partner.name))]),
      ...meetings.map((meeting) => meeting.sendTo), ...documents.map((document) => document.fromUnit), ...materials.map((material) => material.fromUnit)
    ];
    const directory = mergeContactDirectory(sampleContactDirectory, people, units, sampleContactDirectory.updatedAt);
    await putRecord('setting', 'contact-directory', { type: 'contact-directory', ...directory });
  }
  await putRecord('setting', 'demo-seed-v3', { type: 'demo-seed', version: 3, seededAt: new Date().toISOString() });
}

export function clearAllData(): Promise<void> {
  return serializeRecordMutation(async () => {
    const collection = await getDb();
    const docs = await collection.find().exec();
    await Promise.all(docs.map((doc: any) => doc.remove()));
  });
}

export function exportLocalSnapshot() {
  return serializeRecordMutation(async () => {
    const collection = await getDb();
    const docs = await collection.find().exec();
    return {
      format: 'hxhwang-gw-local-v1',
      exportedAt: new Date().toISOString(),
      author: 'HaoXiangHwang',
      records: docs.map((doc: any) => {
        if (isStarredBusinessRecordsCandidate(doc.id, doc.payload)) {
          if (doc.id !== STARRED_BUSINESS_RECORDS_SETTING_ID || !parseStarredBusinessRecordsSetting(doc.payload)) {
            throw new Error(`星标记录设置无效，拒绝导出：${doc.id}`);
          }
        }
        return { id: doc.id, kind: doc.kind, payload: snapshotPayloadForRecord(doc.kind, doc.payload), updatedAt: doc.updatedAt };
      })
    };
  });
}

export function snapshotPayloadForRecord(kind: Kind, payload: RecordPayload): RecordPayload {
  if (kind === 'setting' && isObjectRecord(payload) && payload.type === STARRED_BUSINESS_RECORDS_SETTING_TYPE) {
    const parsed = parseStarredBusinessRecordsSetting(payload);
    if (!parsed) throw new Error('星标记录设置无效，拒绝导出');
    return parsed;
  }
  return businessKinds.has(kind) && isPurgedBusinessRecord(payload) ? minimizePurgedBusinessRecord(payload) : payload;
}

export function parseLocalSnapshot(snapshot: unknown): { records: SnapshotRecord[]; warnings: string[] } {
  const warnings: string[] = [];
  if (!snapshot || typeof snapshot !== 'object') throw new Error('不是有效的 HxHwang Gw 数据快照');
  const rawSnapshot = snapshot as { format?: unknown; records?: unknown };
  if (rawSnapshot.format !== 'hxhwang-gw-local-v1' || !Array.isArray(rawSnapshot.records)) {
    throw new Error('不是有效的 HxHwang Gw 数据快照');
  }
  if (rawSnapshot.records.length > 50_000) throw new Error('本地快照记录数超过 50000 条限制');

  const records: SnapshotRecord[] = [];
  const seenKinds = new Map<string, Kind>();
  for (const entry of rawSnapshot.records) {
    if (!entry || typeof entry !== 'object') { warnings.push('跳过非对象记录'); continue; }
    const record = entry as { id?: unknown; kind?: unknown; payload?: unknown; updatedAt?: unknown };
    if (typeof record.id !== 'string' || !record.id || record.id.length > 180) { warnings.push('跳过无效 id 的记录'); continue; }
    if (typeof record.kind !== 'string' || !allowedKinds.has(record.kind as Kind)) { warnings.push(`跳过未知类型记录：${record.id}`); continue; }
    if (!record.payload || typeof record.payload !== 'object' || Array.isArray(record.payload)) { warnings.push(`跳过无效 payload：${record.id}`); continue; }
    const kind = record.kind as Kind;
    const payload = record.payload as Record<string, unknown>;
    const canonicalPayload = canonicalPayloadForRecord(kind, record.id, payload);
    const identityError = recordIdentityError(kind, record.id, canonicalPayload, record.updatedAt);
    if (identityError) {
      warnings.push(`跳过${identityError}`);
      continue;
    }
    if (kind === 'setting' && payload.type === 'custom-writing-template') {
      const templateId = payload.id;
      if (typeof templateId !== 'string' || !templateId || record.id !== `custom-template:${templateId}`) {
        warnings.push(`跳过自定义格式身份不匹配：${record.id}`);
        continue;
      }
    }
    const seenKind = seenKinds.get(record.id);
    if (seenKind) {
      warnings.push(seenKind === kind ? `跳过重复记录 ID：${record.id}` : `跳过跨类型 ID 冲突：${record.id}（${seenKind}/${kind}）`);
      continue;
    }
    seenKinds.set(record.id, kind);
    const canonicalUpdatedAt = kind === 'setting' && isObjectRecord(canonicalPayload) && canonicalPayload.type === STARRED_BUSINESS_RECORDS_SETTING_TYPE
      ? canonicalPayload.updatedAt as string
      : typeof record.updatedAt === 'string' ? record.updatedAt : undefined;
    records.push({ id: record.id, kind, payload: snapshotPayloadForRecord(kind, canonicalPayload), updatedAt: canonicalUpdatedAt });
  }
  return { records, warnings };
}

export function importLocalSnapshot(snapshot: unknown): Promise<{ imported: number; byKind: Record<Kind, number>; warnings: string[] }> {
  const { records, warnings } = parseLocalSnapshot(snapshot);
  return serializeRecordMutation(async () => {
    const collection = await getDb();
    const existingDocs = await collection.find().exec();
    const existingKinds = new Map(existingDocs.map((doc) => [doc.id, doc.kind] as const));
    const conflicts = records.filter((record) => {
      const existingKind = existingKinds.get(record.id);
      return existingKind !== undefined && existingKind !== record.kind;
    });
    if (conflicts.length) {
      const conflict = conflicts[0];
      throw new Error(`本地快照记录 ID ${conflict.id} 已被 ${existingKinds.get(conflict.id)} 类型占用，拒绝覆盖为 ${conflict.kind}`);
    }

    let imported = 0;
    const byKind: Record<Kind, number> = { task: 0, meeting: 0, document: 0, research: 0, seal: 0, material: 0, attachment: 0, draft: 0, weekly: 0, archive: 0, setting: 0 };
    for (const record of records) {
      await putRecordUnlocked(collection, record.kind, record.id, record.payload, record.updatedAt);
      imported++;
      byKind[record.kind]++;
    }

    const settingDocs = await collection.find({ selector: { kind: 'setting' } }).exec();
    const revisions = settingDocs
      .map((doc) => doc.toJSON() as StoredRecord)
      .filter((record): record is StoredRecord & { payload: DocumentRevision } => isCanonicalDocumentRevisionRecord(record.id, record.payload, record.updatedAt))
      .map((record) => record.payload);
    const pruned = pruneDocumentRevisions(revisions);
    for (const revision of pruned.removed) await removeRecordOfKindUnlocked(collection, 'setting', revision.id);
    if (pruned.removed.length) warnings.push(`已按本机版本历史上限裁剪 ${pruned.removed.length} 条最旧记录`);
    return { imported, byKind, warnings };
  });
}
