import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { parse } from 'yaml';

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
