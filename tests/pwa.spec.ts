import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { questions } from '../src/questions';
import type { GameState } from '../src/engine';
import { configureParty, resumeSavedAdventure, saveAdventure } from './ui-helpers';

const scope = '/manabi-sugoroku/';
const prefix = 'metaborin/manabi-sugoroku/';
const saveKey = 'manabi-sugoroku-save-v1';
const repo = fileURLToPath(new URL('../', import.meta.url));
type OfflineStatus = { type: string; offlineReady: boolean; version: string };
type AssetManifest = { version: string; totalBytes: number; assets: { url: string; bytes: number; integrity: string }[] };

function observePage(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { void dialog.accept(); });
  return errors;
}

async function readStatus(page: Page) {
  return page.evaluate(async (): Promise<OfflineStatus> => {
    const registration = await navigator.serviceWorker.getRegistration();
    const worker = navigator.serviceWorker.controller ?? registration?.active;
    if (!worker) throw new Error('No active Service Worker');
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Offline status timed out')); }, 8_000);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(event.data as OfflineStatus);
      };
      worker.postMessage({ type: 'GET_OFFLINE_STATUS' }, [channel.port2]);
    });
  });
}

async function expectReady(page: Page, screenshot?: string) {
  await page.getByRole('button', { name: /せってい/ }).click();
  await expect(page.getByTestId('offline-status')).toHaveAttribute('data-state', 'ready', { timeout: 40_000 });
  if (screenshot) await page.screenshot({ path: screenshot, fullPage: true });
  await page.getByRole('dialog').getByRole('button', { name: 'とじる', exact: true }).click();
  const status = await readStatus(page);
  expect(status.type).toBe('OFFLINE_STATUS');
  expect(status.offlineReady).toBe(true);
  return status;
}

async function displayedQuestion(page: Page) {
  await expect(page.locator('.question-prompt')).toBeVisible();
  const prompt = (await page.locator('.question-prompt').innerText()).trim();
  const choices = await page.locator('.choice > span:nth-child(2)').allTextContents();
  const found = questions.filter(question => question.prompt === prompt && JSON.stringify(question.choices) === JSON.stringify(choices));
  expect(found).toHaveLength(1);
  return found[0]!;
}

async function roll(page: Page) {
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  return displayedQuestion(page);
}

async function finishTurn(page: Page) {
  const question = await displayedQuestion(page);
  await page.locator('.choice').nth(question.answer).click();
  await page.getByTestId('continue-answer').click();
  await expect(page.locator('.event-scene')).toBeVisible();
  if (await page.getByTestId('rescue-action').count()) {
    let lastAction = 0;
    for (let step = 0; step < 3; step += 1) {
      await expect.poll(() => Date.now() - lastAction, { intervals: [50] }).toBeGreaterThanOrEqual(300);
      await page.getByTestId('rescue-action').click();
      lastAction = Date.now();
      await expect(page.getByTestId('rescue-event')).toHaveAttribute('data-progress', String(step + 1));
    }
  }
  const route = page.locator('button[data-route="forest"]');
  if (await route.count()) await route.click();
  else await page.getByTestId('next-turn').click();
}

async function snapshot(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!) as GameState, saveKey);
}

async function questionState(page: Page) {
  return {
    prompt: await page.locator('.question-prompt').innerText(),
    turn: await page.locator('.turn-banner').innerText(),
    progress: await page.getByRole('progressbar').getAttribute('aria-valuenow'),
    selected: await page.locator('.choice.tried').allTextContents(),
    hint: await page.locator('.hint-box').innerText(),
  };
}

test('production manifest, icons, installability and every build asset are ready offline', async ({ page, context }, testInfo) => {
  const errors = observePage(page);
  await page.goto('./');
  const status = await expectReady(page, 'artifacts/pwa/ready-settings.png');
  expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(false);
  await expect(page.locator('.pwa-update-banner')).toHaveCount(0);
  const manifestResponse = await page.request.get('./manifest.webmanifest');
  expect(manifestResponse.status()).toBe(200);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({ id: scope, start_url: scope, scope, display: 'standalone', lang: 'ja' });
  expect(manifest.icons.some((icon: { sizes: string; purpose: string }) => icon.sizes === '192x192' && icon.purpose === 'any')).toBe(true);
  expect(manifest.icons.some((icon: { sizes: string; purpose: string }) => icon.sizes === '512x512' && icon.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons as { src: string; sizes: string }[]) {
    const result = await page.request.get(icon.src);
    expect(result.status()).toBe(200);
    const dimensions = await page.evaluate(async src => {
      const image = new Image(); image.src = src; await image.decode();
      return `${image.naturalWidth}x${image.naturalHeight}`;
    }, icon.src);
    expect(dimensions).toBe(icon.sizes);
  }
  const cdp = await context.newCDPSession(page);
  const appManifest = await cdp.send('Page.getAppManifest');
  expect(appManifest.errors).toEqual([]);
  const installability = await cdp.send('Page.getInstallabilityErrors');
  await testInfo.attach('installability.json', { body: JSON.stringify(installability, null, 2), contentType: 'application/json' });
  // Playwright contexts are private; the browser may reject native installation only for that reason.
  expect(installability.installabilityErrors.filter(error => error.errorId !== 'in-incognito')).toEqual([]);
  const assetsResponse = await page.request.get('./precache-manifest.json');
  expect(assetsResponse.status()).toBe(200);
  const assets = await assetsResponse.json() as AssetManifest;
  expect(assets.version).toBe(status.version);
  expect(assets.assets.length).toBeGreaterThan(5);
  for (const asset of assets.assets) {
    const response = await page.request.get(new URL(asset.url, page.url()).href);
    expect(response.status(), asset.url).toBe(200);
    expect((await response.body()).length, asset.url).toBe(asset.bytes);
  }
  const cached = await page.evaluate(async ({ name, urls }) => {
    const cache = await caches.open(name);
    return Promise.all(urls.map(async url => ({ url, present: Boolean(await cache.match(url)) })));
  }, { name: prefix + assets.version, urls: [...assets.assets.map(asset => asset.url), `${scope}precache-manifest.json`] });
  expect(cached.filter(asset => !asset.present)).toEqual([]);
  expect(errors).toEqual([]);
});

for (const grades of [[1], [1, 6, 3, 5]]) {
  test(`${grades.length} players can progress, explicitly save and resume after an offline reload`, async ({ page, context }) => {
    const errors = observePage(page);
    await page.goto('./');
    await expectReady(page);
    await context.setOffline(true);
    await page.reload();
    await configureParty(page, grades);
    await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
    for (const [index, grade] of grades.entries()) {
      await expect(page.locator('.turn-banner')).toContainText(`${index + 1}人め ・ 小学${grade}年`);
      expect((await roll(page)).grade).toBe(grade);
      await finishTurn(page);
    }
    const question = await roll(page);
    await page.locator('.choice').nth((question.answer + 1) % question.choices.length).click();
    await page.getByRole('button', { name: /ヒント/ }).click();
    const before = await questionState(page);
    await saveAdventure(page);
    const saved = await snapshot(page);
    expect(saved.players.map(player => player.grade)).toEqual(grades);
    expect(saved.turnsCompleted).toBe(grades.length);
    expect(saved.completedByPlayer.every(count => count >= 1)).toBe(true);
    await page.reload();
    await resumeSavedAdventure(page);
    expect(await questionState(page)).toEqual(before);
    expect(await snapshot(page)).toEqual(saved);
    await page.locator('.choice').nth(question.answer).click();
    await expect(page.locator('.answer-feedback')).toBeVisible();
    expect((await readStatus(page)).offlineReady).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('an update waits through two open tabs, preserves play, and applies after all tabs close', async ({ browser }) => {
  const directory = mkdtempSync(join(tmpdir(), 'manabi-pwa-browser-'));
  const build1 = join(directory, 'v1');
  const build2 = join(directory, 'v2');
  cpSync(join(repo, 'dist'), build1, { recursive: true });
  cpSync(join(repo, 'dist'), build2, { recursive: true });
  const index = readFileSync(join(build2, 'index.html'), 'utf8');
  writeFileSync(join(build2, 'index.html'), index.replace('</head>', '<meta name="pwa-test-build" content="v2"></head>'));
  execFileSync(process.execPath, [join(repo, 'scripts', 'build-pwa.mjs'), '--dist', build2]);
  const version1 = (JSON.parse(readFileSync(join(build1, 'precache-manifest.json'), 'utf8')) as AssetManifest).version;
  const version2 = (JSON.parse(readFileSync(join(build2, 'precache-manifest.json'), 'utf8')) as AssetManifest).version;
  expect(version2).not.toBe(version1);
  let servedBuild = build1;
  const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  const server = createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      if (!pathname.startsWith(scope)) { response.writeHead(404).end(); return; }
      const relative = pathname.slice(scope.length) || 'index.html';
      const path = resolve(servedBuild, relative);
      if (!path.startsWith(resolve(servedBuild) + sep) || !statSync(path, { throwIfNoEntry: false })?.isFile()) {
        response.writeHead(404).end(); return;
      }
      response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(readFileSync(path));
    } catch { response.writeHead(500).end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');
  const baseURL = `http://127.0.0.1:${address.port}${scope}`;
  const context = await browser.newContext({ baseURL, viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', serviceWorkers: 'allow' });
  try {
    const page = await context.newPage();
    const errors = observePage(page);
    await page.goto('./');
    expect((await expectReady(page)).version).toBe(version1);
    // First installation intentionally does not claim an already open document.
    await page.reload();
    await configureParty(page, [1, 6, 3, 5]);
    await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
    const question = await roll(page);
    await page.locator('.choice').nth((question.answer + 1) % question.choices.length).click();
    await page.getByRole('button', { name: /ヒント/ }).click();
    const before = await questionState(page);
    const sentinel = `unrelated-game-${version1.slice(0, 8)}`;
    await page.evaluate(async name => { const cache = await caches.open(name); await cache.put('/other-game/sentinel', new Response('keep me')); }, sentinel);
    const second = await context.newPage();
    observePage(second);
    await second.goto('./');
    await expectReady(second);
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations += 1; });
    servedBuild = build2;
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state), { timeout: 40_000 }).toBe('installed');
    await expect(page.locator('.pwa-update-banner')).toBeVisible();
    await page.screenshot({ path: 'artifacts/pwa/waiting-adventure.png', fullPage: true });
    expect((await readStatus(page)).version).toBe(version1);
    expect(await questionState(page)).toEqual(before);
    expect(navigations).toBe(0);
    await page.getByRole('button', { name: '更新のしかた', exact: true }).click();
    await expect(page.getByTestId('pwa-update-help')).toBeVisible();
    await page.screenshot({ path: 'artifacts/pwa/waiting-settings.png', fullPage: true });
    await page.getByRole('dialog').getByRole('button', { name: 'とじる', exact: true }).click();
    await second.close();
    expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(true);
    expect(await questionState(page)).toEqual(before);
    await saveAdventure(page);
    const saved = await snapshot(page);
    expect(errors).toEqual([]);
    await page.close();
    expect(context.pages()).toHaveLength(0);
    // Observe the worker itself while there are no window clients to keep the old version alive.
    await expect.poll(async () => {
      for (const worker of context.serviceWorkers()) {
        try {
          if (await worker.evaluate('self.registration.active?.state === "activated" && !self.registration.waiting')) return true;
        } catch { /* The old worker can terminate while being observed. */ }
      }
      return false;
    }, { timeout: 30_000 }).toBe(true);
    const reopened = await context.newPage();
    const reopenedErrors = observePage(reopened);
    await reopened.goto('./');
    expect((await expectReady(reopened)).version).toBe(version2);
    await expect(reopened.locator('meta[name="pwa-test-build"]')).toHaveAttribute('content', 'v2');
    await context.setOffline(true);
    await reopened.reload();
    await resumeSavedAdventure(reopened);
    expect(await questionState(reopened)).toEqual(before);
    expect(await snapshot(reopened)).toEqual(saved);
    const cacheState = await reopened.evaluate(async ({ current, old, sentinel }) => {
      const keys = await caches.keys();
      const response = await (await caches.open(sentinel)).match('/other-game/sentinel');
      return { current: keys.includes(current), old: keys.includes(old), sentinel: await response?.text() };
    }, { current: prefix + version2, old: prefix + version1, sentinel });
    expect(cacheState).toEqual({ current: true, old: false, sentinel: 'keep me' });
    expect(reopenedErrors).toEqual([]);
  } finally {
    await context.close();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    expect(dirname(resolve(directory))).toBe(resolve(tmpdir()));
    expect(directory).toContain('manabi-pwa-browser-');
    rmSync(directory, { recursive: true, force: true });
  }
});
