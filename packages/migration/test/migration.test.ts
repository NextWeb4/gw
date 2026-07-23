import { describe, expect, it } from 'vitest';
import upgrade04 from './fixtures/upgrade04.json' with { type: 'json' };
import wenxibuddy0722 from './fixtures/wenxibuddy0722.json' with { type: 'json' };
import { migrateLegacyExport } from '../src/index.js';

describe('legacy migration', () => {
  it('imports all archive module kinds from upgrade04', async () => {
    const bundle = await migrateLegacyExport(upgrade04);
    expect(bundle.tasks).toHaveLength(1);
    expect(bundle.tasks[0]).toMatchObject({ id: 'task_old', name: '旧版任务', status: 'progress', files: ['att_old'] });
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]).toMatchObject({ id: 'doc_old', title: '旧版文件', docType: '收文', files: ['att_old'] });
    expect(bundle.archives.map((record) => record.type).sort()).toEqual(['material', 'meeting', 'research', 'seal']);
    expect(bundle.archives.map((record) => record.id).sort()).toEqual(['material_material_old', 'meeting_meeting_old', 'research_research_old', 'seal_seal_old']);
    expect(bundle.attachments[0]).toMatchObject({ id: 'att_old', name: '证明材料.txt' });
    expect(bundle.attachments[0]?.sha256).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(bundle.report.imported).toEqual({ tasks: 1, meetings: 1, documents: 1, researches: 1, seals: 1, materials: 1, weekly: 0, skills: 1, settings: 1 });
    expect(bundle.report.attachments).toBe(1);
    expect(bundle.tasks[0]?.sourceVersion).toBe('任务管理系统LV08');
    expect(bundle.tasks[0]?.legacyPayload?.legacyOnly).toBe('keep-me');
    expect(bundle.skills[0]).toMatchObject({ id: 'skill_old', name: '旧 Skill', content: '# 旧版写作规则', sourceVersion: '任务管理系统LV08' });
    expect(bundle.skills[0]?.legacyPayload.legacySkillOnly).toBe('keep-skill');
    expect(bundle.settings.some((setting) => setting.id === 'work_categories')).toBe(true);
  });

  it('keeps version, stages, weekly archive and attachment from WenXiBuddy 0722', async () => {
    const bundle = await migrateLegacyExport(wenxibuddy0722);
    expect(bundle.report.sourceVersion).toBe('WenXiBuddy 0722');
    expect(bundle.tasks[0]).toMatchObject({ id: 'task_new', status: 'done', sourceVersion: 'WenXiBuddy 0722' });
    expect(bundle.tasks[0]?.stages[0]?.name).toBe('报送');
    expect(bundle.documents[0]).toMatchObject({ id: 'doc_new', title: '新版文件', docType: '发文', code: '测试〔2026〕1号' });
    expect(bundle.archives).toHaveLength(1);
    expect(bundle.archives[0]).toMatchObject({ id: 'weekly_weekly_new', type: 'weekly', title: '周报', summary: '本周完成整理' });
    expect(bundle.attachments[0]).toMatchObject({ id: 'att_new', name: '新版附件.docx', size: 4 });
    expect(bundle.attachments[0]?.sha256).toBe('3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7');
    expect(bundle.settings).toHaveLength(1);
    expect(bundle.skills[0]).toMatchObject({ id: 'skill_new', name: '新版 Skill', content: '# 新版写作规则', sourceVersion: 'WenXiBuddy 0722' });
    expect(bundle.settings[0]?.id).toBe('work_required_fields');
    expect(bundle.report.imported).toEqual({ tasks: 1, meetings: 0, documents: 1, researches: 0, seals: 0, materials: 0, weekly: 1, skills: 1, settings: 1 });
  });
});
