import { describe, expect, it, vi } from 'vitest';
import { moveBusinessRecordToTrash, purgeBusinessRecord, sampleDocuments, sampleMaterials, sampleMeetings, sampleResearches, sampleSeals, sampleTasks, type Attachment, type Draft, type Task, type WeeklyReport } from '@hxhwang/domain';
import type { PrivateSyncClient, SyncRecord } from '@hxhwang/sync-client';
import { persistPulledRecord, syncPrivateWorkspace } from './private-services';

describe('private workspace sync', () => {
  it('pulls newer masters, pushes local-only records and transfers attachments', async () => {
    const localTask: Task = { ...sampleTasks[0], id: 'task-sync', files: ['attachment-sync', 'attachment-empty'], updatedAt: '2026-07-23T01:00:00.000Z' };
    const remoteTask: Task & SyncRecord = { ...localTask, name: '服务端较新任务', updatedAt: '2026-07-23T02:00:00.000Z' };
    const draft: Draft = { id: 'draft-sync', title: '待同步文稿', documentType: '报告', contentHtml: '<p>正文</p>', contentText: '正文', templateId: 'work-summary', version: 1, updatedAt: '2026-07-23T03:00:00.000Z' };
    const weeklyReport: WeeklyReport = { id: 'weekly-sync', title: '本周工作', startDate: '2026-07-20', endDate: '2026-07-26', contentText: '正文', taskIds: [], documentIds: [], version: 1, createdAt: '2026-07-23T03:00:00.000Z', updatedAt: '2026-07-23T03:00:00.000Z' };
    const attachment: Attachment = { id: 'attachment-sync', name: 'evidence.txt', mimeType: 'text/plain', size: 3, data: 'YWJj', sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', createdAt: '2026-07-23T01:00:00.000Z' };
    const emptyAttachment: Attachment = { id: 'attachment-empty', name: 'empty.txt', mimeType: 'text/plain', size: 0, data: '', sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', createdAt: '2026-07-23T01:00:00.000Z' };
    const orphanAttachment: Attachment = { ...attachment, id: 'attachment-orphan', name: 'orphan.txt' };
    const pull = vi.fn(async (collection: string) => ({ documents: collection === 'tasks' ? [remoteTask] : [], checkpoint: null }));
    const push = vi.fn(async (_collection: string, _rows: unknown[]) => ({ conflicts: [] }));
    const putAttachment = vi.fn(async (value: unknown) => value);
    const writeRecord = vi.fn(async (_kind: string, _id: string, _payload: object) => {});
    const client = { pull, push, putAttachment, getAttachment: vi.fn() } as unknown as PrivateSyncClient;

    const result = await syncPrivateWorkspace(client, { tasks: [localTask], meetings: [], documents: [], researches: [], seals: [], materials: [], drafts: [draft], weeklyReports: [weeklyReport], attachments: [attachment, emptyAttachment, orphanAttachment] }, writeRecord);

    expect(writeRecord).toHaveBeenCalledWith('task', localTask.id, expect.objectContaining({ name: '服务端较新任务', updatedAt: remoteTask.updatedAt }));
    expect(push).toHaveBeenCalledTimes(2);
    const draftPush = push.mock.calls.find((call) => call[0] === 'drafts');
    expect(draftPush?.[1]?.[0]).toMatchObject({ newDocumentState: { id: draft.id }, assumedMasterState: null });
    const weeklyPush = push.mock.calls.find((call) => call[0] === 'weekly-reports');
    expect(weeklyPush?.[1]?.[0]).toMatchObject({ newDocumentState: { id: weeklyReport.id }, assumedMasterState: null });
    expect(putAttachment).toHaveBeenCalledWith(expect.objectContaining({ id: attachment.id, dataBase64: 'YWJj' }));
    expect(putAttachment).toHaveBeenCalledWith(expect.objectContaining({ id: emptyAttachment.id, dataBase64: '', size: 0 }));
    expect(putAttachment).not.toHaveBeenCalledWith(expect.objectContaining({ id: orphanAttachment.id }));
    expect(result).toMatchObject({ pulled: 1, pushed: 2, conflicts: 0, attachmentsUploaded: 2 });
  });

  it('pushes a newer local state with the exact remote master assumption', async () => {
    const localTask: Task = { ...sampleTasks[0], id: 'task-newer-local', updatedAt: '2026-07-23T03:00:00.000Z' };
    const remoteTask: Task & SyncRecord = { ...localTask, name: '旧服务端任务', updatedAt: '2026-07-23T02:00:00.000Z' };
    const pull = vi.fn(async (collection: string) => ({ documents: collection === 'tasks' ? [remoteTask] : [], checkpoint: null }));
    const push = vi.fn(async (_collection: string, _rows: unknown[]) => ({ conflicts: [] }));
    const writeRecord = vi.fn(async (_kind: string, _id: string, _payload: object) => {});
    const client = { pull, push, putAttachment: vi.fn(), getAttachment: vi.fn() } as unknown as PrivateSyncClient;

    await syncPrivateWorkspace(client, { tasks: [localTask], meetings: [], documents: [], researches: [], seals: [], materials: [], drafts: [], weeklyReports: [], attachments: [] }, writeRecord);

    const taskPush = push.mock.calls.find((call) => call[0] === 'tasks');
    expect(taskPush?.[1]?.[0]).toEqual({ newDocumentState: localTask, assumedMasterState: remoteTask });
  });

  it('synchronizes every editable business module through its own collection', async () => {
    const pull = vi.fn(async () => ({ documents: [], checkpoint: null }));
    const push = vi.fn(async (_collection: string, _rows: unknown[]) => ({ conflicts: [] }));
    const client = { pull, push, putAttachment: vi.fn(), getAttachment: vi.fn() } as unknown as PrivateSyncClient;
    await syncPrivateWorkspace(client, {
      tasks: [], meetings: sampleMeetings, documents: sampleDocuments, researches: sampleResearches, seals: sampleSeals, materials: sampleMaterials,
      drafts: [], weeklyReports: [], attachments: []
    }, vi.fn(async () => {}));
    expect(push.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining(['meetings', 'documents', 'researches', 'seals', 'materials']));
    const documentPush = push.mock.calls.find((call) => call[0] === 'documents');
    expect(documentPush?.[1]?.[0]).toMatchObject({ newDocumentState: { id: sampleDocuments[0].id, relatedTaskIds: ['task_demo_2'] } });
    expect(push).toHaveBeenCalledTimes(5);
  });

  it('pushes permanent-delete tombstones so an older remote payload cannot resurrect a record', async () => {
    const remoteTask: Task & SyncRecord = { ...sampleTasks[0], id: 'task-purged-sync', updatedAt: '2026-07-31T08:00:00.000Z' };
    const localTombstone = purgeBusinessRecord(moveBusinessRecordToTrash(remoteTask, '2026-07-31T09:00:00.000Z'), '2026-07-31T10:00:00.000Z');
    const pull = vi.fn(async (collection: string) => ({ documents: collection === 'tasks' ? [remoteTask] : [], checkpoint: null }));
    const push = vi.fn(async (_collection: string, _rows: unknown[]) => ({ conflicts: [] }));
    const client = { pull, push, putAttachment: vi.fn(), getAttachment: vi.fn() } as unknown as PrivateSyncClient;

    await syncPrivateWorkspace(client, { tasks: [localTombstone], meetings: [], documents: [], researches: [], seals: [], materials: [], drafts: [], weeklyReports: [], attachments: [] }, vi.fn(async () => {}));

    const taskPush = push.mock.calls.find((call) => call[0] === 'tasks');
    expect(taskPush?.[1]?.[0]).toEqual({ newDocumentState: localTombstone, assumedMasterState: remoteTask });
  });

  it('cleans attachment payload left behind when a newer remote tombstone is persisted', async () => {
    const localTask: Task = { ...sampleTasks[0], id: 'task-remote-purge', files: ['attachment-orphaned'], updatedAt: '2026-07-31T08:00:00.000Z' };
    const remoteTombstone = purgeBusinessRecord(moveBusinessRecordToTrash(localTask, '2026-07-31T09:00:00.000Z'), '2026-07-31T10:00:00.000Z');
    const writeRecord = vi.fn(async () => {});
    const readRecord = vi.fn(async () => localTask);
    const cleanupAttachments = vi.fn(async () => ['attachment-orphaned']);

    await persistPulledRecord('task', localTask.id, remoteTombstone, { writeRecord, readRecord, cleanupAttachments });

    expect(writeRecord).toHaveBeenCalledWith('task', localTask.id, remoteTombstone);
    expect(cleanupAttachments).toHaveBeenCalledWith(['attachment-orphaned']);
  });

  it('does not upload attachments referenced only by a local payload superseded by a remote tombstone', async () => {
    const attachment: Attachment = { id: 'attachment-remote-purge', name: 'stale.txt', mimeType: 'text/plain', size: 5, data: 'c3RhbGU=', sha256: 'a03f2386ae06b2115fc70a8a8b9304256c03ef98f9b5ce4d9d63488f12d7e656', createdAt: '2026-07-31T08:00:00.000Z' };
    const localTask: Task = { ...sampleTasks[0], id: 'task-remote-purge-transfer', files: [attachment.id], updatedAt: '2026-07-31T08:00:00.000Z' };
    const remoteTombstone = purgeBusinessRecord(moveBusinessRecordToTrash(localTask, '2026-07-31T09:00:00.000Z'), '2026-07-31T10:00:00.000Z');
    const pull = vi.fn(async (collection: string) => ({ documents: collection === 'tasks' ? [remoteTombstone] : [], checkpoint: null }));
    const putAttachment = vi.fn();
    const client = { pull, push: vi.fn(async () => ({ conflicts: [] })), putAttachment, getAttachment: vi.fn() } as unknown as PrivateSyncClient;

    await syncPrivateWorkspace(client, { tasks: [localTask], meetings: [], documents: [], researches: [], seals: [], materials: [], drafts: [], weeklyReports: [], attachments: [attachment] }, vi.fn(async () => {}));

    expect(putAttachment).not.toHaveBeenCalled();
  });
});
