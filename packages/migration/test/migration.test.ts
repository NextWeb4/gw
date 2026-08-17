import { describe, expect, it } from 'vitest';
import upgrade04 from './fixtures/upgrade04.json' with { type: 'json' };
import wenxibuddy0722 from './fixtures/wenxibuddy0722.json' with { type: 'json' };
import { migrateLegacyExport } from '../src/index.js';

describe('legacy migration', () => {
  it('imports all archive module kinds from upgrade04', async () => {
    const bundle = await migrateLegacyExport(upgrade04);
    expect(bundle.tasks).toHaveLength(1);
    expect(bundle.tasks[0]).toMatchObject({ id: 'task_old', name: '旧版任务', status: 'progress', checklist: [], files: ['att_old'] });
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]).toMatchObject({ id: 'doc_old', title: '旧版文件', docType: '收文', files: ['att_old'] });
    expect(bundle.archives.map((record) => record.type).sort()).toEqual(['material', 'meeting', 'research', 'seal']);
    expect(bundle.archives.map((record) => record.id).sort()).toEqual(['material_material_old', 'meeting_meeting_old', 'research_research_old', 'seal_seal_old']);
    expect(bundle.archives.find((record) => record.type === 'material')).toMatchObject({ title: '旧版物资', date: '2026-07-04', files: ['material_inline_material_old_0'] });
    expect(bundle.attachments[0]).toMatchObject({ id: 'att_old', name: '证明材料.txt' });
    expect(bundle.attachments[0]?.sha256).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(bundle.report.imported).toEqual({ tasks: 1, meetings: 1, documents: 1, researches: 1, seals: 1, materials: 1, weekly: 0, skills: 0, settings: 1 });
    expect(bundle.report.attachments).toBe(2);
    expect(bundle.tasks[0]?.sourceVersion).toContain('导出格式未区分');
    expect(bundle.tasks[0]?.legacyPayload?.legacyOnly).toBe('keep-me');
    expect(bundle.skills).toHaveLength(0);
    expect(bundle.attachments[0]).toMatchObject({ data: 'YWJj', mimeType: 'text/plain', size: 3, createdAt: '2026-07-01T01:00:00.000Z' });
    expect(bundle.attachments[1]).toMatchObject({ id: 'material_inline_material_old_0', name: '物资清单.txt', data: 'aW5saW5l', mimeType: 'text/plain', size: 6, createdAt: '2026-07-04T00:00:00.000Z' });
    expect(bundle.attachments[1]?.sha256).toBe('995cf20a9c45daaf0a2cc31e85c290032ced97aadbac6c9d625595f5ce0ed427');
    expect(bundle.report.warnings.some((warning) => warning.includes('无法仅凭导出包可靠区分'))).toBe(true);
    expect(bundle.report.warnings.some((warning) => warning.includes('未包含 Skill'))).toBe(true);
    expect(bundle.report.warnings.some((warning) => warning.includes('物资记录迁移 1 个内嵌附件'))).toBe(true);
    expect(bundle.settings.some((setting) => setting.id === 'work_categories')).toBe(true);
  });

  it('keeps version, stages, weekly archive and attachment from WenXiBuddy 0722', async () => {
    const bundle = await migrateLegacyExport(wenxibuddy0722);
    expect(bundle.report.sourceVersion).toContain('导出格式未区分');
    expect(bundle.tasks[0]).toMatchObject({ id: 'task_new', status: 'done', checklist: [], files: ['att_new'] });
    expect(bundle.tasks[0]?.stages[0]?.name).toBe('报送');
    expect(bundle.documents[0]).toMatchObject({ id: 'doc_new', title: '新版文件', docType: '发文', code: '测试〔2026〕1号' });
    expect(bundle.archives).toHaveLength(1);
    expect(bundle.archives[0]).toMatchObject({ id: 'weekly_weekly_new', type: 'weekly', title: '周报', summary: '本周完成整理' });
    expect(bundle.attachments[0]).toMatchObject({ id: 'att_new', name: '新版附件.docx', size: 4, data: 'ZGF0YQ==', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', createdAt: '2026-07-22T01:00:00.000Z' });
    expect(bundle.attachments[0]?.sha256).toBe('3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7');
    expect(bundle.settings).toHaveLength(1);
    expect(bundle.skills).toHaveLength(0);
    expect(bundle.settings[0]?.id).toBe('work_required_fields');
    expect(bundle.report.imported).toEqual({ tasks: 1, meetings: 0, documents: 1, researches: 0, seals: 0, materials: 0, weekly: 1, skills: 0, settings: 1 });
  });

  it('imports a separately supplemented WenXi Skill without dropping its legacy fields', async () => {
    const enriched = structuredClone(wenxibuddy0722) as Record<string, unknown> & { wenxiSkills: unknown[] };
    enriched.wenxiSkills = [{ id: 'skill_new', name: '新版 Skill', content: '# 新版写作规则', legacySkillOnly: 'keep-skill' }];
    const bundle = await migrateLegacyExport(enriched);
    expect(bundle.report.sourceVersion).toBe('WenXiBuddy 0722');
    expect(bundle.skills[0]).toMatchObject({ id: 'skill_new', name: '新版 Skill', content: '# 新版写作规则', sourceVersion: 'WenXiBuddy 0722' });
    expect(bundle.skills[0]?.legacyPayload.legacySkillOnly).toBe('keep-skill');
    expect(bundle.report.imported.skills).toBe(1);
  });

  it('reports duplicate attachment ids and unresolved references without inflating counts', async () => {
    const duplicated = structuredClone(upgrade04) as Record<string, unknown> & { indexedDBFiles: Array<Record<string, unknown>>; localStorage: Record<string, string> };
    duplicated.indexedDBFiles.push({ ...duplicated.indexedDBFiles[0] });
    const tasks = JSON.parse(duplicated.localStorage.work_tasks_data) as Array<Record<string, unknown>>;
    tasks[0]!.files = ['att_old', 'att_missing'];
    duplicated.localStorage.work_tasks_data = JSON.stringify(tasks);

    const bundle = await migrateLegacyExport(duplicated);
    expect(bundle.attachments).toHaveLength(2);
    expect(bundle.report.attachments).toBe(2);
    expect(bundle.report.warnings).toContain('附件 ID 重复，已保留首条记录：att_old');
    expect(bundle.report.warnings).toContain('1 个附件引用未包含在导出包中：att_missing');
  });

  it('preserves a valid zero-byte attachment size instead of its stale declaration', async () => {
    const withEmpty = structuredClone(upgrade04) as Record<string, unknown> & { indexedDBFiles: Array<Record<string, unknown>> };
    withEmpty.indexedDBFiles.push({ id: 'att_empty', name: '空文件.txt', type: 'text/plain', size: 99, data: 'data:text/plain;base64,' });
    const bundle = await migrateLegacyExport(withEmpty);
    expect(bundle.attachments.find((attachment) => attachment.id === 'att_empty')).toMatchObject({ size: 0, data: '', sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' });
  });
});
