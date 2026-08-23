import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.GW_BASE_URL || 'http://127.0.0.1:4193';
const evidenceDir = path.resolve(process.env.GW_BOARD_EVIDENCE_DIR || '../cases/gw-task-status-board/evidence');
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const evidence = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.name === 'mobile', hasTouch: viewport.name === 'mobile' });
  const pageOrigin = new URL(baseURL).origin;
  const unexpectedRequests = [];
  const errors = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['data:', 'blob:'].includes(url.protocol) && url.origin !== pageOrigin) unexpectedRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  const listMode = page.getByRole('button', { name: '列表', exact: true });
  const boardMode = page.getByRole('button', { name: '看板', exact: true });
  await listMode.waitFor();
  const initialListPressed = await listMode.getAttribute('aria-pressed');
  await boardMode.click();
  const board = page.getByRole('region', { name: '任务状态看板' });
  await board.waitFor();
  const columnNames = ['未启动', '进行中', '已超期', '已完成'];
  const columns = {};
  for (const label of columnNames) {
    const column = board.getByRole('region', { name: new RegExp(`^${label}，`) });
    columns[label] = { label: await column.getAttribute('aria-label'), empty: (await column.getByText('暂无任务').count()) > 0 };
  }

  const progressCard = board.getByRole('button', { name: '查看任务详情：推进全省基层治理年度工作总结' });
  await progressCard.focus();
  await page.keyboard.press('Enter');
  const detailTitle = await page.locator('.business-detail-panel').getByRole('heading', { level: 2 }).innerText();
  const selectedViaKeyboard = await progressCard.getAttribute('aria-current');
  await page.getByLabel('任务管理关键词').fill('办公厅来文');
  const filteredCards = await board.getByRole('button', { name: /查看任务详情：/ }).count();
  await page.getByRole('button', { name: '会议管理', exact: true }).click();
  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  const preservedMode = await boardMode.getAttribute('aria-pressed');
  const mobileGeometry = viewport.name === 'mobile' ? {
    listHeight: (await listMode.boundingBox())?.height ?? 0,
    boardHeight: (await boardMode.boundingBox())?.height ?? 0,
    cardHeight: (await board.getByRole('button', { name: /查看任务详情：/ }).first().boundingBox())?.height ?? 0,
    pageWidth: await page.locator('body').evaluate((body) => body.scrollWidth),
    viewportWidth: viewport.width,
  } : null;
  await page.screenshot({ path: path.join(evidenceDir, `gw-v0.7.24-task-board-${viewport.name}.png`), fullPage: true });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '任务管理', exact: true }).click();
  const resetListPressed = await page.getByRole('button', { name: '列表', exact: true }).getAttribute('aria-pressed');
  evidence.push({ viewport, initialListPressed, columns, detailTitle, selectedViaKeyboard, filteredCards, preservedMode, resetListPressed, mobileGeometry, unexpectedRequests, errors });
  await page.close();
}

await browser.close();
await writeFile(path.join(evidenceDir, 'gw-v0.7.24-task-board-runtime.json'), JSON.stringify({ version: '0.7.24', baseURL, evidence }, null, 2));
console.log(JSON.stringify({ version: '0.7.24', evidenceDir, evidence }, null, 2));
