import { describe, expect, it } from 'vitest';
import { sampleDocuments, sampleMeetings, sampleTasks } from '@hxhwang/domain';
import type { AgendaSources } from './agenda';
import { buildWorkBriefing } from './work-briefing';

describe('local work briefing derivation', () => {
  const sources = {
    tasks: [
      { ...sampleTasks[0], id: 'task-overdue', name: '逾期任务', deadline: '2026-07-25', status: 'progress' },
      { ...sampleTasks[0], id: 'task-today', name: '今天任务', deadline: '2026-07-26', status: 'pending' },
      { ...sampleTasks[0], id: 'task-upcoming', name: '边界任务', deadline: '2026-08-02', status: 'pending' },
      { ...sampleTasks[0], id: 'task-done', name: '已完成任务', deadline: '2026-07-26', status: 'done' },
      { ...sampleTasks[0], id: 'task-unscheduled', name: '待补任务', deadline: '', status: 'pending' },
      { ...sampleTasks[0], id: 'task-invalid', name: '无效日期任务', deadline: '2026-02-30', status: 'pending' },
      { ...sampleTasks[0], id: 'task-deleted', name: '已删除任务', deadline: '2026-07-26', status: 'pending', deletedAt: '2026-07-31T08:00:00.000Z' },
    ],
    meetings: [{ ...sampleMeetings[0], id: 'meeting-today', subject: '今天会议', meetingTime: '2026-07-26T09:00' }],
    documents: [{ ...sampleDocuments[0], id: 'document-today', title: '今日文件', docDate: '2026-07-26' }],
    researches: [],
    seals: [],
    materials: [],
  } satisfies AgendaSources;

  it('keeps every fixed section and reuses the work-overview lifecycle rules', () => {
    expect(buildWorkBriefing(sources, '2026-07-26')).toBe([
      '【今日工作简报】2026-07-26',
      '逾期',
      '- 任务｜逾期任务｜截止 7月25日',
      '今天',
      '- 任务｜今天任务｜今天 全天',
      '- 文件｜今日文件｜今天 全天',
      '- 会议｜今天会议｜今天 09:00',
      '未来 7 天',
      '- 任务｜边界任务｜8月2日',
      '未排期',
      '- 任务｜待补任务｜待补日期',
      '- 任务｜无效日期任务｜待补日期',
    ].join('\n'));
  });

  it('normalizes presentation whitespace without changing derived order', () => {
    const spacedSources = {
      ...sources,
      tasks: [{ ...sources.tasks[1], name: '  稳定\n标题\t文本  ', status: 'pending' as const }],
      meetings: [],
      documents: [],
    };

    expect(buildWorkBriefing(spacedSources, '2026-07-26')).toBe([
      '【今日工作简报】2026-07-26',
      '逾期',
      '- 暂无',
      '今天',
      '- 任务｜稳定 标题 文本｜今天 全天',
      '未来 7 天',
      '- 暂无',
      '未排期',
      '- 暂无',
    ].join('\n'));
  });

  it('rejects an invalid briefing anchor date', () => {
    expect(() => buildWorkBriefing({ tasks: [], meetings: [], documents: [], researches: [], seals: [], materials: [] }, '2026-02-30')).toThrow('无效概览日期：2026-02-30');
  });
});
