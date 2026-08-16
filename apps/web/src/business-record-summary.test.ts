import { describe, expect, it } from 'vitest';
import {
  sampleDocuments,
  sampleMaterials,
  sampleMeetings,
  sampleResearches,
  sampleSeals,
  sampleTasks,
} from '@hxhwang/domain';
import { buildBusinessRecordSummary } from './business-record-summary';

describe('business record summary', () => {
  const context = { tasks: sampleTasks, documents: sampleDocuments };

  it('builds stable fixed-whitelist summaries for all six active business kinds', () => {
    const cases = [
      { kind: 'task' as const, record: sampleTasks[0], heading: '【任务管理】', labels: ['状态', '工作类目', '任务来源', '交办人', '交办日期', '截止日期', '配合单位', '任务阶段', '工作小结', '关联文件', '备注', '附件数量', '最近更新'] },
      { kind: 'meeting' as const, record: sampleMeetings[0], heading: '【会议管理】', labels: ['会议时间', '通知日期', '发送对象', '接收方', '会议地点', '备注', '附件数量', '最近更新'] },
      { kind: 'document' as const, record: sampleDocuments[0], heading: '【文件收发】', labels: ['发文字号', '文件类型', '文件日期', '密级', '来源单位', '文件归类', '工作归类', '承办人', '发送范围', '登记状态', '关联任务', '备注', '附件数量', '最近更新'] },
      { kind: 'research' as const, record: sampleResearches[0], heading: '【外出活动】', labels: ['活动类型', '活动日期', '活动地点', '参与人员', '是否用车', '活动摘要', '成果记录', '备注', '附件数量', '最近更新'] },
      { kind: 'seal' as const, record: sampleSeals[0], heading: '【用章管理】', labels: ['文件类型', '用章日期', '用章人', '审批人', '备注', '附件数量', '最近更新'] },
      { kind: 'material' as const, record: sampleMaterials[0], heading: '【物资收发】', labels: ['规格', '收发类型', '数量', '经手日期', '经手人', '来源 / 领用单位', '备注', '附件数量', '最近更新'] },
    ];

    for (const item of cases) {
      const text = buildBusinessRecordSummary(item.kind, item.record as never, context);
      const lines = text.split('\n');
      expect(lines[0]).toContain(item.heading);
      expect(lines.slice(1).filter((line) => !line.startsWith('  ')).map((line) => line.split('：')[0])).toEqual(item.labels);
      expect(lines.filter((line) => line.includes('附件数量：'))).toHaveLength(1);
    }
  });

  it('formats multiline values for readable plain-text paste without changing the source', () => {
    const task = {
      ...sampleTasks[0],
      id: 'summary-multiline-task',
      name: '超长中文任务标题用于验证摘要复制不会丢失当前记录信息',
      remark: '第一行备注\n第二行备注',
      partnerStatus: [
        { name: '综合协调处', status: 'progress' as const },
        { name: '政策法规处', status: 'done' as const },
      ],
    };
    const before = JSON.stringify(task);

    const text = buildBusinessRecordSummary('task', task, { tasks: [task], documents: [] });

    expect(text).toContain('【任务管理】超长中文任务标题用于验证摘要复制不会丢失当前记录信息');
    expect(text).toContain('配合单位：综合协调处：进行中\n  政策法规处：已完成');
    expect(text).toContain('备注：第一行备注\n  第二行备注');
    expect(JSON.stringify(task)).toBe(before);
  });

  it('resolves active relation titles and excludes IDs, lifecycle, migration, attachment and secret material', () => {
    const task = {
      ...sampleTasks[0],
      id: 'task-sensitive-summary-id',
      files: ['attachment-secret-id'],
      legacyPayload: { originalHtml: '<script>migration secret</script>', apiKey: 'sk-should-never-copy' },
      sourceVersion: 'legacy-secret-version',
      deletedAt: undefined,
    };
    const documents = [
      { ...sampleDocuments[0], id: 'document-visible-id', title: '可见关联文件', relatedTaskIds: [task.id] },
      { ...sampleDocuments[0], id: 'document-deleted-id', title: '已删除关联文件', relatedTaskIds: [task.id], deletedAt: '2026-08-16T08:00:00.000Z' },
    ];

    const text = buildBusinessRecordSummary('task', task, { tasks: [task], documents });

    expect(text).toContain('关联文件：可见关联文件');
    expect(text).toContain('附件数量：1 个');
    for (const secret of ['task-sensitive-summary-id', 'attachment-secret-id', 'document-visible-id', 'document-deleted-id', 'migration secret', 'sk-should-never-copy', 'legacy-secret-version', '已删除关联文件']) {
      expect(text).not.toContain(secret);
    }
  });

  it('rejects records that are no longer active', () => {
    const deletedTask = { ...sampleTasks[0], deletedAt: '2026-08-16T08:00:00.000Z' };
    expect(() => buildBusinessRecordSummary('task', deletedTask, context)).toThrow('只能复制当前 active 记录摘要');
  });
});
