import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, getQuestion, reducer, restoreGame, type GameAction, type GameState } from '../src/engine.ts';
import { questions } from '../src/questions.ts';
import type { Grade, Subject } from '../src/types.ts';

test('all 360 authored questions are reachable once per selected subject pool before any repetition', () => {
  for (const grade of [1, 2, 3, 4, 5, 6] as Grade[]) for (const subject of ['math', 'japanese'] as Subject[]) {
    const pool = questions.filter(question => question.grade === grade && question.subject === subject);
    const units = [...new Set(pool.map(question => question.unit))];
    let state = createGame([{ id: 0, character: 0, grade, review: false, units }], questions, 910 + grade);
    const act = (type: GameAction['type']): GameState => reducer(state, { type, token: state.token } as GameAction);
    state = act('roll');
    state = act('moveComplete');
    const seen = new Set<string>();
    const position = state.position;
    for (let index = 0; index < 30; index += 1) {
      const question = getQuestion(state, questions)!;
      assert.equal(question.grade, grade);
      assert.equal(question.subject, subject);
      assert.ok(!seen.has(question.id), `${question.id}: repeated before pool exhaustion`);
      seen.add(question.id);
      assert.equal(state.position, position);
      assert.equal(state.turnsCompleted, 0);
      if (index < 29) state = act('exchange');
    }
    assert.deepEqual([...seen].sort(), pool.map(question => question.id).sort());
    const previous = state.questionId;
    state = act('exchange');
    assert.notEqual(state.questionId, previous);
    assert.ok(restoreGame(JSON.parse(JSON.stringify(state)), questions));
  }
});
