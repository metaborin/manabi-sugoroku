import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { questions } from '../src/questions';
import type { Question } from '../src/types';

const browserErrors = new WeakMap<Page, string[]>();

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
  await page.getByRole('group', { name: 'あそぶ人数', exact: true }).getByRole('button', { name: `${grades.length}人`, exact: true }).click();
  for (const [index, grade] of grades.entries()) await page.getByLabel(`${index + 1}人めの学年`, { exact: true }).selectOption(String(grade));
}

async function start(page: Page, grades: number[]) {
  await configure(page, grades);
  await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
  await expect(page.getByRole('heading', { name: 'サイコロを ふろう' })).toBeVisible();
}

async function roll(page: Page) {
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

async function eventAndNext(page: Page, completed: number) {
  await page.getByRole('button', { name: /おはなしへ すすむ/ }).click();
  await expect(page.locator('.event-scene')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(completed));
  if (completed === 4 || completed === 8) {
    await page.getByRole('button', { name: completed === 4 ? /かわの みち/ : /もりの みち/ }).click();
  } else if (completed === 12) {
    await page.getByRole('button', { name: 'みんなで ゴール！', exact: true }).click();
  } else {
    await page.getByRole('button', { name: /つぎの (ぼうけん|なかま)へ/ }).click();
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
        const position = await page.locator('.board-bottom span').last().innerText();
        await page.locator('.choice').nth((question.answer + 1) % question.choices.length).click();
        await expect(page.locator('.retry-note')).toBeVisible();
        await expect(page.locator('.board-bottom span').last()).toHaveText(position);
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
      await eventAndNext(page, turn + 1);
    }
    await expect(page.locator('.goal-scene')).toBeVisible();
    await expect(page.locator('.goal-party > div')).toHaveCount(grades.length);
    for (let index = 0; index < grades.length; index += 1) await expect(page.locator('.goal-party > div').nth(index)).toContainText(`${12 / grades.length}もん`);
    await expect(page.locator('.mission')).toContainText('3 / 3 びき');
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '12');
    const boardPosition = await page.locator('.board-bottom span').last().innerText();
    const [position, distance] = boardPosition.match(/\d+/g)!.map(Number);
    expect(position).toBe(distance);
    await noOverflow(page);
    if (grades.length === 4) await page.screenshot({ path: 'artifacts/desktop-goal.png', fullPage: true });
    await page.getByRole('button', { name: /おなじ なかまで もういちど/ }).click();
    await expect(page.getByRole('heading', { name: 'サイコロを ふろう' })).toBeVisible();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await expect(page.locator('.turn-banner')).toContainText('1人め');
    await expect(page.locator('.team-member')).toHaveCount(grades.length);
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
  await page.getByRole('button', { name: /おはなしへ すすむ/ }).dblclick();
  await expect(page.locator('.event-scene')).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await page.getByRole('button', { name: /つぎの なかまへ/ }).dblclick();
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
  await page.getByRole('button', { name: 'ここまでを ほぞん', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('manabi-sugoroku-save-v1'))).not.toBeNull();
  await page.reload();
  await page.getByRole('button', { name: /ほぞんした つづきから/ }).click();
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
    await page.getByRole('button', { name: /もんだいを かえる/ }).click();
    question = await displayedQuestion(page);
    expect(question.grade).toBe(4);
    expect(question.unit).toBe(gradeFourMathUnit);
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

test('Chromebook-size desktop screenshots and assets load without failed requests', async ({ page }) => {
  const failed: string[] = [];
  const external: string[] = [];
  const ownOrigin = new URL(page.url()).origin;
  page.on('requestfailed', request => failed.push(request.url()));
  page.on('response', response => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (new URL(request.url()).origin !== ownOrigin) external.push(request.url()); });
  await page.reload();
  await noOverflow(page);
  await page.screenshot({ path: 'artifacts/desktop-welcome.png', fullPage: true });
  await start(page, [1, 6, 3, 5]);
  await roll(page);
  await page.screenshot({ path: 'artifacts/desktop-adventure.png', fullPage: true });
  await noOverflow(page);
  await correct(page);
  expect(failed).toEqual([]);
  expect(external).toEqual([]);
});

test.describe('touch and narrow layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('390 px touch setup, question, assistance and modal fit without horizontal overflow', async ({ page }) => {
    await noOverflow(page);
    await page.getByRole('group', { name: 'あそぶ人数', exact: true }).getByRole('button', { name: '4人', exact: true }).tap();
    await noOverflow(page);
    await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).tap();
    await page.getByRole('button', { name: /サイコロを ふる/ }).tap();
    await expect(page.locator('.question-prompt')).toBeVisible();
    await noOverflow(page);
    await page.getByRole('button', { name: /ヒント/ }).tap();
    await page.getByRole('button', { name: /たすけて/ }).tap();
    await noOverflow(page);
    await page.screenshot({ path: 'artifacts/touch-question-390.png', fullPage: true });
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
  });
});
