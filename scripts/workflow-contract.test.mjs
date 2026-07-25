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

test('Chinese user manual matches the current release and every navigation module', async () => {
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const help = await readFile(path.join(root, 'docs', 'HELP.md'), 'utf8');
  assert.match(help, new RegExp(`版本：v${manifest.version.replaceAll('.', '\\.')}(?:\\s|$)`));
  assert.match(help, /https:\/\/nextweb4\.github\.io\/gw\//);
  assert.match(help, /https:\/\/github\.com\/NextWeb4\/gw\/releases\/latest/);
  for (const moduleName of ['工作台', '任务管理', '文件收发', '公文写作', '周报生成', '历史档案', '数据迁移', '关于与设置']) {
    assert.match(help, new RegExp(moduleName), `manual must explain ${moduleName}`);
  }
  for (const operation of ['新建任务', '保存任务', '保存文件', '导入文档', '保存自定义格式', '重新汇总', '导出快照', '同步业务数据', '获取 AI 模型']) {
    assert.match(help, new RegExp(operation), `manual must explain ${operation}`);
  }
});
