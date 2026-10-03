import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { questions } from '../src/questions';
import type { Question } from '../src/types';
import { configureParty, expectSavedState, openSavedPreview, openSetup, resumeSavedAdventure, saveAdventure, selectPlayer } from './ui-helpers';

const saveKey = 'manabi-sugoroku-save-v1';
const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.goto('./');
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? [], 'polished flows have no uncaught browser errors').toEqual([]);
});

async function configure(page: Page, grades: number[]) {
  await configureParty(page, grades);
}

async function start(page: Page) {
  await openSetup(page);
  await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
  await expect(page.locator('.roll-scene')).toBeVisible();
}

async function roll(page: Page) {
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  await expect(page.locator('.question-prompt')).toBeVisible();
}

/** Match rendered text to the audited question bank, without reading React state. */
async function displayedQuestion(page: Page): Promise<Question> {
  const prompt = (await page.locator('.question-prompt').innerText()).trim();
  const choices = await page.locator('.choice > span:nth-child(2)').allTextContents();
  const matches = questions.filter(question => question.prompt === prompt && JSON.stringify(question.choices) === JSON.stringify(choices));
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

async function correct(page: Page) {
  const question = await displayedQuestion(page);
  await page.locator('.choice').nth(question.answer).click();
  await expect(page.locator('.answer-feedback')).toBeVisible();
}

async function ordinaryEventAndNext(page: Page, completed: number) {
  await page.getByTestId('continue-answer').click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(completed));
  await page.getByTestId('next-turn').click();
  await expect(page.locator('.roll-scene')).toBeVisible();
}

async function savedText(page: Page) {
  return page.evaluate(key => localStorage.getItem(key), saveKey);
}

test('saved mixed-grade review party restores its question, duplicate characters and setup choices', async ({ page }) => {
  await configure(page, [5, 6]);
  const firstSetup = page.getByRole('article', { name: '1人めの設定' });
  await firstSetup.getByLabel('ひとつ前の がくねんを ふくしゅう').check();
  await firstSetup.locator('summary').click();
  const unit = questions.find(question => question.grade === 4 && question.subject === 'math')!.unit;
  const units = [...new Set(questions.filter(question => question.grade === 4).map(question => question.unit))];
  for (const candidate of units) if (candidate !== unit) await firstSetup.getByLabel(candidate, { exact: true }).uncheck();
  for (let index = 1; index <= 2; index += 1) {
    await selectPlayer(page, index - 1);
    await page.getByRole('group', { name: `${index}人めのキャラクター`, exact: true }).getByRole('button', { name: 'こむぎ', exact: true }).click();
  }
  await start(page);
  await expect(page.locator('.turn-banner strong')).toContainText('1人め');
  await expect(page.getByTestId('turn-participation')).toContainText('1 / 6');
  await roll(page);
  const original = await displayedQuestion(page);
  expect(original.grade).toBe(4);
  expect(original.unit).toBe(unit);
  await page.getByRole('button', { name: /ヒント/ }).click();
  await saveAdventure(page);
  const snapshot = await savedText(page);
  expect(snapshot).not.toBeNull();
  await page.reload();
  await openSavedPreview(page);
  const summary = page.getByTestId('save-summary');
  await expect(summary).toContainText('2人の なかま');
  await expect(summary).toContainText('0 / 12 まなび');
  await expect(summary).toContainText('もんだいを かんがえるところ');
  await expect(summary).toContainText('1人め · 5年');
  await expect(summary).toContainText('4年の ふくしゅう');
  await expect(summary).toContainText('2人め · 6年');
  expect(await savedText(page)).toBe(snapshot);
  await resumeSavedAdventure(page);
  expect((await displayedQuestion(page)).id).toBe(original.id);
  await expect(page.locator('.hint-box')).toContainText(original.hint);
  await expectSavedState(page, 'saved');
  await correct(page);
  await expectSavedState(page, 'unsaved');
  await ordinaryEventAndNext(page, 1);
  await expect(page.locator('.turn-banner strong')).toContainText('2人め');
  await expect(page.locator('.turn-banner strong')).toContainText('こむぎ');
  await expect(page.locator('.turn-banner')).toContainText('小学6年');
  await expect(page.getByTestId('turn-participation')).toContainText('1 / 6');
  await roll(page);
  expect((await displayedQuestion(page)).grade).toBe(6);
  await page.getByRole('button', { name: /ひとやすみ/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true }).click();
  await dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true }).click();
  await expect(page.getByRole('group', { name: 'あそぶ人数', exact: true }).getByRole('button', { name: '2人', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await selectPlayer(page, 0);
  await expect(page.getByLabel('1人めの学年', { exact: true })).toHaveValue('5');
  await expect(firstSetup.getByLabel('ひとつ前の がくねんを ふくしゅう')).toBeChecked();
  await firstSetup.locator('summary').click();
  for (const candidate of units) await expect(firstSetup.getByLabel(candidate, { exact: true })).toBeChecked({ checked: candidate === unit });
  for (let index = 1; index <= 2; index += 1) {
    await selectPlayer(page, index - 1);
    await expect(page.getByRole('group', { name: `${index}人めのキャラクター`, exact: true }).getByRole('button', { name: 'こむぎ', exact: true })).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.getByLabel('2人めの学年', { exact: true })).toHaveValue('6');
  expect(await savedText(page), 'returning to setup never replaces the explicitly saved adventure').toBe(snapshot);
});

test.describe('support on a narrow touch screen', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('manual hint and wrong answer bring readable support into view and back to choices', async ({ page }) => {
    await start(page);
    await roll(page);
    const question = await displayedQuestion(page);
    const originalPosition = await page.locator('.journey-position').innerText();
    await page.getByRole('button', { name: /ヒント/ }).tap();
    const heading = page.getByTestId('learning-support');
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.hint-box p')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.hint-box')).toContainText(question.hint);
    expect(await page.locator('.hint-box').evaluate(hint => Boolean(hint.compareDocumentPosition(document.querySelector('.choices')!) & Node.DOCUMENT_POSITION_FOLLOWING)), 'support precedes choices in reading order').toBe(true);
    await page.getByTestId('choose-after-support').tap();
    await expect(page.locator('.choice').first()).toBeFocused();
    await expect(page.locator('.choice').first()).toBeInViewport({ ratio: 1 });
    await page.locator('.choice').nth((question.answer + 1) % question.choices.length).tap();
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.retry-note')).toBeVisible();
    await expect(page.locator('.hint-box p')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.journey-position')).toHaveText(originalPosition);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await page.getByRole('button', { name: /たすけて/ }).tap();
    await expect(heading).toBeFocused();
    await expect(page.locator('.help-box')).toContainText('さいごは じぶんで');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: 'artifacts/polish-support-390.png', fullPage: true });
    await page.getByTestId('choose-after-support').tap();
    await page.locator('.choice').nth(question.answer).tap();
    await expect(page.locator('.answer-feedback')).toBeVisible();
  });
});

test('exchanging an unfamiliar question clears prior support and attempts without consuming a turn', async ({ page }) => {
  await configure(page, [3, 6]);
  await start(page);
  await roll(page);
  const original = await displayedQuestion(page);
  const position = await page.locator('.journey-position').innerText();
  await page.locator('.choice').nth((original.answer + 1) % original.choices.length).click();
  await page.getByRole('button', { name: /たすけて/ }).click();
  await expect(page.locator('.hint-box')).toBeVisible();
  await expect(page.locator('.help-box')).toBeVisible();
  await page.getByRole('button', { name: /もんだいを かえる/ }).click();
  const replacement = await displayedQuestion(page);
  expect(replacement.id).not.toBe(original.id);
  expect(replacement.grade).toBe(3);
  await expect(page.locator('.retry-note, .hint-box, .help-box, .choice.tried')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /こたえと せつめいを みる/ })).toHaveCount(0);
  await expect(page.locator('.exchange-notice')).toContainText('もんだいを かえたよ');
  await expect(page.locator('.journey-position')).toHaveText(position);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.turn-banner')).toContainText('1人め ・ 小学3年');
  await correct(page);
  await ordinaryEventAndNext(page, 1);
  await expect(page.locator('.turn-banner')).toContainText('2人め ・ 小学6年');
});

for (const outcome of ['correct', 'explained'] as const) {
  test(`${outcome} feedback states the answer and offers the existing audited diagram`, async ({ page }) => {
    await start(page);
    await roll(page);
    const question = await displayedQuestion(page);
    if (outcome === 'correct') await correct(page);
    else {
      for (let attempt = 0; attempt < 2; attempt += 1) await page.locator('.choice').nth((question.answer + 1) % question.choices.length).click();
      await page.getByRole('button', { name: /こたえと せつめいを みる/ }).click();
      await expect(page.locator('.answer-feedback')).toContainText('いっしょに おぼえよう');
    }
    await expect(page.getByTestId('answer-explanation').locator('.answer-result strong')).toHaveText(question.choices[question.answer]);
    await expect(page.getByTestId('answer-explanation')).toContainText(question.explanation);
    const diagram = page.getByTestId('answer-diagram');
    await expect(diagram.locator('.hint-visual')).toBeHidden();
    await diagram.locator('summary').click();
    await expect(diagram.locator('.hint-visual')).toBeVisible();
    await expect(diagram.locator('svg[role="img"]')).toHaveAccessibleName(/.+/);
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await page.getByTestId('continue-answer').dblclick();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    await expect(page.locator('.event-scene')).toBeVisible();
    await page.getByTestId('next-turn').click();
    await roll(page);
    expect((await displayedQuestion(page)).subject).toBe('japanese');
    await correct(page);
    await expect(page.getByTestId('answer-diagram')).toHaveCount(0);
  });
}

test('save deletion requires confirmation, cancel and Escape preserve the snapshot, and live play continues', async ({ page }) => {
  await start(page);
  await roll(page);
  const original = await displayedQuestion(page);
  await expectSavedState(page, 'unsaved');
  expect(await savedText(page)).toBeNull();
  await saveAdventure(page);
  const snapshot = await savedText(page);
  expect(snapshot).not.toBeNull();
  await page.getByRole('button', { name: /ヒント/ }).click();
  await expectSavedState(page, 'unsaved');
  expect(await savedText(page)).toBe(snapshot);
  await page.getByRole('button', { name: /せってい/ }).click();
  const dialog = page.getByRole('dialog');
  const volume = dialog.getByLabel('こうかおんの おおきさ');
  const eraseEntry = dialog.getByRole('button', { name: 'ほぞんした つづきを けす', exact: true });
  await expect(volume).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(eraseEntry).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('heading', { name: 'ほぞんした つづきを けす？', exact: true })).toBeVisible();
  const cancel = dialog.getByRole('button', { name: 'けさずに もどる', exact: true });
  const confirm = dialog.getByRole('button', { name: 'ほぞんを けす', exact: true });
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(volume).toBeFocused();
  expect(await savedText(page)).toBe(snapshot);
  await eraseEntry.click();
  await page.keyboard.press('Escape');
  await expect(dialog.getByRole('heading', { name: 'あそびやすく せってい' })).toBeVisible();
  await expect(volume).toBeFocused();
  expect(await savedText(page)).toBe(snapshot);
  await eraseEntry.click();
  await confirm.click();
  expect(await savedText(page)).toBeNull();
  await expect(eraseEntry).toHaveCount(0);
  await dialog.getByRole('button', { name: 'とじる', exact: true }).click();
  await expect(page.getByRole('button', { name: /せってい/ })).toBeFocused();
  expect((await displayedQuestion(page)).id).toBe(original.id);
  await expect(page.locator('.hint-box')).toContainText(original.hint);
  await expectSavedState(page, 'unsaved');
  await correct(page);
  await ordinaryEventAndNext(page, 1);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
});

test('restart confirmation keeps keyboard focus inside its changing view and Escape returns to pause', async ({ page }) => {
  await start(page);
  await roll(page);
  const original = await displayedQuestion(page);
  await page.getByRole('button', { name: /ひとやすみ/ }).focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  const resume = dialog.getByRole('button', { name: /ぼうけんを つづける/ });
  await expect(resume).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  const safeReturn = dialog.getByRole('button', { name: 'いまの ぼうけんに もどる', exact: true });
  await expect(safeReturn).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(safeReturn).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toContainText('ぼうけんは まっているよ');
  await expect(resume).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: /ひとやすみ/ })).toBeFocused();
  expect((await displayedQuestion(page)).id).toBe(original.id);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});
