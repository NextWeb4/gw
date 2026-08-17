import { describe, expect, it } from 'vitest';
import {
  sampleDocuments,
  sampleMaterials,
  sampleMeetings,
  sampleResearches,
  sampleSeals,
  sampleTasks,
  type MaterialRecord,
  type Task,
} from '@hxhwang/domain';
import { buildLedgerCsv } from './ledger-csv';

const bodyLines = (content: string) => content.replace(/^\uFEFF/, '').trimEnd().split('\r\n');

describe('current ledger CSV projection', () => {
  it('uses a stable task whitelist, localized nested values and the incoming visible order', () => {
    const first: Task = {
      ...sampleTasks[0],
      id: 'internal-id-must-not-export',
      name: '=HYPERLINK("https://invalid.local")',
      partnerStatus: [
        { name: '乙单位', status: 'progress', files: ['partner-attachment-id'] },
        { name: '甲单位', status: 'done', files: [] },
      ],
      stages: [{ id: 'stage-secret-id', name: '征求意见', partnerStatus: [{ name: '丙单位', status: 'notified', files: ['stage-file-id'] }] }],
      checklist: [{ id: 'check-secret-id', text: '核对预算口径', done: true }],
      files: ['task-attachment-id'],
      sourceVersion: 'legacy-secret-version',
      legacyPayload: { forbidden: 'legacy-secret-payload' },
      deletedAt: undefined,
    };
    const second = { ...sampleTasks[1], id: 'second-id', name: '第二条可见任务' };
    const records = [second, first];
    const originalOrder = records.map((record) => record.id);

    const file = buildLedgerCsv('tasks', records, { date: '2026-08-01', documents: [{ ...sampleDocuments[0], relatedTaskIds: ['second-id'] }] });
    const lines = bodyLines(file.content);

    expect(file).toMatchObject({ fileName: 'hxhwang-gw-任务管理-当前结果-2026-08-01.csv', mimeType: 'text/csv;charset=utf-8', rowCount: 2 });
    expect(lines[0]).toBe('"任务名称","工作类目","任务来源","交办人","交办日期","截止日期","状态","关联文件","配合单位","任务阶段","检查清单","备注","工作小结","附件数量","创建时间","更新时间"');
    expect(lines[1]).toContain('"第二条可见任务"');
    expect(lines[1]).toContain('"关于做好2026年全省重点工作的通知"');
    expect(lines[2]).toContain('"\'=HYPERLINK(""https://invalid.local"")"');
    expect(lines[2]).toContain('"乙单位（进行中）；甲单位（已完成）"');
    expect(lines[2]).toContain('"1. 征求意见：丙单位（已通知）"');
    expect(lines[2]).toContain('"1. 已完成：核对预算口径"');
    expect(lines[2]).toContain('"1"');
    expect(file.content).not.toMatch(/internal-id|stage-secret-id|check-secret-id|attachment-id|legacy-secret|forbidden/);
    expect(records.map((record) => record.id)).toEqual(originalOrder);
  });

  it('defines fixed headers for meetings, documents, researches and seals', () => {
    const cases = [
      [buildLedgerCsv('meetings', sampleMeetings, { date: '2026-08-01' }), '会议主题', '全省重点工作协调推进会'],
      [buildLedgerCsv('documents', sampleDocuments, { date: '2026-08-01', tasks: sampleTasks }), '文件标题', '关于做好2026年全省重点工作的通知'],
      [buildLedgerCsv('researches', sampleResearches, { date: '2026-08-01' }), '活动日期', '基层服务阵地运行情况调研'],
      [buildLedgerCsv('seals', sampleSeals, { date: '2026-08-01' }), '用章日期', '省直单位工作联系函'],
    ] as const;

    for (const [file, firstHeader, visibleValue] of cases) {
      const lines = bodyLines(file.content);
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain(`"${firstHeader}"`);
      expect(lines[1]).toContain(`"${visibleValue}"`);
      expect(file.content).not.toMatch(/_demo_|legacyPayload|sourceVersion|deletedAt|purgedAt/);
    }
    const documentCsv = buildLedgerCsv('documents', sampleDocuments, { date: '2026-08-01', tasks: sampleTasks });
    expect(bodyLines(documentCsv.content)[0]).toContain('"关联任务"');
    expect(documentCsv.content).toContain('"整理省政府办公厅来文并建立关联"');
  });

  it('calculates every exported material balance from the complete active ledger, not the filtered rows', () => {
    const materials: MaterialRecord[] = [
      { ...sampleMaterials[0], id: 'in', quantity: 5, type: 'in' },
      { ...sampleMaterials[0], id: 'out', quantity: 2, type: 'out', handlerTime: '2026-07-25' },
      { ...sampleMaterials[0], id: 'deleted', quantity: 50, type: 'in', deletedAt: '2026-07-30T00:00:00.000Z' },
    ];
    const visible = [materials[1]];

    const file = buildLedgerCsv('materials', visible, { date: '2026-08-01', allMaterials: materials });
    const lines = bodyLines(file.content);

    expect(lines[0]).toBe('"物资名称","规格","收发类型","数量","经手日期","经手人","来源或领用单位","账面库存","备注","附件数量","创建时间","更新时间"');
    expect(lines[1]).toContain('"领用","2"');
    expect(lines[1]).toContain('"3"');
    expect(file.rowCount).toBe(1);
    expect(file.content).not.toContain('"50"');
  });
});
