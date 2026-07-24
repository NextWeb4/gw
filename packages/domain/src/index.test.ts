import { describe, expect, it } from 'vitest';
import { buildWeeklyReportSummary, createId, sampleDocuments, sampleTasks } from './index.js';

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
  });

  it('builds a date-bounded weekly summary from recorded facts', () => {
    const report = buildWeeklyReportSummary(sampleTasks, sampleDocuments, '2026-07-20', '2026-07-26');
    expect(report.taskIds).toEqual(['task_demo_1', 'task_demo_2']);
    expect(report.documentIds).toEqual(['doc_demo_1']);
    expect(report.contentText).toContain('已完成任务清单整理');
    expect(report.contentText).toContain('关于做好年度重点工作的通知');
    expect(report.contentText).toContain('计划于2026-07-25前完成');
  });

  it('rejects an inverted weekly date range', () => {
    expect(() => buildWeeklyReportSummary([], [], '2026-07-27', '2026-07-20')).toThrow(/起止日期无效/);
  });
});
