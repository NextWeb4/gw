import { describe, expect, it } from 'vitest';
import {
  applyTaskTextExtraction, buildWeeklyReportSummary, buildWorkStatistics, calculateMaterialStock, createId, defaultCategoryTint, extractTaskFromText,
  createDocumentRevision, documentRevisionContentLength, duplicateBusinessRecord, extractWeeklyTemplateFromSample, generateTaskWorkSummary, isDocumentRevision, isValidIsoDate, isValidIsoDateTime, listStatisticsMonths, materialStockKey,
  mergeContactDirectory, mergePartnerGroupMembers, moveBusinessRecordToTrash, parseWeeklyTemplate, partitionBusinessRecords, purgeBusinessRecord,
  normalizeTaskChecklist, pruneDocumentRevisions, relatedDocumentsForTask, relatedTasksForDocument, normalizeRelatedRecordIds, renameCustomWritingTemplate, resolveCategoryTint, resolveWeeklyReportRelationGroups, restoreBusinessRecord, restoreDraftRevision, restoreWeeklyRevision, taskChecklistProgress,
  sampleDocuments, sampleMaterials, sampleContactDirectory, sampleMeetings, sampleResearches, sampleSeals, sampleTasks,
  DOCUMENT_REVISION_MAX_CONTENT_LENGTH, type DocumentRevision, type Draft, type WeeklyReport
} from './index.js';

const statisticsInput = {
  tasks: sampleTasks,
  meetings: sampleMeetings,
  documents: sampleDocuments,
  researches: sampleResearches,
  seals: sampleSeals,
  materials: sampleMaterials
};

describe('business record lifecycle', () => {
  const deletedAt = '2026-07-31T08:00:00.000Z';
  const restoredAt = '2026-07-31T09:00:00.000Z';
  const purgedAt = '2026-07-31T10:00:00.000Z';

  it('moves a record to trash without mutating its business payload or attachment references', () => {
    const source = { ...sampleTasks[0], files: ['attachment-trash'] };
    const trashed = moveBusinessRecordToTrash(source, deletedAt);

    expect(source).not.toHaveProperty('deletedAt');
    expect(trashed).toMatchObject({ id: source.id, name: source.name, files: ['attachment-trash'], deletedAt, updatedAt: deletedAt });
    expect(trashed).not.toHaveProperty('purgedAt');
  });

  it('partitions active, trashed and purged rows without treating tombstones as business content', () => {
    const active = sampleTasks[0];
    const trashed = moveBusinessRecordToTrash({ ...sampleTasks[1], id: 'task-trash' }, deletedAt);
    const purged = purgeBusinessRecord(trashed, purgedAt);

    const result = partitionBusinessRecords([active, trashed, purged]);

    expect(result.active.map((record) => record.id)).toEqual([active.id]);
    expect(result.trashed.map((record) => record.id)).toEqual([trashed.id]);
    expect(result.purged).toEqual([purged]);
  });

  it('restores the complete payload and removes lifecycle markers', () => {
    const source = moveBusinessRecordToTrash({ ...sampleDocuments[0], files: ['attachment-restore'] }, deletedAt);
    const restored = restoreBusinessRecord(source, restoredAt);

    expect(restored).toMatchObject({ title: source.title, code: source.code, files: ['attachment-restore'], updatedAt: restoredAt });
    expect(restored).not.toHaveProperty('deletedAt');
    expect(restored).not.toHaveProperty('purgedAt');
  });

  it('permanently deletes business content into a minimal synchronization tombstone', () => {
    const source = moveBusinessRecordToTrash({ ...sampleTasks[0], files: ['attachment-purge'], remark: '不得进入 tombstone' }, deletedAt);
    const purged = purgeBusinessRecord(source, purgedAt);

    expect(purged).toEqual({ id: source.id, updatedAt: purgedAt, deletedAt, purgedAt });
    expect(Object.keys(purged).sort()).toEqual(['deletedAt', 'id', 'purgedAt', 'updatedAt']);
  });

  it('keeps trashed records out of stock, weekly summaries and statistics even if a caller passes them', () => {
    const trashedTask = moveBusinessRecordToTrash({ ...sampleTasks[0], id: 'task-derived-trash' }, deletedAt);
    const trashedMaterial = moveBusinessRecordToTrash({ ...sampleMaterials[0], id: 'material-derived-trash', quantity: 50 }, deletedAt);
    const report = buildWeeklyReportSummary([trashedTask], sampleDocuments, '2026-07-20', '2026-07-31');
    const statistics = buildWorkStatistics({ ...statisticsInput, tasks: [trashedTask], materials: [trashedMaterial] }, { today: '2026-07-31' });
    const stock = calculateMaterialStock([sampleMaterials[0], trashedMaterial]);

    expect(report.taskIds).toEqual([]);
    expect(statistics.taskTotal).toBe(0);
    expect(statistics.materialIn).toBe(0);
    expect(stock.get(materialStockKey(sampleMaterials[0]))).toBe(sampleMaterials[0].quantity);
  });
});

describe('task checklist', () => {
  it('normalizes missing and malformed legacy checklist values without mutating the source', () => {
    const source = [
      { id: 'check-1', text: '  核对来文口径  ', done: true },
      { id: 'check-1', text: '重复 ID', done: false },
      { id: 'check-2', text: '   ', done: false },
      { id: 'check-3', text: '完成报送', done: 'yes' },
      null,
    ];

    expect(normalizeTaskChecklist(undefined)).toEqual([]);
    expect(normalizeTaskChecklist(source)).toEqual([
      { id: 'check-1', text: '核对来文口径', done: true },
      { id: 'check-3', text: '完成报送', done: false },
    ]);
    expect(source[0]).toEqual({ id: 'check-1', text: '  核对来文口径  ', done: true });
  });

  it('derives progress without changing the task status', () => {
    const task = {
      ...sampleTasks[0],
      status: 'progress' as const,
      checklist: [
        { id: 'check-1', text: '第一步', done: true },
        { id: 'check-2', text: '第二步', done: false },
        { id: 'check-3', text: '第三步', done: true },
      ],
    };

    expect(taskChecklistProgress(task.checklist)).toEqual({ completed: 2, total: 3 });
    expect(task.status).toBe('progress');
  });
});

describe('custom writing template management', () => {
  const template = {
    id: 'custom-template-test',
    name: '原格式名称',
    documentType: '工作通知',
    outline: ['原格式名称', '正文结构'],
    custom: true as const,
    contentHtml: '<p>不可变正文</p>',
    contentText: '不可变正文',
    createdAt: '2026-08-01T01:00:00.000Z',
    updatedAt: '2026-08-01T01:00:00.000Z',
    sourceId: 'local-custom-template',
    sourceVersion: '本机自定义',
  };

  it('renames only the user-facing name and update timestamp', () => {
    const renamed = renameCustomWritingTemplate(template, '  新格式名称  ', '2026-08-04T05:00:00.000Z');
    expect(renamed).toEqual({ ...template, name: '新格式名称', updatedAt: '2026-08-04T05:00:00.000Z' });
    expect(template.name).toBe('原格式名称');
    expect(renamed.outline).toBe(template.outline);
  });

  it('rejects empty and excessive custom template names', () => {
    expect(() => renameCustomWritingTemplate(template, '   ')).toThrow(/不能为空/);
    expect(() => renameCustomWritingTemplate(template, '格'.repeat(81))).toThrow(/80/);
  });
});

describe('draft and weekly document revision history', () => {
  const savedAt = '2026-08-05T01:00:00.000Z';
  const draft: Draft = {
    id: 'draft_main', title: '当前公文', documentType: '工作报告', contentHtml: '<p>第一版正文</p>', contentText: '第一版正文',
    templateId: 'work-report', version: 3, updatedAt: savedAt,
  };
  const weekly: WeeklyReport = {
    id: 'weekly-test', title: '测试周报', startDate: '2026-08-03', endDate: '2026-08-09', contentText: '周报第一版',
    taskIds: ['task-1'], documentIds: ['doc-1'], meetingIds: ['meeting-1'], researchIds: ['research-1'], sealIds: ['seal-1'], materialIds: ['material-1'],
    version: 2, createdAt: '2026-08-05T00:00:00.000Z', updatedAt: savedAt,
  };

  it('creates immutable full snapshots for both supported targets', () => {
    const draftRevision = createDocumentRevision('draft', draft, 'document-revision_draft', savedAt);
    const weeklyRevision = createDocumentRevision('weekly', weekly, 'document-revision_weekly', savedAt);
    expect(draftRevision).toEqual({ type: 'document-revision', id: 'document-revision_draft', targetKind: 'draft', targetId: draft.id, version: 3, createdAt: savedAt, snapshot: draft });
    expect(weeklyRevision).toEqual({ type: 'document-revision', id: 'document-revision_weekly', targetKind: 'weekly', targetId: weekly.id, version: 2, createdAt: savedAt, snapshot: weekly });
    expect(draftRevision.snapshot).not.toBe(draft);
    expect(weeklyRevision.snapshot).not.toBe(weekly);
    expect(weeklyRevision.snapshot.taskIds).not.toBe(weekly.taskIds);
    expect(documentRevisionContentLength(draftRevision)).toBe(JSON.stringify(draft).length);
    expect(createDocumentRevision('draft', { ...draft, extraSecret: '不得进入历史' } as Draft, 'document-revision_extra', savedAt)).not.toHaveProperty('snapshot.extraSecret');
    expect(isDocumentRevision({ ...draftRevision, extraSecret: '不得导入历史' })).toBe(false);
    expect(isDocumentRevision({ ...draftRevision, snapshot: { ...draftRevision.snapshot, extraSecret: '不得导入历史' } })).toBe(false);
  });

  it('restores content into the current identity and version without mutating either source', () => {
    const oldDraft = createDocumentRevision('draft', { ...draft, title: '旧公文', contentHtml: '<p>旧正文</p>', contentText: '旧正文', version: 1 }, 'document-revision_old-draft', '2026-08-05T00:10:00.000Z');
    const oldWeekly = createDocumentRevision('weekly', { ...weekly, title: '旧周报', contentText: '旧周报正文', taskIds: ['task-old'], version: 1 }, 'document-revision_old-weekly', '2026-08-05T00:20:00.000Z');
    const restoredDraft = restoreDraftRevision(draft, oldDraft, '2026-08-05T02:00:00.000Z');
    const restoredWeekly = restoreWeeklyRevision(weekly, oldWeekly, '2026-08-05T02:00:00.000Z');
    expect(restoredDraft).toEqual({ ...oldDraft.snapshot, id: draft.id, version: draft.version, updatedAt: '2026-08-05T02:00:00.000Z' });
    expect(restoredWeekly).toEqual({ ...oldWeekly.snapshot, id: weekly.id, version: weekly.version, createdAt: weekly.createdAt, updatedAt: '2026-08-05T02:00:00.000Z' });
    expect(restoredWeekly.taskIds).not.toBe(oldWeekly.snapshot.taskIds);
    expect(draft.title).toBe('当前公文');
    expect(weekly.title).toBe('测试周报');
    expect(() => restoreDraftRevision(draft, oldWeekly, savedAt)).toThrow(/类型/);
  });

  it('enforces per-revision, per-target, global and total-content bounds without sorting the source in place', () => {
    expect(() => createDocumentRevision('draft', { ...draft, contentHtml: '', contentText: '文'.repeat(DOCUMENT_REVISION_MAX_CONTENT_LENGTH + 1) }, 'document-revision_huge', savedAt)).toThrow(/历史上限/);
    const revisions: DocumentRevision[] = Array.from({ length: 6 }, (_, index) => createDocumentRevision(
      'draft',
      { ...draft, id: index < 4 ? 'draft-a' : 'draft-b', title: `版本${index}`, contentHtml: '', contentText: '正文', version: index + 1, updatedAt: `2026-08-05T00:0${index}:00.000Z` },
      `document-revision_${index}`,
      `2026-08-05T00:0${index}:00.000Z`,
    ));
    const originalOrder = revisions.map((revision) => revision.id);
    const result = pruneDocumentRevisions(revisions, { perTargetLimit: 2, globalLimit: 3, totalContentLimit: 1_000 });
    expect(result.retained.map((revision) => revision.id)).toEqual(['document-revision_5', 'document-revision_4', 'document-revision_3']);
    expect(result.removed.map((revision) => revision.id).sort()).toEqual(['document-revision_0', 'document-revision_1', 'document-revision_2']);
    const twoRevisionLimit = documentRevisionContentLength(revisions[5]) + documentRevisionContentLength(revisions[4]);
    expect(pruneDocumentRevisions(revisions, { perTargetLimit: 6, globalLimit: 6, totalContentLimit: twoRevisionLimit }).retained.map((revision) => revision.id)).toEqual(['document-revision_5', 'document-revision_4']);
    expect(revisions.map((revision) => revision.id)).toEqual(originalOrder);
  });
});

describe('business record duplication', () => {
  const copiedAt = '2026-08-01T01:02:03.000Z';

  it('creates an independent unsaved task draft and resets progress-only state', () => {
    const source = {
      ...sampleTasks[0],
      status: 'done' as const,
      workSummary: '旧任务办结小结',
      files: ['attachment-main'],
      partnerStatus: [{ name: '甲单位', status: 'done' as const, files: ['attachment-partner'] }],
      stages: [{ id: 'stage-old', name: '报送', partnerStatus: [{ name: '乙单位', status: 'progress' as const, files: ['attachment-stage'] }] }],
      checklist: [{ id: 'check-old', text: '核对材料', done: true }],
      sourceVersion: 'legacy-v1',
      legacyPayload: { raw: '不得带入新记录' },
      deletedAt: '2026-07-31T08:00:00.000Z',
      purgedAt: '2026-07-31T09:00:00.000Z'
    };

    const copied = duplicateBusinessRecord('task', source, copiedAt);

    expect(copied).toMatchObject({
      name: source.name,
      status: 'pending',
      workSummary: '',
      files: ['attachment-main'],
      partnerStatus: [{ name: '甲单位', status: 'pending', files: [] }],
      createdAt: copiedAt,
      updatedAt: copiedAt
    });
    expect(copied.id).toMatch(/^task_/);
    expect(copied.id).not.toBe(source.id);
    expect(copied.stages[0]).toMatchObject({ name: '报送', partnerStatus: [{ name: '乙单位', status: 'pending', files: [] }] });
    expect(copied.stages[0].id).toMatch(/^stage_/);
    expect(copied.stages[0].id).not.toBe(source.stages[0].id);
    expect(copied.checklist).toEqual([{ id: expect.stringMatching(/^check_/), text: '核对材料', done: false }]);
    expect(copied.checklist?.[0].id).not.toBe(source.checklist[0].id);
    expect(copied.files).not.toBe(source.files);
    expect(copied.partnerStatus).not.toBe(source.partnerStatus);
    expect(copied).not.toHaveProperty('deletedAt');
    expect(copied).not.toHaveProperty('purgedAt');
    expect(copied).not.toHaveProperty('sourceVersion');
    expect(copied).not.toHaveProperty('legacyPayload');

    copied.partnerStatus[0].name = '已修改单位';
    expect(source.partnerStatus[0].name).toBe('甲单位');
  });

  it('preserves reusable business fields for all other ledgers while resetting outcome state', () => {
    const meeting = duplicateBusinessRecord('meeting', { ...sampleMeetings[0], files: ['attachment-meeting'] }, copiedAt);
    const document = duplicateBusinessRecord('document', { ...sampleDocuments[0], receiptStatus: '已办结', relatedTaskIds: ['task_demo_1'], files: ['attachment-document'] }, copiedAt);
    const research = duplicateBusinessRecord('research', { ...sampleResearches[0], achievements: '旧活动成果', files: ['attachment-research'] }, copiedAt);
    const seal = duplicateBusinessRecord('seal', { ...sampleSeals[0], files: ['attachment-seal'] }, copiedAt);
    const material = duplicateBusinessRecord('material', { ...sampleMaterials[0], files: ['attachment-material'] }, copiedAt);

    expect(meeting).toMatchObject({ subject: sampleMeetings[0].subject, meetingTime: sampleMeetings[0].meetingTime, files: ['attachment-meeting'] });
    expect(document).toMatchObject({ title: sampleDocuments[0].title, code: sampleDocuments[0].code, receiptStatus: '待登记', relatedTaskIds: [], files: ['attachment-document'] });
    expect(research).toMatchObject({ subject: sampleResearches[0].subject, researchTime: sampleResearches[0].researchTime, achievements: '', files: ['attachment-research'] });
    expect(seal).toMatchObject({ docName: sampleSeals[0].docName, sealTime: sampleSeals[0].sealTime, files: ['attachment-seal'] });
    expect(material).toMatchObject({ materialName: sampleMaterials[0].materialName, quantity: sampleMaterials[0].quantity, files: ['attachment-material'] });

    expect(meeting.id).toMatch(/^meeting_/);
    expect(document.id).toMatch(/^doc_/);
    expect(research.id).toMatch(/^research_/);
    expect(seal.id).toMatch(/^seal_/);
    expect(material.id).toMatch(/^material_/);
    for (const copied of [meeting, document, research, seal, material]) {
      expect(copied.createdAt).toBe(copiedAt);
      expect(copied.updatedAt).toBe(copiedAt);
      expect(copied).not.toHaveProperty('deletedAt');
      expect(copied).not.toHaveProperty('purgedAt');
    }
  });
});

describe('document and task relations', () => {
  const deletedAt = '2026-08-01T02:00:00.000Z';

  it('normalizes relation ids without mutating input or changing the selected order', () => {
    const source: unknown[] = [' task_demo_2 ', '', 'task_demo_1', 'task_demo_2', '  ', 42, null, 'missing-task'];
    expect(normalizeRelatedRecordIds(source)).toEqual(['task_demo_2', 'task_demo_1', 'missing-task']);
    expect(source).toEqual([' task_demo_2 ', '', 'task_demo_1', 'task_demo_2', '  ', 42, null, 'missing-task']);
  });

  it('rejects non-array relation fields from untrusted snapshots without throwing', () => {
    expect(normalizeRelatedRecordIds(42)).toEqual([]);
    expect(normalizeRelatedRecordIds({ taskId: 'task_demo_1' })).toEqual([]);
    expect(normalizeRelatedRecordIds('task_demo_1')).toEqual([]);
    expect(normalizeRelatedRecordIds(null)).toEqual([]);
  });

  it('resolves only active tasks in the document selection order and active documents in ledger order', () => {
    const trashedTask = moveBusinessRecordToTrash({ ...sampleTasks[0], id: 'task-trash' }, deletedAt);
    const purgedTask = purgeBusinessRecord(moveBusinessRecordToTrash({ ...sampleTasks[0], id: 'task-purged' }, deletedAt), '2026-08-01T03:00:00.000Z');
    const document = {
      ...sampleDocuments[0],
      relatedTaskIds: ['task_demo_2', 'task-trash', 'task_demo_1', 'task-purged', 'missing-task'],
    };
    expect(relatedTasksForDocument(document, [sampleTasks[0], trashedTask, sampleTasks[1], purgedTask]).map((task) => task.id)).toEqual(['task_demo_2', 'task_demo_1']);

    const firstDocument = { ...sampleDocuments[0], id: 'doc-first', relatedTaskIds: ['task_demo_1'] };
    const trashedDocument = moveBusinessRecordToTrash({ ...sampleDocuments[0], id: 'doc-trash', relatedTaskIds: ['task_demo_1'] }, deletedAt);
    const secondDocument = { ...sampleDocuments[0], id: 'doc-second', relatedTaskIds: ['task_demo_2', 'task_demo_1'] };
    expect(relatedDocumentsForTask('task_demo_1', [firstDocument, trashedDocument, secondDocument]).map((item) => item.id)).toEqual(['doc-first', 'doc-second']);
  });
});

describe('weekly report relation sources', () => {
  it('resolves active source ids in report order and counts unavailable ids without mutating the report', () => {
    const report = {
      taskIds: ['task_demo_2', 'task-trash', 'missing-task', 'task-purged', 'task_demo_1', 'task_demo_2'],
      documentIds: ['doc_demo_1', 'missing-document'],
      meetingIds: ['meeting_demo_1'],
      researchIds: [],
      sealIds: ['seal_missing'],
      materialIds: undefined,
    };
    const trashed = moveBusinessRecordToTrash({ ...sampleTasks[0], id: 'task-trash' }, '2026-08-01T02:00:00.000Z');
    const purged = purgeBusinessRecord(moveBusinessRecordToTrash({ ...sampleTasks[0], id: 'task-purged' }, '2026-08-01T02:00:00.000Z'), '2026-08-01T03:00:00.000Z');
    const groups = resolveWeeklyReportRelationGroups(report, {
      tasks: [sampleTasks[0], sampleTasks[1], trashed, purged], documents: sampleDocuments, meetings: [], researches: [], seals: [], materials: [],
    });
    expect(groups.find((group) => group.kind === 'task')).toEqual({ kind: 'task', ids: ['task_demo_2', 'task_demo_1'], unavailableCount: 3 });
    expect(groups.find((group) => group.kind === 'document')).toEqual({ kind: 'document', ids: ['doc_demo_1'], unavailableCount: 1 });
    expect(groups.find((group) => group.kind === 'meeting')).toEqual({ kind: 'meeting', ids: [], unavailableCount: 1 });
    expect(groups.find((group) => group.kind === 'seal')).toEqual({ kind: 'seal', ids: [], unavailableCount: 1 });
    expect(report.taskIds).toEqual(['task_demo_2', 'task-trash', 'missing-task', 'task-purged', 'task_demo_1', 'task_demo_2']);
  });
});

describe('domain fixtures', () => {
  it('creates prefixed unique ids', () => {
    const first = createId('task');
    const second = createId('task');
    expect(first).toMatch(/^task_/);
    expect(second).not.toBe(first);
  });

  it('ships only fictional local demo records', () => {
    expect(sampleTasks.every((task) => task.id.startsWith('task_demo_'))).toBe(true);
    expect(sampleDocuments.every((doc) => doc.id.startsWith('doc_demo_'))).toBe(true);
    expect(sampleDocuments[0]).toMatchObject({ code: '闽政〔2026〕1号', fromUnit: '福建省人民政府办公厅' });
    expect(sampleContactDirectory.people).toEqual(['林晓岚', '陈致远', '郑明川', '周宁']);
    expect(sampleContactDirectory.units).toContain('福建省人民政府办公厅综合处');
    expect(sampleContactDirectory.units.every((unit) => unit.startsWith('福建省'))).toBe(true);
  });

  it('builds a date-bounded weekly summary from recorded facts', () => {
    const report = buildWeeklyReportSummary(sampleTasks, sampleDocuments, '2026-07-20', '2026-07-26');
    expect(report.taskIds).toEqual(['task_demo_1', 'task_demo_2']);
    expect(report.documentIds).toEqual(['doc_demo_1']);
    expect(report.contentText).toContain('已完成省级任务清单整理');
    expect(report.contentText).toContain('关于做好2026年全省重点工作的通知');
    expect(report.contentText).toContain('计划于2026-07-25前完成');
  });

  it('rejects an inverted weekly date range', () => {
    expect(() => buildWeeklyReportSummary([], [], '2026-07-27', '2026-07-20')).toThrow(/起止日期无效/);
  });

  it('rejects impossible or extended-year weekly dates at the domain boundary', () => {
    expect(() => buildWeeklyReportSummary([], [], '2026-02-30', '2026-03-01')).toThrow(/起止日期无效/);
    expect(() => buildWeeklyReportSummary([], [], '200000-01-01', '200000-01-07')).toThrow(/起止日期无效/);
  });

  it('does not treat impossible source dates as weekly activity', () => {
    const task = { ...sampleTasks[0], id: 'task_invalid_date', assignDate: '2026-02-30', deadline: '2026-02-30', status: 'done' as const, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    const document = { ...sampleDocuments[0], id: 'doc_invalid_date', docDate: '2026-02-30', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    const report = buildWeeklyReportSummary([task], [document], '2026-02-28', '2026-03-01');
    expect(report.taskIds).toEqual([]);
    expect(report.documentIds).toEqual([]);
  });

  it('accepts only real four-digit ISO dates', () => {
    expect(isValidIsoDate('2026-07-28')).toBe(true);
    expect(isValidIsoDate('200000-07-28')).toBe(false);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('')).toBe(true);
  });

  it('accepts only real local date-time values', () => {
    expect(isValidIsoDateTime('2026-07-28T09:30')).toBe(true);
    expect(isValidIsoDateTime('2026-02-30T09:30')).toBe(false);
    expect(isValidIsoDateTime('2026-07-28T24:00')).toBe(false);
    expect(isValidIsoDateTime('200000-07-28T09:30')).toBe(false);
  });

  it('generates deterministic work summaries from task facts', () => {
    expect(generateTaskWorkSummary({ ...sampleTasks[0], partnerStatus: [{ name: '综合科', status: 'progress' }] }, 'coordination')).toContain('已协调综合科');
    expect(generateTaskWorkSummary(sampleTasks[1], 'progress')).toContain('当前状态为未启动');
  });

  it('merges common people and units without losing earlier values', () => {
    const first = mergeContactDirectory(
      { people: ['办公室'], units: ['区委办公室'], updatedAt: '2026-01-01T00:00:00.000Z' },
      [' 甲同志 ', '办公室'],
      ['综合科'],
      '2026-07-26T00:00:00.000Z'
    );
    const second = mergeContactDirectory(first, ['乙同志', '丙同志'], ['区委办公室'], '2026-07-26T00:01:00.000Z');
    expect(second.people).toEqual(expect.arrayContaining(['办公室', '甲同志', '乙同志', '丙同志']));
    expect(second.people).toHaveLength(4);
    expect(second.units).toEqual(expect.arrayContaining(['区委办公室', '综合科']));
    expect(second.updatedAt).toBe('2026-07-26T00:01:00.000Z');
  });

  it('aggregates material stock by normalized name and specification', () => {
    const outbound = { ...sampleMaterials[0], id: 'material_demo_out', quantity: 2, type: 'out' as const };
    const balances = calculateMaterialStock([sampleMaterials[0], outbound]);
    expect(balances.get(materialStockKey(sampleMaterials[0]))).toBe(3);
  });

  it('derives selectable statistics months from record anchors', () => {
    expect(listStatisticsMonths(statisticsInput)).toEqual(['2026-07']);
  });

  it('builds deterministic month statistics across every business ledger', () => {
    const stats = buildWorkStatistics(statisticsInput, { monthKey: '2026-07', today: '2026-07-26' });
    expect(stats.taskTotal).toBe(2);
    expect(stats.taskNew).toBe(2);
    expect(stats.taskProgress).toBe(1);
    expect(stats.taskPending).toBe(1);
    expect(stats.taskDone).toBe(0);
    expect(stats.taskOverdue).toBe(1);
    expect(stats.statusBreakdown.reduce((total, entry) => total + entry.count, 0)).toBe(2);
    expect(stats.categoryBreakdown).toEqual([{ name: '日常工作', count: 1 }, { name: '重点项目', count: 1 }]);
    expect(stats).toMatchObject({ meetings: 1, documents: 1, researches: 1, seals: 1, materialIn: 1, materialOut: 0 });
  });

  it('filters statistics by category and returns zero for empty months', () => {
    const filtered = buildWorkStatistics(statisticsInput, { monthKey: '2026-07', category: '重点项目', today: '2026-07-26' });
    expect(filtered.taskTotal).toBe(1);
    expect(filtered.taskOverdue).toBe(0);
    expect(filtered.categoryBreakdown).toHaveLength(2);
    const empty = buildWorkStatistics(statisticsInput, { monthKey: '2025-01', today: '2026-07-26' });
    expect(empty.taskTotal).toBe(0);
    expect(empty.meetings).toBe(0);
    const allTime = buildWorkStatistics(statisticsInput, { today: '2026-07-26' });
    expect(allTime.taskTotal).toBe(2);
  });

  it('extracts task fields from pasted assignment text without network access', () => {
    const wechat = extractTaskFromText('2026-07-21 09:32 张主任要求：整理基层治理台账，7月28日前完成并报送办公室。', '2026-07-26');
    expect(wechat.fields.assigner).toBe('张主任');
    expect(wechat.fields.assignDate).toBe('2026-07-21');
    expect(wechat.fields.deadline).toBe('2026-07-28');
    expect(wechat.recognized).toContain('任务名称');

    const labeled = extractTaskFromText('【重点】任务：完成年度物资盘点\n交办人：综合科\n截止 2026-08-05', '2026-07-26');
    expect(labeled.fields.name).toBe('完成年度物资盘点');
    expect(labeled.fields.assigner).toBe('综合科');
    expect(labeled.fields.deadline).toBe('2026-08-05');

    const spoken = extractTaskFromText('微信收到：由李处长安排，8月2日前反馈调研初稿', '2026-07-26');
    expect(spoken.fields.assigner).toBe('李处长');
    expect(spoken.fields.deadline).toBe('2026-08-02');
    expect(spoken.fields.source).toBe('微信');
  });

  it('rejects impossible dates and empty text during extraction', () => {
    expect(extractTaskFromText('', '2026-07-26').recognized).toEqual([]);
    expect(extractTaskFromText('2月30日前完成不可能日期', '2026-07-26').fields.deadline).toBeUndefined();
  });

  it('applies recognized task fields without mutating the source task or unrelated values', () => {
    const source = { ...sampleTasks[0], name: '原任务', category: '保留类目', remark: '保留备注' };
    const extraction = extractTaskFromText('任务：整理基层治理台账\n交办人：综合科\n截止 2026-08-05\n微信通知', '2026-07-26');
    const applied = applyTaskTextExtraction(source, extraction);

    expect(applied).toMatchObject({ name: '整理基层治理台账', assigner: '综合科', deadline: '2026-08-05', source: '微信', category: '保留类目', remark: '保留备注' });
    expect(source).toMatchObject({ name: '原任务', assigner: sampleTasks[0].assigner, deadline: sampleTasks[0].deadline });
  });

  it('renders weekly reports through custom templates with dynamic ordinals', () => {
    const custom = { id: 't1', name: '自定义', sections: [
      { heading: '本周亮点', source: 'manual' as const, note: '写两条亮点。' },
      { heading: '任务推进', source: 'tasks' as const },
      { heading: '下步打算', source: 'next' as const }
    ] };
    const report = buildWeeklyReportSummary(sampleTasks, sampleDocuments, '2026-07-20', '2026-07-26', {}, custom);
    const lines = report.contentText.split('\n');
    expect(lines[0]).toBe('一、本周亮点');
    expect(lines[1]).toBe('写两条亮点。');
    expect(lines[2]).toBe('二、任务推进');
    expect(report.contentText).toContain('三、下步打算');
    expect(report.taskIds).toEqual(['task_demo_1', 'task_demo_2']);
  });

  it('validates imported weekly template JSON strictly', () => {
    expect(() => parseWeeklyTemplate({ sections: [] })).toThrow(/1 至 20/);
    expect(() => parseWeeklyTemplate({ sections: [{ heading: 'x', source: 'bogus' }] })).toThrow(/来源无效/);
    expect(() => parseWeeklyTemplate({ sections: [{ heading: '', source: 'tasks' }] })).toThrow(/标题/);
    const parsed = parseWeeklyTemplate({ name: '  导入模板  ', sections: [{ heading: ' 概况 ', source: 'overview' }, { heading: '自由节', source: 'manual', note: 'n' }] });
    expect(parsed.name).toBe('导入模板');
    expect(parsed.sections).toEqual([{ heading: '概况', source: 'overview' }, { heading: '自由节', source: 'manual', note: 'n' }]);
  });

  it('extracts a deterministic section structure from a pasted sample article', () => {
    const sample = '关于近期工作情况的报告\n一、总体情况\n本周整体推进有序。\n二、重点工作进展\n1. 完成台账。\n三、经验做法\n坚持一线工作法。\n四、下一步工作安排\n继续跟进。';
    const extracted = extractWeeklyTemplateFromSample(sample);
    expect(extracted.name).toBe('范文结构：关于近期工作情况的报告');
    expect(extracted.sections.map((section) => section.source)).toEqual(['overview', 'tasks', 'manual', 'next']);
    expect(extracted.sections[2].note).toContain('坚持一线工作法');
    expect(() => extractWeeklyTemplateFromSample('没有结构的普通段落文字')).toThrow(/未识别出/);
  });

  it('appends partner group members without overwriting or duplicating existing partners', () => {
    const current = [{ name: '综合科', status: 'progress' as const, files: ['att-1'] }];
    const merged = mergePartnerGroupMembers(current, [' 综合科 ', '项目科', '项目科', '办公室', '  ']);
    expect(merged.partners).toHaveLength(3);
    expect(merged.partners[0]).toEqual({ name: '综合科', status: 'progress', files: ['att-1'] });
    expect(merged.partners.map((partner) => partner.name)).toEqual(['综合科', '项目科', '办公室']);
    expect(merged.added).toBe(2);
    expect(merged.skipped).toBe(1);
  });

  it('assigns deterministic category tints with explicit overrides', () => {
    expect(defaultCategoryTint('重点项目')).toBe(defaultCategoryTint(' 重点项目 '));
    expect(defaultCategoryTint('')).toBe('neutral');
    const overrides = new Map([['重点项目', 'violet' as const]]);
    expect(resolveCategoryTint('重点项目', overrides)).toBe('violet');
    expect(resolveCategoryTint('日常工作', overrides)).toBe(defaultCategoryTint('日常工作'));
  });

  it('includes every editable business module in weekly reports', () => {
    const report = buildWeeklyReportSummary(sampleTasks, sampleDocuments, '2026-07-20', '2026-07-26', {
      meetings: sampleMeetings,
      researches: sampleResearches,
      seals: sampleSeals,
      materials: sampleMaterials
    });
    expect(report.meetingIds).toEqual(['meeting_demo_1']);
    expect(report.researchIds).toEqual(['research_demo_1']);
    expect(report.sealIds).toEqual(['seal_demo_1']);
    expect(report.materialIds).toEqual(['material_demo_1']);
    expect(report.contentText).toContain('全省重点工作协调推进会');
    expect(report.contentText).toContain('基层服务阵地运行情况调研');
    expect(report.contentText).toContain('省直单位工作联系函');
    expect(report.contentText).toContain('A4 打印纸');
  });
});
