import { addRxPlugin, createRxDatabase, type RxCollection, type RxDatabase } from 'rxdb';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import type {
  ArchiveRecord, Attachment, Draft, MaterialRecord, MeetingRecord, OfficialDocument, ResearchRecord, SealRecord, Task, WeeklyReport
} from '@hxhwang/domain';
import { sampleDocuments, sampleMaterials, sampleMeetings, sampleResearches, sampleSeals, sampleTasks } from '@hxhwang/domain';

export type Kind = 'task' | 'meeting' | 'document' | 'research' | 'seal' | 'material' | 'attachment' | 'draft' | 'weekly' | 'archive' | 'setting';
type RecordPayload = Task | MeetingRecord | OfficialDocument | ResearchRecord | SealRecord | MaterialRecord | Attachment | Draft | WeeklyReport | ArchiveRecord | Record<string, unknown>;
interface StoredRecord { id: string; kind: Kind; payload: RecordPayload; updatedAt: string; }
interface SnapshotRecord { id: string; kind: Kind; payload: RecordPayload; updatedAt?: string; }
const allowedKinds = new Set<Kind>(['task', 'meeting', 'document', 'research', 'seal', 'material', 'attachment', 'draft', 'weekly', 'archive', 'setting']);
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

export async function putRecord<T extends RecordPayload>(kind: Kind, id: string, payload: T): Promise<void> {
  const collection = await getDb();
  const existing = await collection.findOne(id).exec();
  if (existing && existing.kind !== kind) throw new Error(`记录 ID ${id} 已被 ${existing.kind} 类型占用，拒绝覆盖为 ${kind}`);
  await collection.upsert({ id, kind, payload, updatedAt: new Date().toISOString() });
}

export async function removeRecord(id: string): Promise<void> {
  const collection = await getDb();
  const doc = await collection.findOne(id).exec();
  if (doc) await doc.remove();
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

export async function removeAttachmentsIfUnreferenced(candidateIds: string[]) {
  const candidates = new Set(candidateIds.filter(Boolean));
  if (!candidates.size) return [];
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
}

export async function seedDemoData(): Promise<void> {
  const seedMarker = await getRecord<Record<string, unknown>>('demo-seed-v2');
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
    const existing = await listRecords(kind);
    if (existing.length) continue;
    for (const sample of samples) await putRecord(kind, sample.id, sample as RecordPayload);
  }
  await putRecord('setting', 'demo-seed-v2', { type: 'demo-seed', version: 2, seededAt: new Date().toISOString() });
}

export async function clearAllData(): Promise<void> {
  const collection = await getDb();
  const docs = await collection.find().exec();
  await Promise.all(docs.map((doc: any) => doc.remove()));
}

export async function exportLocalSnapshot() {
  const collection = await getDb();
  const docs = await collection.find().exec();
  return {
    format: 'hxhwang-gw-local-v1',
    exportedAt: new Date().toISOString(),
    author: 'HaoXiangHwang',
    records: docs.map((doc: any) => ({ id: doc.id, kind: doc.kind, payload: doc.payload, updatedAt: doc.updatedAt }))
  };
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
    const seenKind = seenKinds.get(record.id);
    if (seenKind) {
      warnings.push(seenKind === kind ? `跳过重复记录 ID：${record.id}` : `跳过跨类型 ID 冲突：${record.id}（${seenKind}/${kind}）`);
      continue;
    }
    seenKinds.set(record.id, kind);
    records.push({ id: record.id, kind, payload: record.payload as RecordPayload, updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined });
  }
  return { records, warnings };
}

export async function importLocalSnapshot(snapshot: unknown): Promise<{ imported: number; byKind: Record<Kind, number>; warnings: string[] }> {
  const { records, warnings } = parseLocalSnapshot(snapshot);
  let imported = 0;
  const byKind: Record<Kind, number> = { task: 0, meeting: 0, document: 0, research: 0, seal: 0, material: 0, attachment: 0, draft: 0, weekly: 0, archive: 0, setting: 0 };
  for (const record of records) {
    await putRecord(record.kind, record.id, record.payload);
    imported++;
    byKind[record.kind]++;
  }
  return { imported, byKind, warnings };
}
