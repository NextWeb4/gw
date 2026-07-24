import { createRxDatabase, type RxCollection, type RxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import type { ArchiveRecord, Attachment, Draft, OfficialDocument, Task } from '@hxhwang/domain';
import { sampleDocuments, sampleTasks } from '@hxhwang/domain';

type Kind = 'task' | 'document' | 'attachment' | 'draft' | 'archive' | 'setting';
type RecordPayload = Task | OfficialDocument | Attachment | Draft | ArchiveRecord | Record<string, unknown>;
interface StoredRecord { id: string; kind: Kind; payload: RecordPayload; updatedAt: string; }
interface SnapshotRecord { id: string; kind: Kind; payload: RecordPayload; updatedAt?: string; }
const allowedKinds = new Set<Kind>(['task', 'document', 'attachment', 'draft', 'archive', 'setting']);

const schema = {
  title: 'hxhwang record schema', version: 0, primaryKey: 'id', type: 'object', additionalProperties: false,
  properties: {
    id: { type: 'string', maxLength: 180 },
    kind: { type: 'string', enum: ['task', 'document', 'attachment', 'draft', 'archive', 'setting'] },
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
        await database.addCollections({ records: { schema } });
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

export async function seedDemoData(): Promise<void> {
  const tasks = await listRecords<Task>('task');
  if (tasks.length) return;
  for (const task of sampleTasks) await putRecord('task', task.id, task);
  for (const document of sampleDocuments) await putRecord('document', document.id, document);
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
  const byKind: Record<Kind, number> = { task: 0, document: 0, attachment: 0, draft: 0, archive: 0, setting: 0 };
  for (const record of records) {
    await putRecord(record.kind, record.id, record.payload);
    imported++;
    byKind[record.kind]++;
  }
  return { imported, byKind, warnings };
}
