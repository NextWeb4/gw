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
    const group = page.getByRole('group', { name: '任务管理快捷筛选' });
    await group.waitFor({ state: 'visible' });
    recordActionRequests = true;

    const datePresent = group.getByRole('button', { name: '日期已填' });
    const dateMissing = group.getByRole('button', { name: '待补日期' });
    const attachmentsPresent = group.getByRole('button', { name: '有附件' });
    const attachmentsMissing = group.getByRole('button', { name: '无附件' });
    await datePresent.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    await datePresent.click();
    await attachmentsMissing.click();
    await page.getByLabel('任务管理筛选').selectOption('status:progress');
    await datePresent.focus();

    const chips = [];
    for (const [label, locator] of [
      ['日期已填', datePresent],
      ['待补日期', dateMissing],
      ['有附件', attachmentsPresent],
      ['无附件', attachmentsMissing],
    ]) {
      const box = await locator.boundingBox();
      chips.push({ label, pressed: await locator.getAttribute('aria-pressed'), box });
    }
    const geometry = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      bodyScrollWidth: document.body.scrollWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
    }));
    const countText = await page.locator('.ledger-view-summary > span').textContent();
    const groupBox = await group.boundingBox();
    await page.screenshot({ path: path.join(evidenceDir, `gw-v0.7.22-ledger-chips-${viewport.name}.png`), fullPage: true });

    if (countText?.trim() !== '显示 1 / 2 条任务') throw new Error(`${viewport.name}: 组合筛选计数异常：${countText}`);
    if (geometry.bodyScrollWidth > geometry.innerWidth || geometry.documentScrollWidth > geometry.innerWidth) throw new Error(`${viewport.name}: 页面出现横向溢出`);
    if (viewport.isMobile && chips.some((chip) => (chip.box?.height || 0) < 44)) throw new Error(`${viewport.name}: 快捷筛选触控高度不足 44px`);
    if (actionRequests.length) throw new Error(`${viewport.name}: 快捷筛选产生网络请求：${actionRequests.join(', ')}`);
    if (consoleErrors.length || pageErrors.length) throw new Error(`${viewport.name}: 浏览器错误：${[...consoleErrors, ...pageErrors].join(' | ')}`);

    await page.getByRole('button', { name: '清除当前台账筛选和排序' }).click();
    const resetPressed = await Promise.all([datePresent, dateMissing, attachmentsPresent, attachmentsMissing].map((locator) => locator.getAttribute('aria-pressed')));
    if (resetPressed.some((value) => value !== 'false')) throw new Error(`${viewport.name}: 清除后仍有快捷筛选处于选中状态`);

    results.push({
      viewport,
      browserVersion: await browser.version(),
      groupBox,
      chips,
      countText: countText?.trim(),
      geometry,
      actionRequestCount: actionRequests.length,
      consoleErrors,
      pageErrors,
      resetPressed,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const evidencePath = path.join(evidenceDir, 'gw-v0.7.22-ledger-chips-runtime.json');
await writeFile(evidencePath, `${JSON.stringify({ previewUrl, results }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ evidencePath, results }, null, 2));
