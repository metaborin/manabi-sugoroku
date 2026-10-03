import { test, expect, type Locator, type Page } from '@playwright/test';
import { questions } from '../src/questions';
import { selectPlayer } from './ui-helpers';

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => { void dialog.accept(); });
  await page.goto('./');
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
});

async function scene(page: Page, expected: string) {
  await expect(page.locator('.game-shell')).toHaveAttribute('data-scene', expected);
}

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'scenes fit the available width').toBe(true);
}

async function touchTarget(control: Locator) {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width, 'a main touch target is at least 44 CSS px wide').toBeGreaterThanOrEqual(44);
  expect(box!.height, 'a main touch target is at least 44 CSS px tall').toBeGreaterThanOrEqual(44);
}

/** Use ordinary wheel input; do not force DOM scroll positions or rely on click auto-scrolling. */
async function wheelIntoView(page: Page, target: Locator) {
  const viewport = page.viewportSize()!;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    if (box!.y >= 0 && box!.y + box!.height <= viewport.height) {
      await expect(target).toBeInViewport({ ratio: 1 });
      return;
    }
    const distance = box!.y < 0 ? box!.y - 16 : box!.y + box!.height - viewport.height + 16;
    const delta = Math.sign(distance) * Math.min(Math.max(Math.abs(distance), 80), viewport.height * 0.7);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.move(viewport.width - 10, viewport.height / 2);
    await page.mouse.wheel(0, delta);
    await expect.poll(() => page.evaluate(() => scrollY), { message: 'the page can naturally scroll toward its next control' }).not.toBe(before);
  }
  await expect(target, 'the next action is reachable by vertical scrolling').toBeInViewport({ ratio: 1 });
}

test('1366 px scenes keep setup separate, the map clear, and questions readable with keyboard menus', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await scene(page, 'title');
  await expect(page.locator('.title-scene')).toBeVisible();
  await expect(page.locator('.party-camp, .board-panel, .question-scene, .event-scene, .goal-scene')).toHaveCount(0);
  const begin = page.getByTestId('new-adventure');
  await expect(begin).toBeInViewport({ ratio: 1 });
  await begin.focus();
  await page.keyboard.press('Enter');
  await scene(page, 'setup');
  await expect(page.locator('.title-scene')).toHaveCount(0);
  await page.getByRole('group', { name: 'あそぶ人数', exact: true }).getByRole('button', { name: '4人', exact: true }).click();
  const grades = [1, 2, 5, 6];
  for (const [index, grade] of grades.entries()) {
    await selectPlayer(page, index);
    await expect(page.locator('.party-camp article')).toHaveCount(1);
    await expect(page.getByRole('article', { name: `${index + 1}人めの設定`, exact: true })).toBeVisible();
    await page.getByLabel(`${index + 1}人めの学年`, { exact: true }).selectOption(String(grade));
  }
  await selectPlayer(page, 0);
  await expect(page.getByLabel('1人めの学年', { exact: true })).toHaveValue('1');
  await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).focus();
  await page.keyboard.press('Enter');
  await scene(page, 'roll');
  await expect(page.locator('.party-camp')).toHaveCount(0);
  const board = page.locator('.board-panel');
  const deck = page.locator('.command-deck');
  await expect(board).toBeInViewport({ ratio: 1 });
  await expect(deck).toBeInViewport({ ratio: 1 });
  const boardBox = (await board.boundingBox())!;
  const deckBox = (await deck.boundingBox())!;
  expect(boardBox.y + boardBox.height, 'the command deck never covers the map').toBeLessThanOrEqual(deckBox.y + 1);
  await page.screenshot({ path: 'artifacts/console-desktop-map.png', fullPage: true });
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  await scene(page, 'question');
  await expect(page.locator('.board-panel, .command-deck')).toHaveCount(0);
  await expect(page.locator('.question-prompt')).toBeInViewport({ ratio: 1 });
  const choices = page.locator('.choice');
  for (let index = 0; index < await choices.count(); index += 1) await expect(choices.nth(index)).toBeInViewport({ ratio: 1 });
  const prompt = await page.locator('.question-prompt').innerText();
  await page.getByRole('button', { name: /ヒント/ }).click();
  await expect(page.locator('.question-prompt')).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('learning-support')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.hint-box p')).toBeInViewport({ ratio: 1 });
  await expect(choices.first()).toBeInViewport({ ratio: 1 });
  await expect(choices.last()).toBeInViewport({ ratio: 1 });
  await noHorizontalOverflow(page);
  await page.screenshot({ path: 'artifacts/console-desktop-hint.png', fullPage: true });
  const pause = page.getByRole('button', { name: /ひとやすみ/ });
  await pause.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: /ぼうけんを つづける/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(pause).toBeFocused();
  await expect(page.locator('.question-prompt')).toHaveText(prompt);
  await scene(page, 'question');
});

test.describe('touch scene entry points', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('390 px title, setup, play and saved-preview entrances are reachable and have usable touch targets', async ({ page }) => {
    await scene(page, 'title');
    const start = page.getByTestId('new-adventure');
    const settings = page.getByRole('button', { name: /せってい/ });
    const information = page.getByRole('button', { name: 'おうちの方へ', exact: true });
    for (const control of [start, settings, information]) {
      await touchTarget(control);
      await expect(control).toBeInViewport({ ratio: 1 });
    }
    await noHorizontalOverflow(page);
    await information.tap();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'おうちの方へ' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'とじる', exact: true }).tap();
    await settings.tap();
    await expect(page.getByRole('dialog').getByLabel('こうかおんの おおきさ')).toHaveValue('0');
    await page.getByRole('dialog').getByRole('button', { name: 'とじる', exact: true }).tap();
    await start.tap();
    await scene(page, 'setup');
    const countButtons = page.getByRole('group', { name: 'あそぶ人数', exact: true }).getByRole('button');
    for (let index = 0; index < 4; index += 1) await touchTarget(countButtons.nth(index));
    await countButtons.filter({ hasText: '2人' }).tap();
    const second = page.getByTestId('player-slot-1');
    await touchTarget(second);
    await second.tap();
    await expect(page.locator('.party-camp article')).toHaveCount(1);
    await page.getByLabel('2人めの学年', { exact: true }).selectOption('6');
    const depart = page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ });
    await touchTarget(depart);
    await noHorizontalOverflow(page);
    await depart.tap();
    await scene(page, 'roll');
    const roll = page.getByRole('button', { name: /サイコロを ふる/ });
    await touchTarget(roll);
    await roll.tap();
    await scene(page, 'question');
    await expect(page.locator('.board-panel')).toHaveCount(0);
    const prompt = await page.locator('.question-prompt').innerText();
    for (const choice of await page.locator('.choice').all()) await touchTarget(choice);
    await noHorizontalOverflow(page);
    await page.getByRole('button', { name: /ひとやすみ/ }).tap();
    const save = page.getByRole('dialog').getByRole('button', { name: 'ここまでを ほぞん', exact: true });
    await touchTarget(save);
    await save.tap();
    await expect(page.getByRole('dialog').getByTestId('save-status')).toHaveAttribute('data-state', 'saved');
    await page.reload();
    await scene(page, 'title');
    const saved = page.getByRole('button', { name: /ほぞんした つづきから/ });
    for (const control of [start, saved]) {
      await touchTarget(control);
      await expect(control).toBeInViewport({ ratio: 1 });
    }
    await page.screenshot({ path: 'artifacts/console-touch-title-saved.png', fullPage: true });
    await saved.tap();
    await scene(page, 'resume');
    await expect(page.getByTestId('save-summary')).toContainText('2人の なかま');
    await expect(page.locator('.party-camp, .board-panel, .question-scene')).toHaveCount(0);
    const resume = page.getByTestId('resume-adventure');
    await touchTarget(resume);
    await noHorizontalOverflow(page);
    await resume.tap();
    await scene(page, 'question');
    await expect(page.locator('.question-prompt')).toHaveText(prompt);
    await expect(page.locator('.turn-banner')).toContainText('1人め ・ 小学1年');
  });
});

test('680 by 384 zoom-equivalent layout reaches setup, map and answer controls through natural vertical scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 680, height: 384 });
  await scene(page, 'title');
  const begin = page.getByTestId('new-adventure');
  await wheelIntoView(page, begin);
  await begin.click();
  await scene(page, 'setup');
  await wheelIntoView(page, page.getByRole('heading', { name: 'きょうの なかまは？' }));
  const count = page.getByRole('group', { name: 'あそぶ人数', exact: true }).getByRole('button', { name: '4人', exact: true });
  await wheelIntoView(page, count);
  await count.click();
  const depart = page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ });
  await wheelIntoView(page, depart);
  expect(await page.evaluate(() => scrollY), 'the compact-height layout permits page scrolling').toBeGreaterThan(0);
  await noHorizontalOverflow(page);
  await depart.click();
  await scene(page, 'roll');
  const roll = page.getByRole('button', { name: /サイコロを ふる/ });
  await wheelIntoView(page, roll);
  await noHorizontalOverflow(page);
  await roll.click();
  await scene(page, 'question');
  const prompt = page.locator('.question-prompt');
  await wheelIntoView(page, prompt);
  const promptText = (await prompt.innerText()).trim();
  const options = await page.locator('.choice > span:nth-child(2)').allTextContents();
  const matches = questions.filter(question => question.prompt === promptText && JSON.stringify(question.choices) === JSON.stringify(options));
  expect(matches).toHaveLength(1);
  const answer = page.locator('.choice').nth(matches[0]!.answer);
  await wheelIntoView(page, answer);
  await expect(answer).toBeEnabled();
  await answer.click();
  await scene(page, 'feedback');
  await expect(page.locator('.choice')).toHaveCount(0);
  const next = page.getByTestId('continue-answer');
  await wheelIntoView(page, next);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: 'artifacts/console-zoom-equivalent-680.png', fullPage: true });
  await next.click();
  await scene(page, 'event');
  await wheelIntoView(page, page.getByTestId('next-turn'));
  await page.getByTestId('next-turn').click();
  await scene(page, 'roll');
  await expect(page.locator('.turn-banner')).toContainText('2人め');
});
