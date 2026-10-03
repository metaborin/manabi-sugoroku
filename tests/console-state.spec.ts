import { test, expect, type Page } from '@playwright/test';
import { createGame, getQuestion, reducer, restoreGame, type GameAction } from '../src/engine';
import { questions } from '../src/questions';
import type { Player } from '../src/types';
import { configureParty, openSavedPreview, resumeSavedAdventure, saveAdventure } from './ui-helpers';

interface AudioProbe {
  contexts: number;
  activations: boolean[];
  oscillators: number;
  failures: number;
  failNextOscillator: boolean;
}
type ProbedWindow = Window & { __consoleAudioProbe: AudioProbe };

async function audioProbe(page: Page) {
  return page.evaluate(() => ({ ...(window as unknown as ProbedWindow).__consoleAudioProbe }));
}

async function setVolume(page: Page, volume: '0' | '20' | '50') {
  await page.getByRole('button', { name: /せってい/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('こうかおんの おおきさ').selectOption(volume);
  await dialog.getByRole('button', { name: 'とじる', exact: true }).click();
  await expect(dialog).toHaveCount(0);
}

async function visibleQuestion(page: Page) {
  const prompt = (await page.locator('.question-prompt').innerText()).trim();
  const choices = await page.locator('.choice > span:nth-child(2)').allTextContents();
  const matches = questions.filter(question => question.prompt === prompt && JSON.stringify(question.choices) === JSON.stringify(choices));
  expect(matches, 'the visible prompt and options identify one fixed-bank question').toHaveLength(1);
  return matches[0]!;
}

async function answerCorrectly(page: Page) {
  const question = await visibleQuestion(page);
  await page.locator('.choice').nth(question.answer).click();
  await expect(page.locator('.answer-feedback')).toContainText(question.explanation);
}

async function nextOrdinaryTurn(page: Page, completed: number) {
  await page.getByTestId('continue-answer').click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(completed));
  await page.getByTestId('next-turn').click();
  await expect(page.locator('.game-shell')).toHaveAttribute('data-scene', 'roll');
}

async function rollToQuestion(page: Page) {
  await page.getByRole('button', { name: /サイコロを ふる/ }).click();
  await expect(page.locator('.question-prompt')).toBeVisible();
}

test('effects use native audio only after an unmuted user action, and mute/device failure never interrupts a turn', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const probe: AudioProbe = { contexts: 0, activations: [], oscillators: 0, failures: 0, failNextOscillator: false };
    (window as unknown as ProbedWindow).__consoleAudioProbe = probe;
    const NativeContext = window.AudioContext;
    // Preserve real browser audio, prototypes and timing; observe construction and node creation.
    window.AudioContext = new Proxy(NativeContext, {
      construct(target, args) {
        const context = Reflect.construct(target, args, target) as AudioContext;
        probe.contexts += 1;
        probe.activations.push(navigator.userActivation.isActive);
        const nativeCreate = context.createOscillator;
        Object.defineProperty(context, 'createOscillator', {
          configurable: true,
          value: function (this: AudioContext) {
            if (probe.failNextOscillator) {
              probe.failNextOscillator = false;
              probe.failures += 1;
              throw new Error('Simulated optional sound device failure');
            }
            const oscillator = Reflect.apply(nativeCreate, this, []) as OscillatorNode;
            probe.oscillators += 1;
            return oscillator;
          },
        });
        return context;
      },
    });
  });
  await page.goto('./');
  expect((await audioProbe(page)).contexts).toBe(0);
  await configureParty(page, [1, 6]);
  await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
  await rollToQuestion(page);
  await answerCorrectly(page);
  await nextOrdinaryTurn(page, 1);
  expect(await audioProbe(page)).toMatchObject({ contexts: 0, oscillators: 0 });

  await setVolume(page, '20');
  expect((await audioProbe(page)).contexts, 'changing the setting alone does not unlock audio').toBe(0);
  await rollToQuestion(page);
  expect((await visibleQuestion(page)).grade).toBe(6);
  await expect.poll(async () => (await audioProbe(page)).oscillators).toBeGreaterThan(0);
  expect(await audioProbe(page)).toMatchObject({ contexts: 1, activations: [true], failures: 0 });

  await setVolume(page, '0');
  const muted = await audioProbe(page);
  await answerCorrectly(page);
  await nextOrdinaryTurn(page, 2);
  await rollToQuestion(page);
  expect((await visibleQuestion(page)).grade).toBe(1);
  expect(await audioProbe(page)).toMatchObject({ contexts: 1, oscillators: muted.oscillators });

  await setVolume(page, '20');
  await page.evaluate(() => { (window as unknown as ProbedWindow).__consoleAudioProbe.failNextOscillator = true; });
  await answerCorrectly(page);
  await expect.poll(async () => (await audioProbe(page)).failures).toBe(1);
  await nextOrdinaryTurn(page, 3);
  await rollToQuestion(page);
  await expect(page.locator('.turn-banner')).toContainText('2人め ・ 小学6年');
  expect((await visibleQuestion(page)).grade).toBe(6);
  expect(await audioProbe(page)).toMatchObject({ contexts: 1, failures: 1 });
  expect(errors, 'optional audio failure stays inside the audio hook').toEqual([]);
});

test('a genuine version 1 save previews and resumes the same mixed-grade question, then preserves the next player', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const players: Player[] = [
    { id: 0, grade: 1, character: 2, review: false, units: [] },
    { id: 1, grade: 6, character: 0, review: false, units: [] },
    { id: 2, grade: 3, character: 3, review: false, units: [] },
    { id: 3, grade: 5, character: 1, review: true, units: [] },
  ];
  let state = createGame(players, questions, 20261004);
  type Unguarded = GameAction extends infer Action ? Action extends GameAction ? Omit<Action, 'token'> : never : never;
  const act = (action: Unguarded) => { state = reducer(state, { ...action, token: state.token } as GameAction); };
  for (let turn = 0; turn < 5; turn += 1) {
    act({ type: 'roll' }); act({ type: 'moveComplete' });
    act({ type: 'answer', choice: getQuestion(state, questions)!.answer });
    act({ type: 'continue' });
    if (state.eventKind === 'route') while (state.rescueProgress < 3) act({ type: 'rescue', step: state.rescueProgress });
    act({ type: 'next', route: 'river' });
  }
  act({ type: 'roll' }); act({ type: 'moveComplete' });
  const originalQuestion = getQuestion(state, questions)!;
  const wrongChoice = (originalQuestion.answer + 1) % originalQuestion.choices.length;
  act({ type: 'answer', choice: wrongChoice });
  const legacy: Record<string, unknown> = { ...state, version: 1, rescues: Math.floor(state.turnsCompleted / 4) };
  delete legacy.rescueProgress;
  expect(restoreGame(legacy, questions), 'the fixture follows the original v1 migration contract').toEqual(state);
  const stored = JSON.stringify(legacy);
  await page.addInitScript(value => { localStorage.setItem('manabi-sugoroku-save-v1', value); }, stored);
  await page.goto('./');
  await expect(page.locator('.game-shell')).toHaveAttribute('data-scene', 'title');
  await expect(page.locator('.question-prompt')).toHaveCount(0);
  await openSavedPreview(page);
  const summary = page.getByTestId('save-summary');
  await expect(summary).toContainText('4人の なかま');
  await expect(summary).toContainText('5 / 12 まなび');
  await expect(summary).toContainText('1 / 3びき たすけた');
  await expect(summary).toContainText('2人め・こむぎの ばん');
  await expect(summary).toContainText('もんだいを かんがえるところ');
  for (const [index, player] of players.entries()) await expect(summary.locator('.save-summary-party li').nth(index)).toContainText(`${index + 1}人め · ${player.grade}年`);
  await expect(summary.locator('.save-summary-party li').last()).toContainText('4年の ふくしゅう');
  expect(await page.evaluate(() => localStorage.getItem('manabi-sugoroku-save-v1'))).toBe(stored);

  await resumeSavedAdventure(page);
  await expect(page.locator('.turn-banner')).toContainText('2人め ・ 小学6年');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  await expect(page.locator('.journey-position')).toHaveAttribute('data-position', String(state.position));
  await expect(page.locator('.mission')).toContainText('1 / 3 びき');
  expect((await visibleQuestion(page)).id).toBe(originalQuestion.id);
  await expect(page.locator('.choice').nth(wrongChoice)).toHaveClass(/tried/);
  await expect(page.locator('.hint-box')).toContainText(originalQuestion.hint);
  await answerCorrectly(page);
  await nextOrdinaryTurn(page, 6);
  await expect(page.locator('.turn-banner')).toContainText('3人め ・ 小学3年');
  await expect(page.locator('[data-chapter-path="2"]')).toHaveAttribute('data-route', 'river');
  await rollToQuestion(page);
  expect((await visibleQuestion(page)).grade).toBe(3);
  await saveAdventure(page);
  const resaved = await page.evaluate(() => JSON.parse(localStorage.getItem('manabi-sugoroku-save-v1')!) as Record<string, unknown>);
  expect(resaved).toMatchObject({ version: 2, turnsCompleted: 6, turnIndex: 2, rescues: 1, routes: ['river'], players });
  expect(errors).toEqual([]);
});

test('erasing the save from its preview returns to a playable title instead of an empty scene', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const saved = createGame([{ id: 0, grade: 2, character: 1, review: false, units: [] }], questions, 20261005);
  await page.addInitScript(value => { localStorage.setItem('manabi-sugoroku-save-v1', value); }, JSON.stringify(saved));
  await page.goto('./');
  await openSavedPreview(page);
  await expect(page.getByTestId('save-summary')).toContainText('1人め · 2年');
  await page.getByRole('button', { name: /せってい/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'ほぞんした つづきを けす', exact: true }).click();
  await expect(dialog.getByRole('heading')).toHaveText('ほぞんした つづきを けす？');
  await dialog.getByRole('button', { name: 'ほぞんを けす', exact: true }).click();
  await expect(dialog.getByRole('heading')).toHaveText('あそびやすく せってい');
  expect(await page.evaluate(() => localStorage.getItem('manabi-sugoroku-save-v1'))).toBeNull();
  await dialog.getByRole('button', { name: 'とじる', exact: true }).click();
  await expect(page.locator('.game-shell')).toHaveAttribute('data-scene', 'title');
  await expect(page.getByTestId('new-adventure')).toBeVisible();
  await expect(page.getByRole('button', { name: /ほぞんした つづきから/ })).toHaveCount(0);
  await configureParty(page, [1, 6]);
  await page.getByRole('button', { name: /ぼうけんに しゅっぱつ/ }).click();
  await rollToQuestion(page);
  expect((await visibleQuestion(page)).grade).toBe(1);
  await expect(page.locator('.turn-banner')).toContainText('1人め ・ 小学1年');
  expect(errors).toEqual([]);
});
