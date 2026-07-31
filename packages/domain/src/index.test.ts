import { describe, expect, it } from 'vitest';
import {
  applyTaskTextExtraction, buildWeeklyReportSummary, buildWorkStatistics, calculateMaterialStock, createId, defaultCategoryTint, extractTaskFromText,
  extractWeeklyTemplateFromSample, generateTaskWorkSummary, isValidIsoDate, isValidIsoDateTime, listStatisticsMonths, materialStockKey,
  mergeContactDirectory, mergePartnerGroupMembers, parseWeeklyTemplate, resolveCategoryTint, sampleDocuments, sampleMaterials,
  sampleContactDirectory, sampleMeetings, sampleResearches, sampleSeals, sampleTasks
} from './index.js';

const statisticsInput = {
  tasks: sampleTasks,
  meetings: sampleMeetings,
  documents: sampleDocuments,
  researches: sampleResearches,
  seals: sampleSeals,
  materials: sampleMaterials
};

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
