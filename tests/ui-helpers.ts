import { expect, type Page } from '@playwright/test';

export async function openSetup(page: Page) {
  if (await page.locator('.game-shell').getAttribute('data-scene') === 'title') await page.getByTestId('new-adventure').click();
  await expect(page.locator('.game-shell')).toHaveAttribute('data-scene', 'setup');
}

export async function selectPlayer(page: Page, index: number) {
  await page.getByTestId(`player-slot-${index}`).click();
  await expect(page.getByLabel(`${index + 1}人めの学年`, { exact: true })).toBeVisible();
}

export async function configureParty(page: Page, grades: number[]) {
  await openSetup(page);
  await page.getByRole('group', { name: 'あそぶ人数', exact: true }).getByRole('button', { name: `${grades.length}人`, exact: true }).click();
  for (const [index, grade] of grades.entries()) {
    await selectPlayer(page, index);
    await page.getByLabel(`${index + 1}人めの学年`, { exact: true }).selectOption(String(grade));
  }
  await selectPlayer(page, 0);
}

export async function openSavedPreview(page: Page) {
  await page.getByRole('button', { name: /ほぞんした つづきから/ }).click();
  await expect(page.locator('.game-shell')).toHaveAttribute('data-scene', 'resume');
}

export async function resumeSavedAdventure(page: Page) {
  if (await page.locator('.game-shell').getAttribute('data-scene') !== 'resume') await openSavedPreview(page);
  await page.getByTestId('resume-adventure').click();
  await expect(page.getByTestId('resume-adventure')).toHaveCount(0);
}

export async function openPause(page: Page) {
  await page.getByRole('button', { name: /ひとやすみ/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

export async function resumePause(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: /ぼうけんを つづける/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

export async function saveAdventure(page: Page) {
  await openPause(page);
  await page.getByRole('dialog').getByRole('button', { name: 'ここまでを ほぞん', exact: true }).click();
  await expect(page.getByRole('dialog').getByTestId('save-status')).toHaveAttribute('data-state', 'saved');
  await resumePause(page);
}

export async function expectSavedState(page: Page, state: 'saved' | 'unsaved') {
  await openPause(page);
  await expect(page.getByRole('dialog').getByTestId('save-status')).toHaveAttribute('data-state', state);
  await resumePause(page);
}

interface MapSnapshot {
  checkpoints: number[];
  paths: Record<string, string | null>;
  routes: Record<string, string | null>;
}

const visibleMaps = new WeakMap<Page, MapSnapshot>();

/** Keep only values observed on the rendered map before it leaves the scene. */
export async function rememberMap(page: Page) {
  await expect(page.locator('.board-panel svg.adventure-board')).toBeVisible();
  const snapshot = await page.locator('.board-panel').evaluate(board => ({
    checkpoints: [...board.querySelectorAll('[data-checkpoint="true"]')].map(node => Number(node.getAttribute('data-square'))),
    paths: Object.fromEntries([...board.querySelectorAll('[data-chapter-path]')].map(node => [node.getAttribute('data-chapter-path')!, node.querySelector('path')?.getAttribute('d') ?? null])),
    routes: Object.fromEntries([...board.querySelectorAll('[data-chapter-path]')].map(node => [node.getAttribute('data-chapter-path')!, node.getAttribute('data-route')])),
  }));
  expect(snapshot.checkpoints).toHaveLength(3);
  visibleMaps.set(page, snapshot);
  return snapshot;
}

export function rememberedMap(page: Page): MapSnapshot {
  const snapshot = visibleMaps.get(page);
  if (!snapshot) throw new Error('Capture the visible map before inspecting an off-map scene.');
  return snapshot;
}
