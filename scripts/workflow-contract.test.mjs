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
