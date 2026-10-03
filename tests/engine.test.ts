import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, eligibleQuestions, getQuestion, reducer, restoreGame } from '../src/engine.ts';
import type { GameAction, GameState } from '../src/engine.ts';
import type { Grade, Player, Question, Subject } from '../src/types.ts';

const questions: Question[] = [];
for (let grade = 1; grade <= 6; grade += 1) {
  for (const subject of ['math', 'japanese'] as Subject[]) {
    for (let index = 0; index < 6; index += 1) {
      questions.push({
        id: `${grade}-${subject}-${index}`, grade: grade as Grade, subject,
        unit: index < 3 ? `${subject}-basic` : `${subject}-advanced`, prerequisite: 'fixture',
        prompt: `fixture ${grade} ${subject} ${index}`, choices: ['a', 'b', 'c'], answer: index % 3,
        hint: 'fixture hint', explanation: 'fixture explanation', speech: 'fixture speech', speechSafe: true, audit: 'fixture',
      });
    }
  }
}

const player = (id = 0, grade: Grade = 1, options: Partial<Player> = {}): Player => ({
  id, grade, character: id % 4, review: false, units: [], ...options,
});
type UnguardedAction = GameAction extends infer Action ? Action extends GameAction ? Omit<Action, 'token'> : never : never;
const act = (state: GameState, action: UnguardedAction): GameState => reducer(state, { ...action, token: state.token } as GameAction);
const arrive = (state: GameState): GameState => act(act(state, { type: 'roll' }), { type: 'moveComplete' });
const finishQuestion = (state: GameState): GameState => act(act(state, {
  type: 'answer', choice: getQuestion(state, questions)!.answer,
}), { type: 'continue' });
const nextTurn = (state: GameState): GameState => act(state, { type: 'next', route: 'forest' });
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

for (const count of [1, 2, 3, 4]) {
  test(`${count} mixed-grade player(s): every participant answers, rescues happen, and dice reach the goal`, () => {
    const players = Array.from({ length: count }, (_, index) => player(index, [1, 6, 3, 5][index] as Grade));
    let state = createGame(players, questions, 2026);
    const answered: string[][] = players.map(() => []);
    let steps = 0;
    for (let turn = 0; turn < 12; turn += 1) {
      assert.equal(state.phase, 'roll');
      assert.equal(state.turnIndex, turn % count);
      state = arrive(state);
      assert.equal(state.phase, 'question');
      const question = getQuestion(state, questions)!;
      assert.equal(question.grade, players[state.turnIndex]!.grade);
      assert.equal(question.subject, answered[state.turnIndex]!.length % 2 === 0 ? 'math' : 'japanese');
      answered[state.turnIndex]!.push(question.id);
      assert.ok(state.dice! >= 1 && state.dice! <= 3);
      steps += state.dice!;
      assert.equal(state.position, steps);
      state = finishQuestion(state);
      assert.equal(state.phase, 'event');
      assert.equal(state.rescues, Math.floor((turn + 1) / 4));
      if (turn === 3 || turn === 7) {
        assert.equal(state.eventKind, 'route');
        assert.equal(act(state, { type: 'next' }), state, 'a route event waits for the choice');
      }
      state = nextTurn(state);
      assert.notEqual(state.phase, turn < 11 ? 'goal' : 'roll');
    }
    assert.equal(state.phase, 'goal');
    assert.equal(state.turnsCompleted, 12);
    assert.equal(state.position, state.goalPosition);
    assert.equal(state.rescues, 3);
    assert.deepEqual(state.routes, ['forest', 'forest']);
    for (const ids of answered) assert.equal(ids.length, 12 / count);
    assert.deepEqual(state.completedByPlayer, players.map(() => 12 / count));
    assert.equal(act(state, { type: 'next' }), state);
    assert.equal(act(state, { type: 'roll' }), state);
  });
}

test('duplicate/stale clicks cannot roll, answer, complete a move, or advance another turn twice', () => {
  let state = createGame([player(), player(1, 6)], questions, 9);
  const roll: GameAction = { type: 'roll', token: state.token };
  state = reducer(state, roll);
  assert.equal(reducer(state, roll), state);
  const move: GameAction = { type: 'moveComplete', token: state.token };
  state = reducer(state, move);
  assert.equal(reducer(state, move), state);
  const answer: GameAction = { type: 'answer', choice: getQuestion(state, questions)!.answer, token: state.token };
  state = reducer(state, answer);
  assert.equal(reducer(state, answer), state);
  const proceed: GameAction = { type: 'continue', token: state.token };
  state = reducer(state, proceed);
  assert.equal(reducer(state, proceed), state);
  const next: GameAction = { type: 'next', token: state.token };
  state = reducer(state, next);
  assert.equal(reducer(state, next), state);
  assert.equal(state.turnIndex, 1);
  state = finishQuestion(arrive(state));
  assert.equal(reducer(state, next), state, 'even another event cannot consume an old next callback');
  assert.equal(state.turnsCompleted, 2);
});

test('wrong answers preserve position and turn; hints, consultation, retries and explanation are safe', () => {
  let state = arrive(createGame([player()], questions, 21));
  const original = state;
  const question = getQuestion(state, questions)!;
  state = act(state, { type: 'help' });
  assert.equal(state.helpUsed, true);
  assert.equal(act(state, { type: 'help' }), state);
  state = act(state, { type: 'hint' });
  assert.equal(state.hintUsed, true);
  assert.equal(act(state, { type: 'reveal' }), state);
  for (const attempt of [1, 2]) {
    state = act(state, { type: 'answer', choice: (question.answer + 1) % question.choices.length });
    assert.equal(state.attempts, attempt);
    assert.equal(state.phase, 'question');
    assert.equal(state.position, original.position);
    assert.equal(state.turnIndex, original.turnIndex);
    assert.equal(state.turnsCompleted, 0);
    assert.equal(state.hintUsed, true);
  }
  state = act(state, { type: 'reveal' });
  assert.equal(state.phase, 'feedback');
  assert.equal(state.feedback, 'explained');
  assert.equal(state.turnsCompleted, 0, 'showing the answer alone cannot consume the next turn');
  state = nextTurn(act(state, { type: 'continue' }));
  assert.equal(state.phase, 'roll');
  assert.equal(state.turnsCompleted, 1);
  assert.equal(state.attempts, 0);
  assert.equal(state.helpUsed, false);
  assert.equal(state.hintUsed, false);
});

test('a correct retry after a wrong answer succeeds without an explanation penalty', () => {
  let state = arrive(createGame([player()], questions, 22));
  const question = getQuestion(state, questions)!;
  state = act(state, { type: 'answer', choice: (question.answer + 1) % question.choices.length });
  state = act(state, { type: 'answer', choice: question.answer });
  assert.equal(state.feedback, 'correct');
  assert.equal(state.phase, 'feedback');
  assert.equal(state.attempts, 1);
});

test('review selects exactly the previous grade and selected units, including single-subject play', () => {
  const settings = player(0, 5, { review: true, units: ['math-basic'] });
  const eligible = eligibleQuestions(settings, questions);
  assert.equal(eligible.length, 3);
  assert.ok(eligible.every(question => question.grade === 4 && question.subject === 'math' && question.unit === 'math-basic'));
  assert.ok(eligibleQuestions(player(0, 1, { review: true }), questions).every(question => question.grade === 1));
  let state = createGame([settings], questions, 8);
  for (let turn = 0; turn < 12; turn += 1) {
    state = arrive(state);
    const initial = state.questionId;
    state = act(state, { type: 'exchange' });
    assert.notEqual(state.questionId, initial);
    const question = getQuestion(state, questions)!;
    assert.equal(question.grade, 4);
    assert.equal(question.unit, 'math-basic');
    assert.equal(state.turnsCompleted, turn);
    assert.equal(state.attempts, 0);
    state = nextTurn(finishQuestion(state));
  }
  assert.equal(state.phase, 'goal');
});

test('no repeat in a subject until its selected pool is exhausted', () => {
  let state = createGame([player()], questions, 100);
  const seen = { math: new Set<string>(), japanese: new Set<string>() };
  for (let turn = 0; turn < 12; turn += 1) {
    state = arrive(state);
    const question = getQuestion(state, questions)!;
    assert.ok(!seen[question.subject].has(question.id));
    seen[question.subject].add(question.id);
    state = nextTurn(finishQuestion(state));
  }
  assert.equal(seen.math.size, 6);
  assert.equal(seen.japanese.size, 6);
});

test('exchange excludes the displayed question; one-question pools remain usable', () => {
  const bank = questions.slice(0, 1);
  let state = arrive(createGame([player()], bank, 12));
  assert.equal(act(state, { type: 'exchange' }), state);
  state = act(state, { type: 'answer', choice: bank[0]!.answer });
  assert.equal(state.phase, 'feedback');
  const twoSubjects = [questions[0]!, questions.find(question => question.grade === 1 && question.subject === 'japanese')!];
  state = arrive(createGame([player()], twoSubjects, 12));
  state = act(state, { type: 'exchange' });
  assert.equal(getQuestion(state, twoSubjects)!.subject, 'japanese');
});

test('invalid answers and actions in the wrong phase are ignored', () => {
  let state = createGame([player()], questions, 2);
  for (const action of [{ type: 'answer', choice: 0 }, { type: 'moveComplete' }, { type: 'next' }, { type: 'continue' }] as UnguardedAction[]) {
    assert.equal(act(state, action), state);
  }
  state = arrive(state);
  for (const choice of [-1, 3, 0.5, NaN, Infinity]) assert.equal(act(state, { type: 'answer', choice }), state);
  assert.equal(act(state, { type: 'roll' }), state);
  assert.equal(act(state, { type: 'continue' }), state);
});

test('snapshots round-trip at every phase, including interruptions and final replay', () => {
  let state = createGame([player(0, 1), player(1, 6), player(2, 3), player(3, 5)], questions, 1234);
  const check = () => {
    const restored = restoreGame(clone(state), questions);
    assert.deepEqual(restored, state, `snapshot in ${state.phase} after turn ${state.turnsCompleted}`);
    state = restored!;
  };
  check();
  for (let turn = 0; turn < 12; turn += 1) {
    state = act(state, { type: 'roll' }); check();
    state = act(state, { type: 'moveComplete' }); check();
    state = act(state, { type: 'hint' }); check();
    state = act(state, { type: 'help' }); check();
    const question = getQuestion(state, questions)!;
    state = act(state, { type: 'answer', choice: (question.answer + 1) % question.choices.length }); check();
    state = act(state, { type: 'answer', choice: question.answer }); check();
    state = act(state, { type: 'continue' }); check();
    state = nextTurn(state); check();
  }
  const replay = createGame(state.players, questions, 4321);
  assert.equal(replay.phase, 'roll');
  assert.equal(replay.position, 0);
  assert.equal(replay.turnsCompleted, 0);
  assert.deepEqual(replay.completedByPlayer, [0, 0, 0, 0]);
});

test('corrupt, incompatible and stale-bank saves are rejected without crashing', () => {
  const state = arrive(createGame([player(), player(1, 6)], questions, 44));
  const corruptions: unknown[] = [
    null, [], {}, { ...state, version: 999 }, { ...state, players: [null] },
    { ...state, phase: 'unknown' }, { ...state, position: 999 }, { ...state, turnIndex: 1 },
    { ...state, questionId: 'does-not-exist' }, { ...state, attempts: -1 },
    { ...state, usedQuestionIds: [['unknown'], []] }, { ...state, routes: ['forest'] },
    { ...state, dice: 0 }, { ...state, completedByPlayer: [10, 0] },
    { ...state, rolls: [] }, { ...state, feedback: 'correct' },
    { ...state, selectedChoice: getQuestion(state, questions)!.answer },
  ];
  for (const corrupted of corruptions) assert.equal(restoreGame(corrupted, questions), null);
  const changedBank = clone(questions);
  changedBank[0]!.answer = (changedBank[0]!.answer + 1) % 3;
  assert.equal(restoreGame(state, changedBank), null);
});

test('same seed and settings reproduce dice and questions, without mutating inputs', () => {
  const players = [player(0, 3), player(1, 6, { review: true })];
  const before = clone({ players, questions });
  const first = createGame(players, questions, 9988);
  const second = createGame(players, questions, 9988);
  assert.deepEqual(first, second);
  arrive(first);
  assert.deepEqual({ players, questions }, before);
  assert.throws(() => createGame([], questions));
  assert.throws(() => createGame([player(), player()], questions));
  assert.throws(() => createGame([player(0, 3, { units: ['unavailable'] })], questions));
});
