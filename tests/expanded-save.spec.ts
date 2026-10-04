import { test, expect, type Page } from '@playwright/test';
import { createGame, eligibleQuestions, getQuestion, reducer, type GameAction, type GameState } from '../src/engine';
import { legacyQuestions } from '../src/questions-legacy';
import type { Player } from '../src/types';
import { openPause, openSavedPreview, resumeSavedAdventure, saveAdventure, selectPlayer } from './ui-helpers';

type Unguarded = GameAction extends infer Action ? Action extends GameAction ? Omit<Action, 'token'> : never : never;
const act = (state: GameState, action: Unguarded): GameState => reducer(state, { ...action, token: state.token } as GameAction);
const arrive = (state: GameState) => act(act(state, { type: 'roll' }), { type: 'moveComplete' });
const names = ['こむぎ', 'みみ', 'くるみ', 'そら'];
const saveKey = 'manabi-sugoroku-save-v1';

function oldAdventure(): GameState {
  const selectedUnits = ['math', 'japanese'].map(subject => legacyQuestions.find(question => question.grade === 6 && question.subject === subject)!.unit);
  const players: Player[] = [
    { id: 0, grade: 1, character: 2, review: false, units: [] },
    { id: 1, grade: 6, character: 0, review: false, units: selectedUnits },
    { id: 2, grade: 3, character: 3, review: false, units: [] },
    { id: 3, grade: 5, character: 1, review: true, units: [] },
  ];
  let state = createGame(players, legacyQuestions, 20261004);
  for (let turn = 0; turn < 5; turn += 1) {
    state = arrive(state);
    state = act(state, { type: 'answer', choice: getQuestion(state, legacyQuestions)!.answer });
    state = act(state, { type: 'continue' });
    if (state.eventKind === 'route') while (state.rescueProgress < 3) state = act(state, { type: 'rescue', step: state.rescueProgress });
    state = act(state, { type: 'next', route: 'river' });
  }
  state = arrive(state);
  const question = getQuestion(state, legacyQuestions)!;
  state = act(state, { type: 'answer', choice: (question.answer + 1) % question.choices.length });
  return act(state, { type: 'help' });
}

async function readSnapshot(page: Page): Promise<GameState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!) as GameState, saveKey);
}

async function expectQuestion(page: Page, state: GameState) {
  const question = getQuestion(state, legacyQuestions)!;
  const player = state.players[state.turnIndex]!;
  await expect(page.locator('.game-shell')).toHaveAttribute('data-scene', 'question');
  await expect(page.locator('.question-prompt')).toHaveText(question.prompt);
  expect(await page.locator('.choice > span:nth-child(2)').allTextContents()).toEqual(question.choices);
  await expect(page.locator('.question-meta')).toContainText(`${question.grade}年`);
  await expect(page.locator('.turn-banner')).toContainText(`${state.turnIndex + 1}人め ・ 小学${player.grade}年`);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(state.turnsCompleted));
  await expect(page.locator('.journey-position')).toHaveAttribute('data-position', String(state.position));
}

for (const version of [1, 2]) {
  test(`published 120-question v${version} save survives expansion, re-save/reload and later players without learning new units`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => { void dialog.accept(); });
    expect(legacyQuestions).toHaveLength(120);
    const old = oldAdventure();
    const snapshot: Record<string, unknown> = { ...old, version };
    if (version === 1) {
      snapshot.rescues = Math.floor(old.turnsCompleted / 4);
      delete snapshot.rescueProgress;
    }
    const serialized = JSON.stringify(snapshot);
    // Seed only the initial visit. Reload must really exercise the newly written save.
    await page.addInitScript(({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    }, { key: saveKey, value: serialized });
    await page.goto('./');
    await expect(page.locator('.game-shell')).toHaveAttribute('data-scene', 'title');
    await openSavedPreview(page);
    const summary = page.getByTestId('save-summary');
    await expect(summary).toContainText('4人の なかま');
    await expect(summary).toContainText('5 / 12 まなび');
    await expect(summary).toContainText('2人め・こむぎの ばん');
    for (const [index, player] of old.players.entries()) await expect(summary.locator('.save-summary-party li').nth(index)).toContainText(`${index + 1}人め · ${player.grade}年`);
    await expect(summary.locator('.save-summary-party li').last()).toContainText('4年の ふくしゅう');
    expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(serialized);
    await resumeSavedAdventure(page);
    await expectQuestion(page, old);
    await expect(page.locator('.hint-box')).toContainText(getQuestion(old, legacyQuestions)!.hint);
    await expect(page.locator('.help-box')).toBeVisible();
    await expect(page.locator('.choice').nth(old.selectedChoice!)).toHaveClass(/tried/);
    await saveAdventure(page);
    const expectedPlayers = old.players.map(player => player.units.length ? player : {
      ...player, units: [...new Set(eligibleQuestions(player, legacyQuestions).map(question => question.unit))],
    });
    let expected: GameState = { ...old, players: expectedPlayers };
    const migrated = await readSnapshot(page);
    expect(migrated).toEqual(expected);
    expect(migrated.decks[2]).toEqual(old.decks[2]);
    expect(migrated.decks[3]).toEqual(old.decks[3]);
    expect(migrated.bankSignature).toBe(old.bankSignature);

    await page.reload();
    expect(await readSnapshot(page)).toEqual(migrated);
    await resumeSavedAdventure(page);
    await expectQuestion(page, expected);
    await expect(page.locator('.hint-box')).toContainText(getQuestion(old, legacyQuestions)!.hint);
    await expect(page.locator('.help-box')).toBeVisible();
    await expect(page.locator('.choice').nth(old.selectedChoice!)).toHaveClass(/tried/);
    // Continue both later players, including the grade-5 participant reviewing grade 4.
    for (let index = 0; index < 2; index += 1) {
      const question = getQuestion(expected, legacyQuestions)!;
      await page.locator('.choice').nth(question.answer).click();
      expected = act(expected, { type: 'answer', choice: question.answer });
      await expect(page.locator('.answer-feedback')).toContainText(question.explanation);
      await page.getByTestId('continue-answer').click();
      expected = act(expected, { type: 'continue' });
      await page.getByTestId('next-turn').click();
      expected = act(expected, { type: 'next' });
      await expect(page.locator('[data-chapter-path="2"]')).toHaveAttribute('data-route', 'river');
      await page.getByRole('button', { name: /サイコロを ふる/ }).click();
      expected = arrive(expected);
      await expectQuestion(page, expected);
    }
    await expect(page.locator('.turn-banner')).toContainText('4人め ・ 小学5年（ふくしゅう）');
    await expect(page.locator('.question-meta')).toContainText('4年');
    await saveAdventure(page);
    expect(await readSnapshot(page)).toEqual(expected);

    await openPause(page);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true }).click();
    await expect(dialog.getByRole('heading')).toHaveText('はじめから あそぶ？');
    await dialog.getByRole('button', { name: 'はじめから あそぶ', exact: true }).click();
    await expect(page.locator('.game-shell')).toHaveAttribute('data-scene', 'setup');
    await expect(page.getByRole('group', { name: 'あそぶ人数', exact: true }).getByRole('button', { name: '4人', exact: true })).toHaveAttribute('aria-pressed', 'true');
    for (const [index, player] of expectedPlayers.entries()) {
      await selectPlayer(page, index);
      const setup = page.getByRole('article', { name: `${index + 1}人めの設定`, exact: true });
      await expect(page.getByLabel(`${index + 1}人めの学年`, { exact: true })).toHaveValue(String(player.grade));
      await expect(setup.getByRole('button', { name: names[player.character], exact: true })).toHaveAttribute('aria-pressed', 'true');
      if (player.grade > 1) await expect(setup.getByLabel('ひとつ前の がくねんを ふくしゅう')).toBeChecked({ checked: player.review });
      await setup.locator('.unit-picker summary').click();
      const selected = await setup.locator('.unit-picker label').evaluateAll(labels => labels
        .filter(label => label.querySelector<HTMLInputElement>('input')!.checked)
        .map(label => label.textContent!.trim()));
      expect(selected.sort()).toEqual([...player.units].sort());
      expect(await setup.locator('.unit-picker input[type="checkbox"]').count()).toBeGreaterThan(player.units.length);
    }
    expect(await readSnapshot(page), 'choosing a new party does not replace the saved adventure').toEqual(expected);
    await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
    await saveAdventure(page);
    const replay = await readSnapshot(page);
    expect(replay.bankSignature).not.toBe(old.bankSignature);
    expect(replay.players).toEqual(expectedPlayers);
    expect(replay.turnsCompleted).toBe(0);
    expect(errors).toEqual([]);
  });
}
