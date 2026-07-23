import type { Attachment, Draft, OfficialDocument, Task } from '@hxhwang/domain';
import { putRecord } from '@hxhwang/local-data';
import type { AttachmentTransfer, PrivateSyncClient, PullResponse, SyncRecord } from '@hxhwang/sync-client';

interface WorkspaceData {
  tasks: Task[];
  documents: OfficialDocument[];
  drafts: Draft[];
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

type SyncedKind = 'task' | 'document' | 'draft' | 'attachment';
type RecordWriter = (kind: SyncedKind, id: string, payload: object) => Promise<void>;
const persistRecord: RecordWriter = (kind, id, payload) => putRecord(kind, id, payload as Record<string, unknown>);

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
  kind: 'task' | 'document' | 'draft',
  localDocuments: T[],
  writeRecord: RecordWriter
) {
  const remoteDocuments = await pullAll<T & SyncRecord>(client, collection);
  const localById = new Map(localDocuments.map((document) => [document.id, document]));
  const remoteById = new Map(remoteDocuments.map((document) => [document.id, document]));
  let pulled = 0;

  for (const remote of remoteDocuments) {
    const local = localById.get(remote.id);
    if (!local || remote.updatedAt >= local.updatedAt) {
      await writeRecord(kind, remote.id, remote);
      pulled++;
    }
  }

  const rows = localDocuments.flatMap((local) => {
    const remote = remoteById.get(local.id);
    if (remote && local.updatedAt <= remote.updatedAt) return [];
    return [{ newDocumentState: local as T & SyncRecord, assumedMasterState: remote || null }];
  });
  const pushed = rows.length ? await client.push<T & SyncRecord>(collection, rows) : { conflicts: [] };
  for (const master of pushed.conflicts) await writeRecord(kind, master.id, master);
  return { pulled, pushed: rows.length - pushed.conflicts.length, conflicts: pushed.conflicts.length, remoteDocuments };
}

const toTransfer = (attachment: Attachment): AttachmentTransfer | undefined => attachment.data && attachment.sha256 ? {
  id: attachment.id,
  name: attachment.name,
  mimeType: attachment.mimeType,
  size: attachment.size,
  dataBase64: attachment.data,
  sha256: attachment.sha256,
  createdAt: attachment.createdAt
} : undefined;

export async function syncPrivateWorkspace(client: PrivateSyncClient, data: WorkspaceData, writeRecord: RecordWriter = persistRecord): Promise<WorkspaceSyncResult> {
  const collections = await Promise.all([
    syncCollection(client, 'tasks', 'task', data.tasks, writeRecord),
    syncCollection(client, 'documents', 'document', data.documents, writeRecord),
    syncCollection(client, 'drafts', 'draft', data.drafts, writeRecord)
  ]);
  const result: WorkspaceSyncResult = {
    pulled: collections.reduce((total, item) => total + item.pulled, 0),
    pushed: collections.reduce((total, item) => total + item.pushed, 0),
    conflicts: collections.reduce((total, item) => total + item.conflicts, 0),
    attachmentsUploaded: 0,
    attachmentsDownloaded: 0,
    warnings: []
  };

  for (const attachment of data.attachments) {
    const transfer = toTransfer(attachment);
    if (!transfer) { result.warnings.push(`附件缺少正文或哈希，未上传：${attachment.name}`); continue; }
    await client.putAttachment(transfer);
    result.attachmentsUploaded++;
  }

  const knownAttachmentIds = new Set(data.attachments.map((attachment) => attachment.id));
  const referencedIds = new Set<string>();
  for (const task of [...data.tasks, ...collections[0].remoteDocuments]) task.files.forEach((id) => referencedIds.add(id));
  for (const document of [...data.documents, ...collections[1].remoteDocuments]) document.files.forEach((id) => referencedIds.add(id));
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
