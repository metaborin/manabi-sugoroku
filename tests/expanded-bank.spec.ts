import { test, expect, type Page } from '@playwright/test';
import { questions } from '../src/questions';
import { createGame, reducer, type GameState } from '../src/engine';
import { configureParty, resumeSavedAdventure } from './ui-helpers';

async function shown(page: Page) {
  const prompt = (await page.locator('.question-prompt').innerText()).trim();
  const result = questions.filter(question => question.prompt === prompt);
  expect(result).toHaveLength(1);
  return result[0]!;
}

for (const width of [390, 1366]) {
  test(`long expanded passages and hints remain readable at ${width}px`, async ({ page }) => {
    const candidates = questions.filter(question => Number(question.id.slice(-2)) > 10);
    const longest = candidates.reduce((left, right) =>
      right.prompt.length + Math.max(...right.choices.map(choice => choice.length)) >
      left.prompt.length + Math.max(...left.choices.map(choice => choice.length)) ? right : left);
    let snapshot: GameState | undefined;
    for (let seed = 0; seed < 200; seed += 1) {
      let state = createGame([{ id: 0, character: 1, grade: longest.grade, review: false, units: [longest.unit] }], questions, seed);
      state = reducer(state, { type: 'roll', token: state.token });
      state = reducer(state, { type: 'moveComplete', token: state.token });
      if (state.questionId === longest.id) { snapshot = state; break; }
    }
    expect(snapshot).toBeDefined();
    await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
    await page.addInitScript(value => localStorage.setItem('manabi-sugoroku-save-v1', value), JSON.stringify(snapshot));
    await page.goto('./');
    await resumeSavedAdventure(page);
    await expect(page.locator('.question-prompt')).toHaveText(longest.prompt);
    await page.getByRole('button', { name: /ヒント/ }).click();
    await expect(page.locator('.hint-box')).toContainText(longest.hint);
    for (const locator of [page.locator('.question-prompt'), ...await page.locator('.choice').all(), page.locator('.hint-box')]) {
      await locator.scrollIntoViewIfNeeded();
      // Native nearest-edge scrolling may leave a fractional CSS pixel outside
      // the viewport; check the physical bounds with a one-pixel tolerance too.
      await expect(locator).toBeInViewport({ ratio: 0.99 });
      const box = (await locator.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `artifacts/expanded-long-passage-${width}.png`, fullPage: true });
    await page.locator('.choice').nth(longest.answer).click();
    await expect(page.getByTestId('answer-explanation')).toContainText(longest.explanation);
  });
}

for (let grade = 1; grade <= 6; grade += 1) {
  test(`grade ${grade} plays expanded math and Japanese units with hints and penalty-free exchange`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => { void dialog.accept(); });
    if (grade === 1) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('./');
    await configureParty(page, [grade]);
    const additions = questions.filter(question => question.grade === grade && Number(question.id.slice(-2)) > 10);
    const chosenUnits = ['math', 'japanese'].map(subject => additions.find(question => question.subject === subject)!.unit);
    const allUnits = [...new Set(questions.filter(question => question.grade === grade).map(question => question.unit))];
    expect(allUnits).toHaveLength(12);
    await page.locator('.unit-picker summary').click();
    await expect(page.locator('.camp-unit-options input')).toHaveCount(12);
    for (const unit of allUnits) if (!chosenUnits.includes(unit)) await page.getByLabel(unit, { exact: true }).uncheck();
    await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
    for (const [index, subject] of ['math', 'japanese'].entries()) {
      await page.getByRole('button', { name: /サイコロを ふる/ }).click();
      await expect(page.locator('.question-prompt')).toBeVisible();
      const original = await shown(page);
      expect(original.grade).toBe(grade);
      expect(original.subject).toBe(subject);
      expect(Number(original.id.slice(-2))).toBeGreaterThan(10);
      expect(chosenUnits).toContain(original.unit);
      await page.locator('.choice').nth((original.answer + 1) % 3).click();
      await expect(page.locator('.hint-box')).toContainText(original.hint);
      await page.getByRole('button', { name: /たすけて/ }).click();
      await expect(page.locator('.help-box')).toBeVisible();
      await page.getByRole('button', { name: /もんだいを かえる/ }).click();
      const replacement = await shown(page);
      expect(replacement.id).not.toBe(original.id);
      expect(replacement.unit).toBe(original.unit);
      await expect(page.locator('.hint-box, .help-box, .retry-note')).toHaveCount(0);
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(index));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.locator('.choice').nth(replacement.answer).click();
      await expect(page.getByTestId('answer-explanation')).toContainText(replacement.explanation);
      await page.getByTestId('continue-answer').click();
      await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(index + 1));
      await page.getByTestId('next-turn').click();
      await expect(page.locator('.roll-scene')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
