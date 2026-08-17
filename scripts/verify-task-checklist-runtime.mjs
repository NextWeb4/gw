import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const previewUrl = process.env.GW_PREVIEW_URL || 'http://127.0.0.1:4193/';
const evidenceDir = path.resolve('..', 'reports', 'evidence');
await mkdir(evidenceDir, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1440, height: 900, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
];

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const actionRequests = [];
    let recordActionRequests = false;
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('request', (request) => { if (recordActionRequests) actionRequests.push(request.url()); });

    await page.goto(previewUrl, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '任务管理', exact: true }).click();
    recordActionRequests = true;
    await page.getByRole('button', { name: '新建任务' }).click();
    const editor = page.getByRole('dialog', { name: '新建任务' });
    await editor.getByLabel('任务名称').fill(`运行证据检查清单-${viewport.name}`);
    const checklist = editor.getByRole('region', { name: '任务检查清单' });
    await checklist.getByRole('button', { name: '添加检查项' }).click();
    await checklist.getByLabel('检查项内容 1').fill('核对材料口径');
    await checklist.getByRole('button', { name: '添加检查项' }).click();
    await checklist.getByLabel('检查项内容 2').fill('完成报送复核');
    await checklist.getByLabel('完成检查项 2').check();
    const actionBoxes = [];
    for (const locator of [checklist.getByTitle('上移检查项').last(), checklist.getByTitle('下移检查项').first(), checklist.getByTitle('删除检查项').first()]) {
      actionBoxes.push(await locator.boundingBox());
    }
    await page.screenshot({ path: path.join(evidenceDir, `gw-v0.7.23-task-checklist-editor-${viewport.name}.png`), fullPage: true });
    await editor.getByRole('button', { name: '保存任务' }).click();

    const row = page.locator('.table-row').filter({ hasText: `运行证据检查清单-${viewport.name}` });
    await row.click();
    const detailChecklist = page.locator('.business-detail-panel').getByLabel('检查清单，已完成 1 项，共 2 项');
    await detailChecklist.waitFor({ state: 'visible' });
    await detailChecklist.scrollIntoViewIfNeeded();
    const detailBox = await detailChecklist.boundingBox();
    const rowText = await row.textContent();
    const detailText = await detailChecklist.textContent();
    const geometry = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    }));
    await page.screenshot({ path: path.join(evidenceDir, `gw-v0.7.23-task-checklist-detail-${viewport.name}.png`) });

    if (!rowText?.includes('检查清单 1/2') || !rowText.includes('未启动')) throw new Error(`${viewport.name}: 列表进度或独立任务状态异常`);
    if (!detailText?.includes('核对材料口径') || !detailText.includes('完成报送复核')) throw new Error(`${viewport.name}: 详情清单内容缺失`);
    if (geometry.bodyScrollWidth > geometry.innerWidth || geometry.documentScrollWidth > geometry.innerWidth) throw new Error(`${viewport.name}: 页面出现横向溢出`);
    if (viewport.isMobile && actionBoxes.some((box) => (box?.width || 0) < 44 || (box?.height || 0) < 44)) throw new Error(`${viewport.name}: 清单图标按钮不足 44px`);
    if (actionRequests.length) throw new Error(`${viewport.name}: 清单操作产生网络请求：${actionRequests.join(', ')}`);
    if (consoleErrors.length || pageErrors.length) throw new Error(`${viewport.name}: 浏览器错误：${[...consoleErrors, ...pageErrors].join(' | ')}`);

    results.push({
      viewport,
      browserVersion: await browser.version(),
      actionBoxes,
      detailBox,
      rowText: rowText?.trim(),
      detailText: detailText?.trim(),
      geometry,
      actionRequestCount: actionRequests.length,
      consoleErrors,
      pageErrors,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const evidencePath = path.join(evidenceDir, 'gw-v0.7.23-task-checklist-runtime.json');
await writeFile(evidencePath, `${JSON.stringify({ previewUrl, results }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ evidencePath, results }, null, 2));
