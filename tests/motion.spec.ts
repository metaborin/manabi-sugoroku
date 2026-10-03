import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { questions } from '../src/questions';
import { configureParty, rememberMap, rememberedMap, resumeSavedAdventure } from './ui-helpers';

test.use({ reducedMotion: 'no-preference' });

interface MotionSample {
  stage: string;
  face: number;
  settled: boolean;
  position: number;
  caravanPosition: number;
  hudPosition: number;
  receipt: { dice: number; start: number; end: number } | null;
  step: number;
  total: number;
  hasQuestion: boolean;
  animation: string;
  transform: string;
  time: number;
}

const errors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const pageErrors: string[] = [];
  errors.set(page, pageErrors);
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.goto('./');
});

test.afterEach(async ({ page }) => {
  expect(errors.get(page) ?? [], 'motion produces no uncaught browser exceptions').toEqual([]);
});

async function start(page: Page, grades: number[] = [1]) {
  await configureParty(page, grades);
  await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
  await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', 'idle');
  await rememberMap(page);
}

async function setShortMotion(page: Page, enabled: boolean) {
  await page.getByRole('button', { name: /せってい/ }).click();
  const dialog = page.getByRole('dialog');
  const checkbox = dialog.getByLabel('うごきを みじかくする');
  await expect(checkbox, 'the UI preference is editable when the system does not request reduced motion').toBeEnabled();
  await checkbox.setChecked(enabled);
  await expect(checkbox).toBeChecked({ checked: enabled });
  await dialog.getByRole('button', { name: 'とじる', exact: true }).click();
}

/** Observe only rendered UI, so even reduced-motion 80 ms steps are recorded. */
function observeMotion(page: Page): Promise<MotionSample[]> {
  return page.evaluate(() => new Promise<MotionSample[]>(resolve => {
    const samples: MotionSample[] = [];
    let previous = '';
    const record = () => {
      const scene = document.querySelector<HTMLElement>('.roll-scene');
      const dice = document.querySelector<HTMLElement>('.dice');
      const board = document.querySelector<SVGElement>('.board-panel svg.adventure-board');
      const caravan = document.querySelector<SVGElement>('.board-panel .board-caravan');
      const count = document.querySelector<HTMLElement>('.roll-progress');
      const receipt = document.querySelector<HTMLElement>('.last-roll');
      const hasQuestion = Boolean(document.querySelector('.question-prompt'));
      const diceStyle = dice ? getComputedStyle(dice) : null;
      const sample = {
        stage: scene?.dataset.motionStage ?? (hasQuestion ? 'question' : 'absent'),
        face: Number(dice?.dataset.face ?? 0), settled: dice?.dataset.settled === 'true',
        position: Number(board?.dataset.position ?? -1), caravanPosition: Number(caravan?.dataset.position ?? -1),
        hudPosition: Number(document.querySelector<HTMLElement>('.journey-position')?.dataset.position ?? -1),
        receipt: receipt ? { dice: Number(receipt.dataset.dice), start: Number(receipt.dataset.start), end: Number(receipt.dataset.end) } : null,
        step: Number(count?.dataset.step ?? -1), total: Number(count?.dataset.total ?? -1), hasQuestion,
        animation: diceStyle?.animationName ?? 'none', transform: diceStyle?.transform ?? 'none', time: performance.now(),
      };
      const signature = JSON.stringify({ ...sample, time: 0, transform: '' });
      if (signature !== previous) { samples.push(sample); previous = signature; }
      if (hasQuestion) { observer.disconnect(); resolve(samples); }
    };
    const observer = new MutationObserver(record);
    observer.observe(document.querySelector('main')!, { subtree: true, childList: true, attributes: true, characterData: true });
    record();
  }));
}

async function lastRoll(page: Page) {
  await expect(page.locator('.question-prompt')).toBeVisible();
  const receipt = page.locator('.last-roll');
  await expect(receipt).toBeVisible();
  const dice = Number(await receipt.getAttribute('data-dice'));
  const start = Number(await receipt.getAttribute('data-start'));
  const end = Number(await receipt.getAttribute('data-end'));
  expect(dice).toBeGreaterThanOrEqual(1);
  expect(dice).toBeLessThanOrEqual(3);
  expect(end - start).toBe(dice);
  await expect(page.locator('.journey-position')).toHaveAttribute('data-position', String(end));
  await expect(page.locator('.board-panel svg.adventure-board')).toHaveCount(0);
  return { dice, start, end };
}

function uniqueConsecutive<T>(items: T[]): T[] {
  return items.filter((item, index) => index === 0 || item !== items[index - 1]);
}

function checkTrace(samples: MotionSample[], result: { dice: number; start: number; end: number }, reduced: boolean) {
  const stages = uniqueConsecutive(samples.map(sample => sample.stage));
  expect(stages).toEqual(reduced
    ? ['idle', 'settled', 'stepping', 'arrived', 'question']
    : ['idle', 'rolling', 'settled', 'stepping', 'arrived', 'question']);
  const movement = samples.filter(sample => sample.stage !== 'question');
  const positions = uniqueConsecutive(movement.map(sample => sample.position));
  expect(positions).toEqual(Array.from({ length: result.dice + 1 }, (_, step) => result.start + step));
  expect(movement.at(-1)!.stage).toBe('arrived');
  expect(movement.at(-1)!.caravanPosition).toBe(result.end);
  const questionFrame = samples.at(-1)!;
  expect(questionFrame.receipt).toEqual(result);
  expect(questionFrame.hudPosition).toBe(result.end);
  expect(questionFrame.position, 'the question scene replaces the rendered map').toBe(-1);
  for (const sample of samples) {
    if (sample.stage !== 'question') {
      expect(sample.caravanPosition).toBe(sample.position);
      expect(sample.hudPosition).toBe(sample.position);
      expect(sample.hasQuestion).toBe(false);
    }
    if (sample.stage === 'rolling' || sample.stage === 'settled') {
      expect(sample.position, 'the wagon waits for a readable settled die').toBe(result.start);
      expect(sample.step).toBe(0);
    }
    if (['settled', 'stepping', 'arrived'].includes(sample.stage)) {
      expect(sample.settled).toBe(true);
      expect(sample.face).toBe(result.dice);
      expect(sample.total).toBe(result.dice);
      expect(sample.step).toBe(sample.position - result.start);
    }
    if (reduced && sample.stage !== 'question') {
      expect(sample.animation).toBe('none');
      expect(sample.transform).toBe('none');
    }
  }
  if (!reduced) {
    expect(new Set(samples.filter(sample => sample.stage === 'rolling').map(sample => sample.face)).size).toBeGreaterThan(1);
    const settled = samples.find(sample => sample.stage === 'settled')!;
    const stepping = samples.find(sample => sample.stage === 'stepping')!;
    expect(stepping.time - settled.time, 'the result is held long enough to read before walking').toBeGreaterThanOrEqual(400);
  }
}

async function answer(page: Page, grade?: number) {
  const prompt = (await page.locator('.question-prompt').innerText()).trim();
  const choices = await page.locator('.choice > span:nth-child(2)').allTextContents();
  const matches = questions.filter(question => question.prompt === prompt && JSON.stringify(question.choices) === JSON.stringify(choices));
  expect(matches).toHaveLength(1);
  if (grade) expect(matches[0]!.grade).toBe(grade);
  await page.locator('.choice').nth(matches[0]!.answer).click();
  await expect(page.locator('.answer-feedback')).toBeVisible();
}

async function eventAndNext(page: Page, completed: number) {
  await page.getByTestId('continue-answer').click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(completed));
  if (completed % 4 === 0) {
    const checkpoint = rememberedMap(page).checkpoints[completed / 4 - 1];
    const position = Number(await page.locator('.journey-position').getAttribute('data-position'));
    expect(checkpoint, 'the rescue HUD matches the checkpoint previously shown on the map').toBe(position);
    for (let progress = 0; progress < 3; progress += 1) {
      if (progress > 0) {
        const previousAction = Date.now();
        await expect.poll(() => Date.now() - previousAction, { intervals: [50] }).toBeGreaterThanOrEqual(300);
      }
      await page.getByTestId('rescue-action').click();
      await expect(page.getByTestId('rescue-event')).toHaveAttribute('data-progress', String(progress + 1));
    }
    await expect(page.locator('.mission')).toContainText(`${completed / 4} / 3 びき`);
  }
  if (completed === 4 || completed === 8) {
    const route = completed === 4 ? 'river' : 'forest';
    await page.locator(`button[data-route="${route}"]`).click();
    await expect(page.locator(`[data-chapter-path="${completed / 4 + 1}"]`)).toHaveAttribute('data-route', route);
    await rememberMap(page);
  } else await page.getByTestId('next-turn').click();
}

async function motionState(page: Page) {
  return page.evaluate(() => ({
    stage: document.querySelector<HTMLElement>('.roll-scene')?.dataset.motionStage ?? 'question',
    face: document.querySelector<HTMLElement>('.dice')?.dataset.face,
    position: document.querySelector<SVGElement>('.board-panel svg.adventure-board')?.dataset.position,
    step: document.querySelector<HTMLElement>('.roll-progress')?.dataset.step,
  }));
}

async function staysStill(page: Page, milliseconds: number) {
  const initial = await motionState(page);
  const started = Date.now();
  let changed = false;
  await expect.poll(async () => {
    changed ||= JSON.stringify(await motionState(page)) !== JSON.stringify(initial);
    return Date.now() - started;
  }, { intervals: [80], timeout: milliseconds + 3_000 }).toBeGreaterThanOrEqual(milliseconds);
  expect(changed, 'paused motion does not change its face, stage, square or counter').toBe(false);
}

test('normal dice visibly rolls, settles, then counts every wagon square before the question', async ({ page }) => {
  await start(page);
  const trace = observeMotion(page);
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  const frames: Array<{ file: string; time: number; stage: string; position?: string; step?: string }> = [];
  for (const stage of ['rolling', 'settled', 'stepping']) {
    await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', stage);
    const file = `artifacts/motion-${stage}.png`;
    const time = await page.evaluate(() => performance.now());
    frames.push({ file, time, ...await motionState(page) });
    await page.screenshot({ path: file, fullPage: true });
  }
  const result = await lastRoll(page);
  const samples = await trace;
  checkTrace(samples, result, false);
  await writeFile('artifacts/motion-frame-times.json', JSON.stringify({
    clock: 'milliseconds since page navigation (performance.now)', frames, result, samples,
  }, null, 2));
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

test('reduced motion retains the settled die and square count without rolling or transforms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  const trace = observeMotion(page);
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  checkTrace(await trace, await lastRoll(page), true);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

test('the UI short-motion preference works independently of the system and can return to normal motion', async ({ page }) => {
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
  await start(page);
  await setShortMotion(page, true);
  let trace = observeMotion(page);
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  checkTrace(await trace, await lastRoll(page), true);
  await answer(page);
  await eventAndNext(page, 1);
  await setShortMotion(page, false);
  trace = observeMotion(page);
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  checkTrace(await trace, await lastRoll(page), false);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
});

test('enabling reduced motion during a roll completes the same turn once', async ({ page }) => {
  await start(page);
  const trace = observeMotion(page);
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', 'rolling');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const result = await lastRoll(page);
  const samples = await trace;
  const settled = samples.find(sample => sample.stage === 'settled')!;
  expect(settled.face).toBe(result.dice);
  expect(uniqueConsecutive(samples.filter(sample => sample.stage !== 'question').map(sample => sample.position))).toEqual(Array.from({ length: result.dice + 1 }, (_, step) => step));
  expect(samples.at(-1)!.receipt).toEqual(result);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await answer(page);
  await eventAndNext(page, 1);
  await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', 'idle');
});

for (const stage of ['rolling', 'stepping']) {
  test(`explicit skip during ${stage} commits exactly one move and stale timers cannot move the next player`, async ({ page }) => {
    await start(page, [1, 6]);
    // Hold browser timers while using real pointer input. A one-square stepping
    // stage lasts only 360 ms and can fall between assertion polling intervals.
    await page.clock.install();
    await page.clock.pauseAt(Date.now() + 1_000);
    await page.getByRole('button', { name: /サイコロを ふる/ }).dblclick();
    for (let elapsed = 0; elapsed < 5_000 && await page.locator('.roll-scene').getAttribute('data-motion-stage') !== stage; elapsed += 50) {
      await page.clock.runFor(50);
    }
    await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', stage);
    await page.getByTestId('skip-motion').dblclick();
    // Resume real time so stale callbacks would still be caught on the next turn.
    await page.clock.resume();
    const result = await lastRoll(page);
    expect(result.start).toBe(0);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await answer(page, 1);
    await eventAndNext(page, 1);
    await expect(page.locator('.turn-banner')).toContainText('2人め ・ 小学6年');
    await staysStill(page, 2_500);
    await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', 'idle');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    await expect(page.locator('.board-panel svg.adventure-board')).toHaveAttribute('data-position', String(result.end));
  });
}

test('simulated hidden-tab visibility suspends an in-flight roll and resumes without a jump', async ({ page }) => {
  await start(page);
  const trace = observeMotion(page);
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', 'settled');
  // Headless tabs may all report visible. Model the standard browser visibility event,
  // without changing game state or exposing an app-only testing interface.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await staysStill(page, 1_000);
  await expect(page.locator('.question-prompt')).toHaveCount(0);
  await page.evaluate(() => {
    delete (document as unknown as Record<string, unknown>).hidden;
    delete (document as unknown as Record<string, unknown>).visibilityState;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const result = await lastRoll(page);
  checkTrace(await trace, result, false);
});

test('pause preserves a motion stage; saving and reloading restarts the same pending roll only once', async ({ page }) => {
  await start(page, [3, 6]);
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', 'settled');
  const expectedDice = Number(await page.locator('.dice').getAttribute('data-face'));
  await page.getByRole('button', { name: /ひとやすみ/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await staysStill(page, 800);
  await page.getByRole('dialog').getByRole('button', { name: /ぼうけんを つづける/ }).click();
  await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', 'stepping');
  await page.getByRole('button', { name: /ひとやすみ/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'ここまでを ほぞん', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('ほぞんしたよ');
  await page.reload();
  await resumeSavedAdventure(page);
  await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', 'rolling');
  const result = await lastRoll(page);
  expect(result).toEqual({ dice: expectedDice, start: 0, end: expectedDice });
  await expect(page.locator('.turn-banner')).toContainText('1人め ・ 小学3年');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await answer(page, 3);
  await eventAndNext(page, 1);
  await expect(page.locator('.turn-banner')).toContainText('2人め ・ 小学6年');
});

test('cancelling restart preserves a rolling turn; confirming a new adventure discards every old motion callback', async ({ page }) => {
  await start(page, [2, 5]);
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', 'rolling');
  await page.getByRole('button', { name: /ひとやすみ/ }).click();
  const pausedMotion = await motionState(page);
  await staysStill(page, 500);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true }).click();
  await dialog.getByRole('button', { name: 'いまの ぼうけんに もどる', exact: true }).click();
  expect(await motionState(page)).toEqual(pausedMotion);
  await dialog.getByRole('button', { name: /ぼうけんを つづける/ }).click();
  await expect(page.locator('.question-prompt')).toHaveCount(0);
  await page.getByRole('button', { name: /ひとやすみ/ }).click();
  await dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true }).click();
  await dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true }).click();
  await expect(page.locator('.game-shell')).toHaveAttribute('data-scene', 'setup');
  await start(page, [1, 6]);
  await staysStill(page, 2_500);
  await expect(page.locator('.roll-scene')).toHaveAttribute('data-motion-stage', 'idle');
  await expect(page.locator('.board-panel svg.adventure-board')).toHaveAttribute('data-position', '0');
  const trace = observeMotion(page);
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  const result = await lastRoll(page);
  expect(result.start).toBe(0);
  checkTrace(await trace, result, false);
  await expect(page.locator('.turn-banner')).toContainText('1人め ・ 小学1年');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

for (const grades of [[1], [2, 6], [1, 6, 3, 5]]) {
  test(`${grades.length} players retain dice totals, rescue checkpoints, routes and goal through normal and UI-short motion`, async ({ page }) => {
    await start(page, grades);
    let position = 0;
    for (let turn = 1; turn <= 12; turn += 1) {
      // Six ordinary rolls and six short rolls per party size; the final rescue uses normal motion.
      if (turn === 4) await setShortMotion(page, true);
      if (turn === 10) await setShortMotion(page, false);
      const reduced = turn >= 4 && turn <= 9;
      const trace = observeMotion(page);
      await page.getByRole('button', { name: /サイコロを ふる/ }).click();
      const result = await lastRoll(page);
      checkTrace(await trace, result, reduced);
      expect(result.start).toBe(position);
      position += result.dice;
      expect(result.end).toBe(position);
      await expect(page.locator('.turn-banner')).toContainText(`${(turn - 1) % grades.length + 1}人め`);
      await answer(page, grades[(turn - 1) % grades.length]);
      await eventAndNext(page, turn);
    }
    await expect(page.locator('.goal-scene')).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12');
    await expect(page.locator('.mission')).toContainText('3 / 3 びき');
    for (let index = 0; index < grades.length; index += 1) await expect(page.locator('.goal-party > div').nth(index)).toContainText(`${12 / grades.length}もん`);
    expect(rememberedMap(page).checkpoints.at(-1)).toBe(position);
    expect(rememberedMap(page).routes['2']).toBe('river');
    expect(rememberedMap(page).routes['3']).toBe('forest');
    await expect(page.locator('.journey-position')).toHaveText(`${position} / ${position} マス`);
  });
}

test.describe('narrow touch motion', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('390 px touch rolls visibly count normal and short moves without horizontal overflow', async ({ page }) => {
    await start(page, [1, 6]);
    for (const reduced of [false, true]) {
      if (reduced) await setShortMotion(page, true);
      const trace = observeMotion(page);
      await page.getByRole('button', { name: /サイコロを ふる/ }).tap();
      const result = await lastRoll(page);
      checkTrace(await trace, result, reduced);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      if (reduced) await page.screenshot({ path: 'artifacts/motion-touch-390.png', fullPage: true });
      await answer(page, reduced ? 6 : 1);
      await eventAndNext(page, reduced ? 2 : 1);
    }
    await expect(page.locator('.turn-banner')).toContainText('1人め ・ 小学1年');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  });
});
