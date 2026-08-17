import { describe, expect, it } from 'vitest';
import {
  sampleDocuments,
  sampleMaterials,
  sampleMeetings,
  sampleResearches,
  sampleSeals,
  sampleTasks,
} from '@hxhwang/domain';
import {
  buildBusinessRecordComparison,
  chooseInitialBusinessComparisonTarget,
  listBusinessComparisonCandidates,
} from './business-record-comparison';

describe('business record comparison', () => {
  it('lists only other active same-kind records in loaded order and leaves input untouched', () => {
    const records = [
      { ...sampleTasks[0], id: 'task-source', name: '基准任务' },
      { ...sampleTasks[1], id: 'task-next', name: '下一条任务' },
      { ...sampleTasks[0], id: 'task-deleted', name: '已删除任务', deletedAt: '2026-08-16T08:00:00.000Z' },
      { ...sampleTasks[1], id: 'task-last', name: '最后任务' },
    ];
    const originalIds = records.map((record) => record.id);

    expect(listBusinessComparisonCandidates('task', records, 'task-source')).toEqual([
      { id: 'task-next', title: '下一条任务' },
      { id: 'task-last', title: '最后任务' },
    ]);
    expect(records.map((record) => record.id)).toEqual(originalIds);
  });

  it('chooses the next visible target, then previous, then the first active fallback', () => {
    const candidates = [
      { id: 'task-a', title: '任务 A' },
      { id: 'task-b', title: '任务 B' },
      { id: 'task-c', title: '任务 C' },
    ];

    expect(chooseInitialBusinessComparisonTarget('task-b', candidates, ['task-a', 'task-b', 'task-c'])).toBe('task-c');
    expect(chooseInitialBusinessComparisonTarget('task-c', candidates, ['task-a', 'task-b', 'task-c'])).toBe('task-b');
    expect(chooseInitialBusinessComparisonTarget('task-hidden', candidates, ['task-hidden'])).toBe('task-a');
    expect(chooseInitialBusinessComparisonTarget('task-only', [], ['task-only'])).toBeUndefined();
  });

  it('builds the six fixed field whitelists in stable order', () => {
    const cases = [
      {
        kind: 'task' as const,
        source: { ...sampleTasks[0], id: 'task-source' },
        target: { ...sampleTasks[1], id: 'task-target' },
        labels: ['任务名称', '状态', '工作类目', '任务来源', '交办人', '交办日期', '截止日期', '配合单位', '任务阶段', '检查清单', '工作小结', '关联文件', '备注', '附件数量', '最近更新'],
      },
      {
        kind: 'meeting' as const,
        source: { ...sampleMeetings[0], id: 'meeting-source' },
        target: { ...sampleMeetings[0], id: 'meeting-target', subject: '另一个会议' },
        labels: ['会议主题', '会议时间', '通知日期', '发送对象', '接收方', '会议地点', '备注', '附件数量', '最近更新'],
      },
      {
        kind: 'document' as const,
        source: { ...sampleDocuments[0], id: 'document-source' },
        target: { ...sampleDocuments[0], id: 'document-target', title: '另一个文件' },
        labels: ['文件标题', '发文字号', '文件类型', '文件日期', '密级', '来源单位', '文件归类', '工作归类', '承办人', '发送范围', '登记状态', '关联任务', '备注', '附件数量', '最近更新'],
      },
      {
        kind: 'research' as const,
        source: { ...sampleResearches[0], id: 'research-source' },
        target: { ...sampleResearches[0], id: 'research-target', subject: '另一个活动' },
        labels: ['活动主题', '活动类型', '活动日期', '活动地点', '参与人员', '是否用车', '活动摘要', '成果记录', '备注', '附件数量', '最近更新'],
      },
      {
        kind: 'seal' as const,
        source: { ...sampleSeals[0], id: 'seal-source' },
        target: { ...sampleSeals[0], id: 'seal-target', docName: '另一个用章文件' },
        labels: ['文件名称', '文件类型', '用章日期', '用章人', '审批人', '备注', '附件数量', '最近更新'],
      },
      {
        kind: 'material' as const,
        source: { ...sampleMaterials[0], id: 'material-source' },
        target: { ...sampleMaterials[0], id: 'material-target', materialName: '另一种物资' },
        labels: ['物资名称', '规格', '收发类型', '数量', '经手日期', '经手人', '来源 / 领用单位', '备注', '附件数量', '最近更新'],
      },
    ];

    for (const item of cases) {
      const comparison = buildBusinessRecordComparison(item.kind, item.source as never, item.target as never, { tasks: sampleTasks, documents: sampleDocuments });
      expect(comparison.rows.map((row) => row.label)).toEqual(item.labels);
      expect(comparison.rows.map((row) => row.key)).toEqual([...new Set(comparison.rows.map((row) => row.key))]);
      expect(comparison.differenceCount).toBe(comparison.rows.filter((row) => row.changed).length);
    }
  });

  it('normalizes empty values, resolves active relation titles and emits no internal or migration material', () => {
    const source = {
      ...sampleTasks[0],
      id: 'task-sensitive-source',
      name: '同名任务 ',
      remark: '',
      files: ['attachment-secret-id'],
      legacyPayload: { originalHtml: '<script>secret migration body</script>' },
      sourceVersion: 'legacy-secret-version',
    };
    const target = {
      ...sampleTasks[0],
      id: 'task-sensitive-target',
      name: '同名任务',
      remark: '   ',
      files: ['attachment-a', 'attachment-b'],
      legacyPayload: { apiKey: 'should-never-render' },
    };
    const documents = [
      { ...sampleDocuments[0], id: 'document-visible', title: '可见关联文件', relatedTaskIds: [source.id] },
      { ...sampleDocuments[0], id: 'document-deleted', title: '已删除关联文件', relatedTaskIds: [source.id], deletedAt: '2026-08-16T08:00:00.000Z' },
    ];
    const before = JSON.stringify({ source, target, documents });

    const comparison = buildBusinessRecordComparison('task', source, target, { tasks: sampleTasks, documents });
    const serialized = JSON.stringify(comparison);

    expect(comparison.rows.find((row) => row.label === '任务名称')).toMatchObject({ sourceValue: '同名任务', targetValue: '同名任务', changed: false });
    expect(comparison.rows.find((row) => row.label === '备注')).toMatchObject({ sourceValue: '未填写', targetValue: '未填写', changed: false });
    expect(comparison.rows.find((row) => row.label === '关联文件')?.sourceValue).toBe('可见关联文件');
    expect(comparison.rows.find((row) => row.label === '附件数量')).toMatchObject({ sourceValue: '1 个', targetValue: '2 个', changed: true });
    expect(serialized).not.toContain('task-sensitive-source');
    expect(serialized).not.toContain('attachment-secret-id');
    expect(serialized).not.toContain('secret migration body');
    expect(serialized).not.toContain('should-never-render');
    expect(serialized).not.toContain('legacy-secret-version');
    expect(serialized).not.toContain('已删除关联文件');
    expect(JSON.stringify({ source, target, documents })).toBe(before);
  });
});
