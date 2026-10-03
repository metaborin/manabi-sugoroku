import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { questions } from '../src/questions';
import type { Question } from '../src/types';
import { configureParty, openPause, openSetup, rememberMap, rememberedMap, resumePause, resumeSavedAdventure, saveAdventure } from './ui-helpers';

const browserErrors = new WeakMap<Page, string[]>();
const lastRescueAction = new WeakMap<Page, number>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.goto('./');
});

test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page) ?? [], 'no uncaught browser exceptions').toEqual([]);
});

async function configure(page: Page, grades: number[]) {
  await configureParty(page, grades);
}

async function start(page: Page, grades: number[]) {
  await configure(page, grades);
  await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
  await expect(page.getByRole('heading', { name: 'サイコロを ふろう' })).toBeVisible();
  await rememberMap(page);
}

async function roll(page: Page) {
  await rememberMap(page);
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  await expect(page.locator('.question-prompt')).toBeVisible();
}

/** Match the displayed content to the fixed bank; never inspect internal React state. */
async function displayedQuestion(page: Page): Promise<Question> {
  const prompt = (await page.locator('.question-prompt').innerText()).trim();
  const choices = await page.locator('.choice > span:nth-child(2)').allTextContents();
  const matches = questions.filter(question => question.prompt === prompt && JSON.stringify(question.choices) === JSON.stringify(choices));
  expect(matches, `exactly one fixed-bank match for ${prompt}`).toHaveLength(1);
  return matches[0]!;
}

async function correct(page: Page) {
  const question = await displayedQuestion(page);
  await page.locator('.choice').nth(question.answer).click();
  await expect(page.locator('.answer-feedback')).toBeVisible();
  await expect(page.locator('.answer-feedback')).toContainText(question.explanation);
}

async function openEvent(page: Page, completed: number) {
  await page.getByTestId('continue-answer').click();
  await expect(page.locator('.event-scene')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(completed));
}

async function rescueStep(page: Page, progress: number, keyboard = false, touch = false) {
  // A deliberate new action follows the visible scene update and the 280 ms input guard.
  const previousAction = lastRescueAction.get(page);
  if (previousAction) await expect.poll(() => Date.now() - previousAction, { intervals: [50] }).toBeGreaterThanOrEqual(300);
  const button = page.getByTestId('rescue-action');
  await expect(page.getByTestId('rescue-event')).toHaveAttribute('data-progress', String(progress));
  await expect(button, 'the active rescue action fits in the viewport without manual scrolling').toBeInViewport({ ratio: 1 });
  if (keyboard) {
    await button.focus();
    await page.keyboard.press('Enter');
  } else if (touch) await button.tap();
  else await button.click();
  lastRescueAction.set(page, Date.now());
  await expect(page.getByTestId('rescue-event')).toHaveAttribute('data-progress', String(progress + 1));
}

async function completeRescue(page: Page, completed: number, capture = false) {
  await expect(page.getByTestId('rescue-event')).toHaveAttribute('data-progress', '0');
  await expect(page.locator('.mission')).toContainText(`${completed / 4 - 1} / 3 びき`);
  await expect(page.locator('button[data-route], [data-testid="next-turn"]')).toHaveCount(0);
  const position = Number(await page.locator('.journey-position').getAttribute('data-position'));
  const checkpoints = rememberedMap(page).checkpoints;
  expect(checkpoints).toHaveLength(3);
  expect(position, 'the rescue is exactly at its cumulative four-roll checkpoint').toBe(checkpoints[completed / 4 - 1]);
  for (let progress = 0; progress < 3; progress += 1) {
    await rescueStep(page, progress);
    await expect(page.locator('.mission')).toContainText(`${completed / 4 - (progress < 2 ? 1 : 0)} / 3 びき`);
    if (capture && progress === 0) await page.screenshot({ path: 'artifacts/v2-rescue-progress.png', fullPage: true });
  }
  await expect(page.getByTestId('rescue-action')).toHaveCount(0);
  await expect(page.locator('.rescue-thanks')).toBeVisible();
  await expect(page.locator('button[data-route], [data-testid="next-turn"]').first(), 'the next action fits after rescue completion').toBeInViewport({ ratio: 1 });
}

async function eventAndNext(page: Page, completed: number, route: 'forest' | 'river' = completed === 4 ? 'river' : 'forest', capture = false) {
  await openEvent(page, completed);
  if (completed % 4 === 0) await completeRescue(page, completed, capture);
  if (completed === 4 || completed === 8) {
    const chapter = completed / 4 + 1;
    const previousGeometry = rememberedMap(page).paths[String(chapter)];
    await page.locator(`button[data-route="${route}"]`).click();
    await expect(page.locator(`[data-chapter-path="${chapter}"]`)).toHaveAttribute('data-route', route);
    await expect(page.locator(`[data-landscape="chapter-${chapter}-${route}"]`)).toHaveCount(1);
    await expect(page.locator(`[data-landscape="chapter-${chapter}-${route === 'river' ? 'forest' : 'river'}"]`)).toHaveCount(0);
    if (route === 'river') expect(await page.locator(`[data-chapter-path="${chapter}"] path`).first().getAttribute('d')).not.toBe(previousGeometry);
    await rememberMap(page);
  } else {
    await page.getByTestId('next-turn').click();
  }
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'the page has no horizontal overflow').toBe(true);
}

for (const grades of [[1], [2, 6], [1, 6, 3, 5]]) {
  test(`${grades.length} players with grades ${grades.join('/')}: complete adventure, support, rescue routes and replay`, async ({ page }) => {
    await start(page, grades);
    for (let turn = 0; turn < 12; turn += 1) {
      const index = turn % grades.length;
      await expect(page.locator('.turn-banner')).toContainText(`${index + 1}人め ・ 小学${grades[index]}年`);
      await roll(page);
      let question = await displayedQuestion(page);
      expect(question.grade).toBe(grades[index]);
      expect(question.subject).toBe(Math.floor(turn / grades.length) % 2 === 0 ? 'math' : 'japanese');
      if (turn === 0) {
        await page.getByRole('button', { name: /ヒント/, exact: false }).click();
        await expect(page.locator('.hint-box')).toContainText(question.hint);
        await page.getByRole('button', { name: /たすけて/ }).click();
        await expect(page.locator('.help-box')).toContainText('さいごは じぶんで');
        const position = await page.locator('.journey-position').innerText();
        await page.locator('.choice').nth((question.answer + 1) % question.choices.length).click();
        await expect(page.locator('.retry-note')).toBeVisible();
        await expect(page.locator('.journey-position')).toHaveText(position);
        await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
        await page.getByRole('button', { name: /もんだいを かえる/ }).click();
        const replacement = await displayedQuestion(page);
        expect(replacement.id).not.toBe(question.id);
        expect(replacement.grade).toBe(grades[index]);
        question = replacement;
        await expect(page.locator('.retry-note')).toHaveCount(0);
      }
      if (turn === 1) {
        for (let attempt = 0; attempt < 2; attempt += 1) await page.locator('.choice').nth((question.answer + 1) % question.choices.length).click();
        await page.getByRole('button', { name: /こたえと せつめいを みる/ }).click();
        await expect(page.locator('.answer-feedback')).toContainText('いっしょに おぼえよう');
        await expect(page.locator('.answer-feedback')).toContainText(question.explanation);
      } else {
        await correct(page);
      }
      const route = grades.length === 1 ? 'forest' : grades.length === 2 || turn < 7 ? 'river' : 'forest';
      if (turn === 7) {
        await openEvent(page, 8);
        await expect(page.locator('.rescue-story')).toContainText(grades.length === 1 ? 'はっぱに' : 'かわに');
        await expect(page.getByTestId('rescue-action')).toContainText(grades.length === 1 ? 'はっぱを' : 'ひもを');
        await completeRescue(page, 8, grades.length === 4);
        await page.locator(`button[data-route="${route}"]`).click();
        await expect(page.locator('[data-chapter-path="3"]')).toHaveAttribute('data-route', route);
      } else await eventAndNext(page, turn + 1, route);
      if (grades.length === 4 && turn === 3) await page.screenshot({ path: 'artifacts/v2-desktop-branch.png', fullPage: true });
    }
    await expect(page.locator('.goal-scene')).toBeVisible();
    await expect(page.locator('.goal-party > div')).toHaveCount(grades.length);
    for (let index = 0; index < grades.length; index += 1) await expect(page.locator('.goal-party > div').nth(index)).toContainText(`${12 / grades.length}もん`);
    await expect(page.locator('.mission')).toContainText('3 / 3 びき');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12');
    const boardPosition = await page.locator('.journey-position').innerText();
    const [position, distance] = boardPosition.match(/\d+/g)!.map(Number);
    expect(position).toBe(distance);
    await noOverflow(page);
    if (grades.length === 4) await page.screenshot({ path: 'artifacts/v2-desktop-goal.png', fullPage: true });
    await page.getByRole('button', { name: /おなじ なかまで もういちど/ }).click();
    await expect(page.getByRole('heading', { name: 'サイコロを ふろう' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await expect(page.locator('.turn-banner')).toContainText('1人め');
    await openPause(page);
    await page.getByRole('dialog').locator('.party-record summary').click();
    await expect(page.locator('.team-member')).toHaveCount(grades.length);
    for (const [index, grade] of grades.entries()) {
      await expect(page.locator('.team-member').nth(index)).toContainText(`${grade}年`);
      await expect(page.locator('.team-member').nth(index)).toContainText('0もん おわり');
    }
    await resumePause(page);
  });
}

test('real double clicks cannot complete extra turns or lose the next player', async ({ page }) => {
  await start(page, [1, 6]);
  await page.getByRole('button', { name: /サイコロを ふる/ }).dblclick();
  await expect(page.locator('.question-prompt')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  const question = await displayedQuestion(page);
  await page.locator('.choice').nth(question.answer).dblclick();
  await expect(page.locator('.answer-feedback')).toBeVisible();
  await page.getByTestId('continue-answer').dblclick();
  await expect(page.locator('.event-scene')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await page.getByTestId('next-turn').dblclick();
  await expect(page.locator('.turn-banner')).toContainText('2人め ・ 小学6年');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await expect(page.locator('.roll-scene')).toBeVisible();
});

test('browser Back pauses, cancelling restart keeps the question, explicit save survives reload', async ({ page }) => {
  await start(page, [3, 6]);
  await roll(page);
  const original = await displayedQuestion(page);
  await page.getByRole('button', { name: /ヒント/ }).click();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.goBack();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('ぼうけんは まっているよ');
  await dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true }).click();
  await expect(dialog).toContainText('はじめから あそぶ？');
  await dialog.getByRole('button', { name: 'いまの ぼうけんに もどる', exact: true }).click();
  await dialog.getByRole('button', { name: /ぼうけんを つづける/ }).click();
  expect((await displayedQuestion(page)).id).toBe(original.id);
  await expect(page.locator('.hint-box')).toBeVisible();
  await saveAdventure(page);
  expect(await page.evaluate(() => localStorage.getItem('manabi-sugoroku-save-v1'))).not.toBeNull();
  await page.reload();
  await resumeSavedAdventure(page);
  expect((await displayedQuestion(page)).id).toBe(original.id);
  await expect(page.locator('.hint-box')).toBeVisible();
  await expect(page.locator('.turn-banner')).toContainText('1人め ・ 小学3年');
  await correct(page);
  await eventAndNext(page, 1);
  await expect(page.locator('.turn-banner')).toContainText('2人め ・ 小学6年');
});

test('previous-grade review and chosen units constrain the visible question and its replacement', async ({ page }) => {
  await configure(page, [5]);
  const setup = page.getByRole('article', { name: '1人めの設定' });
  await setup.getByLabel('ひとつ前の がくねんを ふくしゅう').check();
  await setup.locator('summary').click();
  const gradeFourMathUnit = questions.find(question => question.grade === 4 && question.subject === 'math')!.unit;
  const units = [...new Set(questions.filter(question => question.grade === 4).map(question => question.unit))];
  for (const unit of units) if (unit !== gradeFourMathUnit) await setup.getByLabel(unit, { exact: true }).uncheck();
  await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
  for (let turn = 0; turn < 2; turn += 1) {
    await roll(page);
    let question = await displayedQuestion(page);
    expect(question.grade).toBe(4);
    expect(question.unit).toBe(gradeFourMathUnit);
    const pool = questions.filter(candidate => candidate.grade === 4 && candidate.unit === gradeFourMathUnit);
    expect(pool).toHaveLength(5);
    const seen = new Set([question.id]);
    for (let exchange = 0; exchange < (turn === 0 ? 6 : 1); exchange += 1) {
      const previousId = question.id;
      await page.getByRole('button', { name: /もんだいを かえる/ }).click();
      question = await displayedQuestion(page);
      expect(question.id).not.toBe(previousId);
      expect(question.grade).toBe(4);
      expect(question.unit).toBe(gradeFourMathUnit);
      if (turn === 0 && exchange < 4) expect(seen.has(question.id)).toBe(false);
      seen.add(question.id);
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(turn));
    }
    if (turn === 0) expect(seen.size).toBe(5);
    await correct(page);
    await eventAndNext(page, turn + 1);
  }
});

test('speech off and unavailable speech both leave the text game playable', async ({ page }) => {
  await page.addInitScript(() => {
    // Model a browser without this optional API; this is an environment capability, not app state.
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
  });
  await page.reload();
  await start(page, [1]);
  await roll(page);
  await expect(page.getByRole('button', { name: /もんだいを きく/ })).toHaveCount(0);
  await page.getByRole('button', { name: /せってい/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('こうかおんの おおきさ')).toHaveValue('0');
  await dialog.getByLabel('もんだいの よみあげボタンを つかう').check();
  await dialog.getByRole('button', { name: 'とじる', exact: true }).click();
  await page.getByRole('button', { name: /もんだいを きく/ }).click();
  await expect(page.getByRole('status')).toContainText('もじで つづけよう');
  await correct(page);
  await eventAndNext(page, 1);
  await roll(page);
  const question = await displayedQuestion(page);
  if (!question.speechSafe) {
    await page.getByRole('button', { name: /もんだいを きく/ }).click();
    await expect(page.getByRole('status')).toContainText('こたえが わからないように');
  }
  await correct(page);
});

test('a failing local speech service reports text fallback and does not block answers', async ({ page }) => {
  await page.addInitScript(() => {
    // Simulate browser capability and a local voice service that throws on speech.
    Object.defineProperty(SpeechSynthesisUtterance.prototype, 'voice', { configurable: true, set() {} });
    Object.defineProperty(speechSynthesis, 'getVoices', { configurable: true, value: () => [{
      voiceURI: 'test-local', name: '検証用ローカル音声', lang: 'ja-JP', localService: true, default: true,
    }] });
    Object.defineProperty(speechSynthesis, 'speak', { configurable: true, value: () => { throw new Error('Simulated local voice service failure'); } });
  });
  await page.reload();
  await start(page, [1]);
  await roll(page);
  expect((await displayedQuestion(page)).speechSafe).toBe(true);
  await page.getByRole('button', { name: /せってい/ }).click();
  await page.getByRole('dialog').getByLabel('もんだいの よみあげボタンを つかう').check();
  await page.getByRole('dialog').getByRole('button', { name: 'とじる', exact: true }).click();
  await page.getByRole('button', { name: /もんだいを きく/ }).click();
  await expect(page.getByRole('status')).toContainText('よみあげが できなかったよ。もじで つづけよう');
  await correct(page);
  await eventAndNext(page, 1);
  await expect(page.getByRole('heading', { name: 'サイコロを ふろう' })).toBeVisible();
});

test('rescue double click does one step, keyboard works, and a middle-step save restores exactly', async ({ page }) => {
  await start(page, [1, 6]);
  for (let turn = 1; turn <= 4; turn += 1) {
    await roll(page);
    await correct(page);
    if (turn < 4) await eventAndNext(page, turn);
    else await openEvent(page, turn);
  }
  await page.getByTestId('rescue-action').dblclick();
  lastRescueAction.set(page, Date.now());
  await expect(page.getByTestId('rescue-event')).toHaveAttribute('data-progress', '1');
  await expect(page.locator('.mission')).toContainText('0 / 3 びき');
  await expect(page.locator('button[data-route]')).toHaveCount(0);
  const savedPosition = await page.locator('.journey-position').innerText();
  await page.getByRole('button', { name: /ひとやすみ/ }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  const resume = dialog.getByRole('button', { name: /ぼうけんを つづける/ });
  await expect(resume).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(resume).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'ここまでを ほぞん', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('status')).toContainText('ほぞんしたよ');
  await page.reload();
  await resumeSavedAdventure(page);
  await expect(page.getByTestId('rescue-event')).toHaveAttribute('data-progress', '1');
  await expect(page.locator('.mission')).toContainText('0 / 3 びき');
  await expect(page.locator('.journey-position')).toHaveText(savedPosition);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
  await rescueStep(page, 1, true);
  await expect(page.getByTestId('rescue-action')).toBeFocused();
  await rescueStep(page, 2, true);
  await expect(page.locator('.mission')).toContainText('1 / 3 びき');
  const routeButton = page.locator('button[data-route="river"]');
  await routeButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.turn-banner')).toContainText('1人め ・ 小学1年');
  await expect(page.locator('[data-chapter-path="2"]')).toHaveAttribute('data-route', 'river');
});

test('full movement visits every rolled square and chapter one ends at its real checkpoint', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await start(page, [1]);
  let position = 0;
  for (let turn = 1; turn <= 4; turn += 1) {
    const samples = page.evaluate(() => new Promise<number[]>(resolve => {
      const positions: number[] = [];
      const observer = new MutationObserver(() => {
        const raw = document.querySelector('.journey-position')?.textContent ?? '';
        const value = Number(raw.match(/\d+/)?.[0]);
        if (Number.isFinite(value) && positions.at(-1) !== value) positions.push(value);
        if (document.querySelector('.question-prompt')) { observer.disconnect(); resolve(positions); }
      });
      observer.observe(document.querySelector('main')!, { childList: true, characterData: true, subtree: true });
    }));
    await page.getByRole('button', { name: /サイコロを ふる/ }).click();
    await expect(page.locator('.dice')).toHaveAttribute('data-settled', 'true');
    const dice = Number(await page.locator('.dice').getAttribute('data-face'));
    await expect(page.locator('.question-prompt')).toBeVisible();
    const visited = await samples;
    expect(visited).toEqual(Array.from({ length: dice + 1 }, (_, index) => position + index));
    position += dice;
    await expect(page.locator('.journey-position')).toHaveText(new RegExp(`^${position} /`));
    await correct(page);
    if (turn < 4) await eventAndNext(page, turn);
    else await openEvent(page, turn);
  }
  expect(rememberedMap(page).checkpoints[0]).toBe(position);
  await completeRescue(page, 4);
});

test('Chromebook-size desktop screenshots and assets load without failed requests', async ({ page }) => {
  const failed: string[] = [];
  const external: string[] = [];
  const ownOrigin = new URL(page.url()).origin;
  page.on('requestfailed', request => failed.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (new URL(request.url()).origin !== ownOrigin) external.push(request.url()); });
  await page.reload();
  await noOverflow(page);
  await page.screenshot({ path: 'artifacts/v2-desktop-welcome.png', fullPage: true });
  await start(page, [1, 6, 3, 5]);
  await roll(page);
  await page.screenshot({ path: 'artifacts/v2-desktop-map.png', fullPage: true });
  await noOverflow(page);
  await correct(page);
  expect(failed).toEqual([]);
  expect(external).toEqual([]);
});

test.describe('touch and narrow layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('390 px touch setup, question, assistance and modal fit without horizontal overflow', async ({ page }) => {
    await noOverflow(page);
    await page.getByTestId('new-adventure').tap();
    await openSetup(page);
    await page.getByRole('group', { name: 'あそぶ人数', exact: true }).getByRole('button', { name: '4人', exact: true }).tap();
    await noOverflow(page);
    await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).tap();
    await rememberMap(page);
    await page.getByRole('button', { name: /サイコロを ふる/ }).tap();
    await expect(page.locator('.question-prompt')).toBeVisible();
    await noOverflow(page);
    await page.getByRole('button', { name: /ヒント/ }).tap();
    await page.getByRole('button', { name: /たすけて/ }).tap();
    await noOverflow(page);
    await page.screenshot({ path: 'artifacts/v2-touch-question-390.png', fullPage: true });
    await page.getByRole('button', { name: /ひとやすみ/ }).tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await noOverflow(page);
    const bounds = await page.getByRole('dialog').boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
    await page.getByRole('dialog').getByRole('button', { name: /ぼうけんを つづける/ }).tap();
    const question = await displayedQuestion(page);
    await page.locator('.choice').nth(question.answer).tap();
    await expect(page.locator('.answer-feedback')).toBeVisible();
    for (let completed = 1; completed < 4; completed += 1) {
      await eventAndNext(page, completed);
      await page.getByRole('button', { name: /サイコロを ふる/ }).tap();
      await expect(page.locator('.question-prompt')).toBeVisible();
      const nextQuestion = await displayedQuestion(page);
      await page.locator('.choice').nth(nextQuestion.answer).tap();
    }
    await openEvent(page, 4);
    await noOverflow(page);
    await rescueStep(page, 0, false, true);
    await page.screenshot({ path: 'artifacts/v2-touch-rescue-390.png', fullPage: true });
    await rescueStep(page, 1, false, true);
    await rescueStep(page, 2, false, true);
    await noOverflow(page);
    await page.locator('button[data-route="river"]').tap();
    await expect(page.locator('[data-chapter-path="2"]')).toHaveAttribute('data-route', 'river');
    await noOverflow(page);
  });
});
