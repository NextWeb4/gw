import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { parse } from 'yaml';
import { desktopEditionMetadata } from '../apps/desktop/scripts/edition-config.mjs';

const root = path.resolve(import.meta.dirname, '..');

async function readWorkflow(name) {
  const source = await readFile(path.join(root, '.github', 'workflows', name), 'utf8');
  return parse(source);
}

function uploadPath(workflow, jobName, action) {
  const steps = workflow.jobs?.[jobName]?.steps;
  assert.ok(Array.isArray(steps), `${jobName} job must define steps`);
  const upload = steps.find((step) => step.uses === action);
  assert.ok(upload, `${jobName} job must use ${action}`);
  return upload.with?.path;
}

test('intranet artifact uploads the isolated intranet build output', async () => {
  const workflow = await readWorkflow('intranet.yml');
  const steps = workflow.jobs.build.steps;
  const buildIndex = steps.findIndex((step) => step.run === 'pnpm build:web:intranet');
  const uploadIndex = steps.findIndex((step) => step.uses === 'actions/upload-artifact@v4');

  assert.notEqual(buildIndex, -1, 'intranet workflow must build the intranet target');
  assert.ok(uploadIndex > buildIndex, 'intranet artifact must be uploaded after its build');
  assert.equal(uploadPath(workflow, 'build', 'actions/upload-artifact@v4'), 'apps/web/dist-intranet');
});

test('public Pages workflows upload only the public build output', async () => {
  const pages = await readWorkflow('pages.yml');
  const contentSync = await readWorkflow('content-sync.yml');

  assert.equal(uploadPath(pages, 'build', 'actions/upload-pages-artifact@v3'), 'apps/web/dist');
  assert.equal(uploadPath(contentSync, 'sync', 'actions/upload-pages-artifact@v3'), 'apps/web/dist');
  const pagesBuild = pages.jobs.build.steps.find((step) => step.run === 'pnpm --filter @hxhwang/web build');
  const syncBuild = contentSync.jobs.sync.steps.find((step) => step.run === 'pnpm --filter @hxhwang/web build');
  assert.equal(pagesBuild?.env?.VITE_BASE_PATH, '/gw/');
  assert.equal(syncBuild?.env?.VITE_BASE_PATH, '/gw/');
});

test('only the public demonstration build initializes fictional business data', async () => {
  const [viteConfig, app] = await Promise.all([
    readFile(path.join(root, 'apps', 'web', 'vite.config.ts'), 'utf8'),
    readFile(path.join(root, 'apps', 'web', 'src', 'App.tsx'), 'utf8'),
  ]);

  assert.match(viteConfig, /__SEED_DEMO_DATA__:\s*JSON\.stringify\(distributionMode === 'public'\)/);
  assert.match(viteConfig, /sourcemap:\s*distributionMode === 'public'/, 'private Web and desktop artifacts must not embed public demo source text through source maps');
  assert.match(app, /if \(__SEED_DEMO_DATA__\) await seedDemoData\(\)/);
  assert.doesNotMatch(app, /(?:localStorage|document\.cookie).*ai-history|ai-history.*(?:localStorage|document\.cookie)/s, 'AI history must stay in the local data adapter');
  assert.match(app, /putRecord\('setting', stored\.id, \{ type: 'ai-history'/, 'AI history must use the existing local setting records');
});

test('public PWA activates updates and reloads an already controlled page', async () => {
  const viteConfig = await readFile(path.join(root, 'apps', 'web', 'vite.config.ts'), 'utf8');
  const webEntry = await readFile(path.join(root, 'apps', 'web', 'src', 'main.tsx'), 'utf8');

  assert.match(viteConfig, /skipWaiting:\s*true/, 'updated workers must not remain waiting behind the old application shell');
  assert.match(viteConfig, /clientsClaim:\s*true/, 'an activated worker must claim existing Pages clients');
  assert.match(webEntry, /navigator\.serviceWorker\.controller/, 'the client must distinguish an update from the first worker installation');
  assert.match(webEntry, /controllerchange/, 'the client must observe a worker taking control');
  assert.match(webEntry, /window\.location\.reload\(\)/, 'an already controlled page must reload once after an update takes control');
  assert.match(webEntry, /registration\?\.waiting\?\.postMessage\(\{ type: 'SKIP_WAITING' \}\)/, 'a worker already waiting at startup must be activated');
  assert.match(webEntry, /registration\.update\(\)\.catch/, 'online launches must explicitly check for a newer worker without breaking offline startup');
});

test('desktop release workflow builds both editions and verifies twelve edition-specific packages', async () => {
  const workflow = await readWorkflow('desktop.yml');
  assert.deepEqual(workflow.jobs.windows.strategy.matrix.edition, ['internet', 'intranet']);
  assert.deepEqual(workflow.jobs.linux.strategy.matrix.edition, ['internet', 'intranet']);
  const releaseStep = workflow.jobs.release.steps.find((step) => step.name === 'Verify release matrix and create checksums');
  assert.ok(releaseStep);
  for (const pattern of ['-${edition}-x64-setup.exe', '-${edition}-arm64-setup.exe', '-${edition}-x86_64.AppImage', '-${edition}-arm64.AppImage', '-${edition}-amd64.deb', '-${edition}-arm64.deb']) {
    assert.ok(releaseStep.run.includes(pattern), `release verification must include ${pattern}`);
  }
  const packager = await readFile(path.join(root, 'apps', 'desktop', 'scripts', 'package-edition.mjs'), 'utf8');
  assert.match(packager, /extraMetadata:\s*\{ hxhwangEdition: edition \}/);
  assert.ok(packager.includes('artifactName: `HxHwang-Gw-\\${version}-${edition}-\\${arch}'), 'edition-specific artifact name must retain electron-builder version/arch placeholders');
  assert.match(packager, /const unpackedPath = path\.join\(projectDir, 'release', unpackedDirectory\)/, 'sequential edition builds must target only their generated unpacked staging directory');
  assert.match(packager, /rm\(unpackedPath, \{ recursive: true, force: true/, 'each packaging attempt must start with a clean edition staging directory');
  assert.match(packager, /maxBuildAttempts = process\.platform === 'win32' \? 3 : 1/, 'only Windows packaging may use the bounded transient-lock retry');
  assert.match(packager, /error\?\.code === 'EBUSY'/, 'packaging retries must be limited to EBUSY file locks');
});

test('desktop edition metadata produces valid ASCII Debian package names', async () => {
  const packager = await readFile(path.join(root, 'apps', 'desktop', 'scripts', 'package-edition.mjs'), 'utf8');
  assert.match(packager, /packageName: editionMetadata\.debianPackageName/, 'DEB package name must be set explicitly for each edition');
  for (const [edition, metadata] of Object.entries(desktopEditionMetadata)) {
    assert.match(metadata.productName, /^[\x20-\x7e]+$/, `${edition} productName must contain printable ASCII only`);
    assert.match(metadata.debianPackageName, /^[a-z0-9][a-z0-9+.-]+$/, `${edition} Debian Package field must satisfy Debian naming rules`);
  }
  assert.notEqual(desktopEditionMetadata.internet.debianPackageName, desktopEditionMetadata.intranet.debianPackageName);
});

test('Debian smoke disables Chromium sandbox only inside the CI container', async () => {
  const workflow = await readWorkflow('desktop.yml');
  const smokeStep = workflow.jobs['debian-smoke'].steps.find((step) => step.name === 'Install and launch on Debian');
  assert.ok(smokeStep, 'desktop workflow must define the Debian launch step');
  assert.match(smokeStep.run, /docker run --rm/);
  assert.match(smokeStep.run, /xvfb-run/);
  assert.match(smokeStep.run, /--no-sandbox/);

  const productionFiles = [
    'apps/desktop/package.json',
    'apps/desktop/electron/main.mjs',
    'apps/desktop/electron/preload.mjs',
    'apps/desktop/electron/security.mjs',
  ];
  for (const file of productionFiles) {
    const source = await readFile(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, /--no-sandbox/, `${file} must not disable Chromium sandbox`);
  }
});

test('release-facing workspace manifests share one version', async () => {
  const manifests = [
    'package.json',
    'apps/web/package.json',
    'apps/desktop/package.json',
    'packages/domain/package.json',
    'packages/documents/package.json',
    'packages/local-data/package.json',
    'packages/migration/package.json',
    'packages/sync-client/package.json',
  ];
  const versions = await Promise.all(manifests.map(async (file) => {
    const manifest = JSON.parse(await readFile(path.join(root, file), 'utf8'));
    return [file, manifest.version];
  }));
  const expected = versions[0][1];
  for (const [file, version] of versions) assert.equal(version, expected, `${file} version must match the root manifest`);
});

test('Chinese user manual matches the current workspace and every navigation module', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const help = await readFile(path.join(root, 'docs', 'HELP.md'), 'utf8');
  const numberedSections = [...help.matchAll(/^## (\d+)\. /gm)].map((match) => Number(match[1]));
  assert.deepEqual(numberedSections, Array.from({ length: 25 }, (_, index) => index + 1), 'manual must keep 25 ordered top-level sections');
  assert.match(help, new RegExp(`版本：v${manifest.version.replaceAll('.', '\\.')}(?:\\s|$)`));
  assert.match(help, /https:\/\/nextweb4\.github\.io\/gw\//);
  assert.match(help, /https:\/\/github\.com\/NextWeb4\/gw\/releases\/latest/);
  for (const moduleName of [
    '工作台',
    '任务管理',
    '会议管理',
    '文件收发',
    '外出活动',
    '用章管理',
    '物资收发',
    '常用项管理',
    '公文写作',
    '周报生成',
    '统计分析',
    'AI 助手',
    '历史档案',
    '数据迁移',
    '关于与设置',
  ]) {
    assert.match(help, new RegExp(moduleName), `manual must explain ${moduleName}`);
  }
  for (const operation of [
    '新建任务',
    '保存任务',
    '新建会议',
    '保存会议',
    '保存文件',
    '新建外出活动',
    '保存活动',
    '新建用章记录',
    '保存用章',
    '新建物资记录',
    '保存物资',
    '保存全部修改',
    '导入文档',
    '保存自定义格式',
    '重新汇总',
    '复制为新记录',
    '导出快照',
    '同步业务数据',
    '获取 AI 模型',
  ]) {
    assert.match(help, new RegExp(operation), `manual must explain ${operation}`);
  }
  for (const topic of [
    '字段说明',
    '显式保存',
    '日期规则',
    '常用人员和单位',
    '任务附件',
    '恢复是合并/更新操作',
    '典型业务流程',
    '常见问题与排查',
    '日常操作检查清单',
    '当前版本未提供的功能',
  ]) {
    assert.match(help, new RegExp(topic), `detailed manual must explain ${topic}`);
  }
  assert.match(help, /当前十五个导航模块/);
  assert.match(help, /润色指引/);
  assert.match(help, /20,000 字符/);
  assert.match(help, /周报模板/);
  assert.match(help, /从范文提取结构/);
  assert.match(help, /按分组添加/);
  assert.match(help, /类目配色/);
  assert.match(help, /任务、会议、文件、外出活动、用章和物资是六个独立可编辑业务模块/);
  assert.match(help, /公开 Pages.*允许导入历史业务 JSON 和恢复快照/s);
  assert.match(help, /公开 Pages.*用户自备 Key/s);
  assert.match(help, /当前同步范围：[\s\S]*会议；[\s\S]*外出活动；[\s\S]*用章；[\s\S]*物资；/);
  assert.match(help, /API Key 不写入 IndexedDB、快照、URL、配置文件或应用日志/);
  assert.match(help, /新选择的附件在保存前只暂存于编辑会话/);
  assert.match(help, /删除任务、会议、文件、外出、用章、物资和周报前会显示确认框/);
  assert.match(help, /同步只上传六类同步业务记录实际引用的附件/);
  assert.doesNotMatch(help, /删除立即执行/);
  assert.doesNotMatch(help, /删除确认和逐条撤销/);

  for (const [sectionNumber, moduleName, saveAction] of [
    [7, '任务管理', '保存任务'],
    [8, '会议管理', '保存会议'],
    [9, '文件收发', '保存文件'],
    [10, '外出活动', '保存活动'],
    [11, '用章管理', '保存用章'],
    [12, '物资收发', '保存物资'],
  ]) {
    const section = help.match(new RegExp(`## ${sectionNumber}\\. ${moduleName}([\\s\\S]*?)(?=\\n## ${sectionNumber + 1}\\.)`))?.[1] || '';
    assert.match(section, /字段说明/, `${moduleName} section must explain its fields`);
    assert.match(section, new RegExp(saveAction), `${moduleName} section must explain ${saveAction}`);
    assert.match(section, /搜索/, `${moduleName} section must explain search behavior`);
    assert.match(section, /删除/, `${moduleName} section must explain deletion behavior`);
    assert.match(section, /附件/, `${moduleName} section must explain attachment behavior`);
  }
});
