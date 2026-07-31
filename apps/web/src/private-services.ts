import type { Attachment, Draft, MaterialRecord, MeetingRecord, OfficialDocument, PurgedBusinessRecord, ResearchRecord, SealRecord, Task, WeeklyReport } from '@hxhwang/domain';
import { isPurgedBusinessRecord } from '@hxhwang/domain';
import { attachmentIdsFromPayload, getRecord, putRecord, removeAttachmentsIfUnreferenced } from '@hxhwang/local-data';
import type { AttachmentTransfer, PrivateSyncClient, PullResponse, SyncRecord } from '@hxhwang/sync-client';

interface WorkspaceData {
  tasks: Array<Task | PurgedBusinessRecord>;
  meetings: Array<MeetingRecord | PurgedBusinessRecord>;
  documents: Array<OfficialDocument | PurgedBusinessRecord>;
  researches: Array<ResearchRecord | PurgedBusinessRecord>;
  seals: Array<SealRecord | PurgedBusinessRecord>;
  materials: Array<MaterialRecord | PurgedBusinessRecord>;
  drafts: Draft[];
  weeklyReports: WeeklyReport[];
  attachments: Attachment[];
}

export interface WorkspaceSyncResult {
  pulled: number;
  pushed: number;
  conflicts: number;
  attachmentsUploaded: number;
  attachmentsDownloaded: number;
  warnings: string[];
}

type SyncedKind = 'task' | 'meeting' | 'document' | 'research' | 'seal' | 'material' | 'draft' | 'weekly' | 'attachment';
type RecordWriter = (kind: SyncedKind, id: string, payload: object) => Promise<void>;
interface PulledRecordPersistence {
  writeRecord: RecordWriter;
  readRecord: (id: string) => Promise<object | undefined>;
  cleanupAttachments: (candidateIds: string[]) => Promise<string[]>;
}
const rawPersistRecord: RecordWriter = (kind, id, payload) => putRecord(kind, id, payload as Record<string, unknown>);

export async function persistPulledRecord(kind: SyncedKind, id: string, payload: object, overrides: Partial<PulledRecordPersistence> = {}) {
  const writeRecord = overrides.writeRecord || rawPersistRecord;
  const readRecord = overrides.readRecord || ((recordId: string) => getRecord<Record<string, unknown>>(recordId));
  const cleanupAttachments = overrides.cleanupAttachments || removeAttachmentsIfUnreferenced;
  const previous = isPurgedBusinessRecord(payload) ? await readRecord(id) : undefined;
  await writeRecord(kind, id, payload);
  if (previous && isPurgedBusinessRecord(payload)) await cleanupAttachments(attachmentIdsFromPayload(previous));
}

const persistRecord: RecordWriter = (kind, id, payload) => persistPulledRecord(kind, id, payload);

async function pullAll<T extends SyncRecord>(client: PrivateSyncClient, collection: string) {
  const documents: T[] = [];
  let checkpoint: { updatedAt: string; id: string } | null = null;
  for (;;) {
    const batch: PullResponse<T> = await client.pull<T>(collection, checkpoint, 500);
    documents.push(...batch.documents);
    if (batch.documents.length < 500 || !batch.checkpoint) break;
    checkpoint = batch.checkpoint;
  }
  return documents;
}

async function syncCollection<T extends { id: string; updatedAt: string }>(
  client: PrivateSyncClient,
  collection: string,
  kind: 'task' | 'meeting' | 'document' | 'research' | 'seal' | 'material' | 'draft' | 'weekly',
  localDocuments: T[],
  writeRecord: RecordWriter
) {
  const remoteDocuments = await pullAll<T & SyncRecord>(client, collection);
  const localById = new Map(localDocuments.map((document) => [document.id, document]));
  const remoteById = new Map(remoteDocuments.map((document) => [document.id, document]));
  const effectiveById = new Map<string, T & SyncRecord>(localDocuments.map((document) => [document.id, document as T & SyncRecord]));
  let pulled = 0;

  for (const remote of remoteDocuments) {
    const local = localById.get(remote.id);
    if (!local || remote.updatedAt >= local.updatedAt) {
      await writeRecord(kind, remote.id, remote);
      effectiveById.set(remote.id, remote);
      pulled++;
    }
  }

  const rows = localDocuments.flatMap((local) => {
    const remote = remoteById.get(local.id);
    if (remote && local.updatedAt <= remote.updatedAt) return [];
    return [{ newDocumentState: local as T & SyncRecord, assumedMasterState: remote || null }];
  });
  const pushed = rows.length ? await client.push<T & SyncRecord>(collection, rows) : { conflicts: [] };
  for (const master of pushed.conflicts) {
    await writeRecord(kind, master.id, master);
    effectiveById.set(master.id, master);
  }
  return { pulled, pushed: rows.length - pushed.conflicts.length, conflicts: pushed.conflicts.length, effectiveDocuments: [...effectiveById.values()] };
}

const toTransfer = (attachment: Attachment): AttachmentTransfer | undefined => attachment.data !== undefined && attachment.sha256 ? {
  id: attachment.id,
  name: attachment.name,
  mimeType: attachment.mimeType,
  size: attachment.size,
  dataBase64: attachment.data,
  sha256: attachment.sha256,
  createdAt: attachment.createdAt
} : undefined;

export async function syncPrivateWorkspace(client: PrivateSyncClient, data: WorkspaceData, writeRecord: RecordWriter = persistRecord): Promise<WorkspaceSyncResult> {
  const [taskSync, meetingSync, documentSync, researchSync, sealSync, materialSync, draftSync, weeklySync] = await Promise.all([
    syncCollection(client, 'tasks', 'task', data.tasks, writeRecord),
    syncCollection(client, 'meetings', 'meeting', data.meetings, writeRecord),
    syncCollection(client, 'documents', 'document', data.documents, writeRecord),
    syncCollection(client, 'researches', 'research', data.researches, writeRecord),
    syncCollection(client, 'seals', 'seal', data.seals, writeRecord),
    syncCollection(client, 'materials', 'material', data.materials, writeRecord),
    syncCollection(client, 'drafts', 'draft', data.drafts, writeRecord),
    syncCollection(client, 'weekly-reports', 'weekly', data.weeklyReports, writeRecord)
  ]);
  const collections = [taskSync, meetingSync, documentSync, researchSync, sealSync, materialSync, draftSync, weeklySync];
  const result: WorkspaceSyncResult = {
    pulled: collections.reduce((total, item) => total + item.pulled, 0),
    pushed: collections.reduce((total, item) => total + item.pushed, 0),
    conflicts: collections.reduce((total, item) => total + item.conflicts, 0),
    attachmentsUploaded: 0,
    attachmentsDownloaded: 0,
    warnings: []
  };

  const referencedIds = new Set<string>();
  const synchronizedRecords = [
    ...taskSync.effectiveDocuments,
    ...meetingSync.effectiveDocuments,
    ...documentSync.effectiveDocuments,
    ...researchSync.effectiveDocuments,
    ...sealSync.effectiveDocuments,
    ...materialSync.effectiveDocuments
  ];
  for (const record of synchronizedRecords) {
    for (const id of attachmentIdsFromPayload(record)) referencedIds.add(id);
  }

  for (const attachment of data.attachments) {
    if (!referencedIds.has(attachment.id)) continue;
    const transfer = toTransfer(attachment);
    if (!transfer) { result.warnings.push(`附件缺少正文或哈希，未上传：${attachment.name}`); continue; }
    await client.putAttachment(transfer);
    result.attachmentsUploaded++;
  }

  const knownAttachmentIds = new Set(data.attachments.map((attachment) => attachment.id));
  for (const id of referencedIds) {
    if (knownAttachmentIds.has(id)) continue;
    try {
      const attachment = await client.getAttachment(id);
      await writeRecord('attachment', attachment.id, { id: attachment.id, name: attachment.name, mimeType: attachment.mimeType, size: attachment.size, data: attachment.dataBase64, sha256: attachment.sha256, createdAt: attachment.createdAt });
      result.attachmentsDownloaded++;
    } catch { result.warnings.push(`服务端未返回引用附件：${id}`); }
  }

  return result;
}
