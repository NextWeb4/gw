import { describe, expect, it, vi } from 'vitest';
import { sampleTasks, type Attachment, type Draft, type Task } from '@hxhwang/domain';
import type { PrivateSyncClient, SyncRecord } from '@hxhwang/sync-client';
import { syncPrivateWorkspace } from './private-services';

describe('private workspace sync', () => {
  it('pulls newer masters, pushes local-only records and transfers attachments', async () => {
    const localTask: Task = { ...sampleTasks[0], id: 'task-sync', updatedAt: '2026-07-23T01:00:00.000Z' };
    const remoteTask: Task & SyncRecord = { ...localTask, name: '服务端较新任务', updatedAt: '2026-07-23T02:00:00.000Z' };
    const draft: Draft = { id: 'draft-sync', title: '待同步文稿', documentType: '报告', contentHtml: '<p>正文</p>', contentText: '正文', templateId: 'work-summary', version: 1, updatedAt: '2026-07-23T03:00:00.000Z' };
    const attachment: Attachment = { id: 'attachment-sync', name: 'evidence.txt', mimeType: 'text/plain', size: 3, data: 'YWJj', sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', createdAt: '2026-07-23T01:00:00.000Z' };
    const pull = vi.fn(async (collection: string) => ({ documents: collection === 'tasks' ? [remoteTask] : [], checkpoint: null }));
    const push = vi.fn(async (_collection: string, _rows: unknown[]) => ({ conflicts: [] }));
    const putAttachment = vi.fn(async (value: unknown) => value);
    const writeRecord = vi.fn(async (_kind: string, _id: string, _payload: object) => {});
    const client = { pull, push, putAttachment, getAttachment: vi.fn() } as unknown as PrivateSyncClient;

    const result = await syncPrivateWorkspace(client, { tasks: [localTask], documents: [], drafts: [draft], attachments: [attachment] }, writeRecord);

    expect(writeRecord).toHaveBeenCalledWith('task', localTask.id, expect.objectContaining({ name: '服务端较新任务', updatedAt: remoteTask.updatedAt }));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0]?.[0]).toBe('drafts');
    expect(push.mock.calls[0]?.[1]?.[0]).toMatchObject({ newDocumentState: { id: draft.id }, assumedMasterState: null });
    expect(putAttachment).toHaveBeenCalledWith(expect.objectContaining({ id: attachment.id, dataBase64: 'YWJj' }));
    expect(result).toMatchObject({ pulled: 1, pushed: 1, conflicts: 0, attachmentsUploaded: 1 });
  });

  it('pushes a newer local state with the exact remote master assumption', async () => {
    const localTask: Task = { ...sampleTasks[0], id: 'task-newer-local', updatedAt: '2026-07-23T03:00:00.000Z' };
    const remoteTask: Task & SyncRecord = { ...localTask, name: '旧服务端任务', updatedAt: '2026-07-23T02:00:00.000Z' };
    const pull = vi.fn(async (collection: string) => ({ documents: collection === 'tasks' ? [remoteTask] : [], checkpoint: null }));
    const push = vi.fn(async (_collection: string, _rows: unknown[]) => ({ conflicts: [] }));
    const writeRecord = vi.fn(async (_kind: string, _id: string, _payload: object) => {});
    const client = { pull, push, putAttachment: vi.fn(), getAttachment: vi.fn() } as unknown as PrivateSyncClient;

    await syncPrivateWorkspace(client, { tasks: [localTask], documents: [], drafts: [], attachments: [] }, writeRecord);

    const taskPush = push.mock.calls.find((call) => call[0] === 'tasks');
    expect(taskPush?.[1]?.[0]).toEqual({ newDocumentState: localTask, assumedMasterState: remoteTask });
  });
});
