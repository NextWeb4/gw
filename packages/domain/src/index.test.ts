import { describe, expect, it } from 'vitest';
import { buildWeeklyReportSummary, createId, generateTaskWorkSummary, isValidIsoDate, sampleDocuments, sampleTasks } from './index.js';

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

  it('generates deterministic work summaries from task facts', () => {
    expect(generateTaskWorkSummary({ ...sampleTasks[0], partnerStatus: [{ name: '综合科', status: 'progress' }] }, 'coordination')).toContain('已协调综合科');
    expect(generateTaskWorkSummary(sampleTasks[1], 'progress')).toContain('当前状态为未启动');
  });
});
