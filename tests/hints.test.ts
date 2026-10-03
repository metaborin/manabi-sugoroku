import test from 'node:test';
import assert from 'node:assert/strict';
import { questions } from '../src/questions.ts';
import { describeHint, hintForQuestion } from '../src/hint-model.ts';
import type { VisualHint } from '../src/hint-model.ts';

function question(id: string) {
  const found = questions.find(item => item.id === id);
  assert.ok(found, `Missing fixed question ${id}`);
  return found;
}

// Independently transcribed question statements and operands. Check the actual
// bank text as well as the diagram, so changing an ID's problem cannot silently
// reuse an old diagram. These fixtures never read the bank's answer key.
const counters: [string, string, 'add' | 'subtract', number, number][] = [
  ['g1-m01', 'りんごが 3こ。2こ もらうと、ぜんぶで なんこ？', 'add', 3, 2],
  ['g1-m02', '4 + 4 は いくつ？', 'add', 4, 4],
  ['g1-m03', '6 + 3 は いくつ？', 'add', 6, 3],
  ['g1-m04', 'とりが 7わ。あと 1わ くると、なんわ？', 'add', 7, 1],
  ['g1-m05', '5 + 5 は いくつ？', 'add', 5, 5],
  ['g1-m06', 'クッキーが 5こ。2こ たべると、のこりは なんこ？', 'subtract', 5, 2],
  ['g1-m07', '9 - 4 は いくつ？', 'subtract', 9, 4],
  ['g1-m08', '7 - 3 は いくつ？', 'subtract', 7, 3],
  ['g1-m09', '10 - 6 は いくつ？', 'subtract', 10, 6],
  ['g1-m10', 'どんぐりが 8こ。8こ ぜんぶ わたすと、のこりは？', 'subtract', 8, 8],
];

test('ten-frame operands match all ten fixed grade-1 problems including zero remaining', () => {
  for (const [id, prompt, operation, first, second] of counters) {
    const q = question(id);
    assert.equal(q.prompt, prompt, id);
    assert.equal(q.grade, 1);
    assert.deepEqual(hintForQuestion(q), { kind: 'counters', operation, first, second }, id);
    assert.ok(first <= 10 && second <= 10);
    assert.ok(operation === 'add' ? first + second <= 10 : first >= second);
  }
});

test('multiplication diagrams preserve items-per-group times number-of-groups', () => {
  const cases: [string, string, number, number][] = [
    ['g2-m06', '3 × 4 は いくつ？', 3, 4],
    ['g2-m07', '6 × 2 は いくつ？', 6, 2],
    ['g2-m08', '5 × 7 は いくつ？', 5, 7],
    ['g2-m09', '1はこに 4こずつ。3はこでは なんこ？', 4, 3],
    ['g2-m10', '8 × 8 は いくつ？', 8, 8],
  ];
  for (const [id, prompt, each, groups] of cases) {
    const q = question(id);
    assert.equal(q.prompt, prompt, id);
    assert.equal(q.grade, 2);
    assert.deepEqual(hintForQuestion(q), { kind: 'groups', each, groups }, id);
    assert.ok(each <= 8 && groups <= 8, 'diagram fits two rows and four dots per row');
  }
});

test('division diagrams distinguish equal sharing from counting equal-sized groups', () => {
  const cases: [string, string, 'group' | 'share', number, number][] = [
    ['g3-m01', '12 ÷ 3 は いくつ？', 'group', 12, 3],
    ['g3-m02', '24 ÷ 6 は いくつ？', 'group', 24, 6],
    ['g3-m03', '35 ÷ 5 は いくつ？', 'group', 35, 5],
    ['g3-m04', 'クッキー18こを 3にんで おなじ かずずつ わけると、ひとり なんこ？', 'share', 18, 3],
    ['g3-m05', '28この あめを 4こずつ ふくろに いれると、なんふくろ？', 'group', 28, 4],
  ];
  for (const [id, prompt, mode, total, divisor] of cases) {
    const q = question(id);
    assert.equal(q.prompt, prompt, id);
    assert.equal(q.grade, 3);
    assert.deepEqual(hintForQuestion(q), { kind: 'division', mode, total, divisor }, id);
    assert.equal(total % divisor, 0, 'fixed no-remainder division');
    if (mode === 'group') assert.ok(total / divisor <= 8 && divisor <= 8);
    else assert.equal(divisor, 3, 'sharing diagram has three empty plates, no solved allocation');
  }
});

test('fraction bars use the given common denominator and separate operand numerators', () => {
  const cases: [string, string, 'add' | 'subtract', number, number, number][] = [
    ['g4-m06', '2/7 + 3/7 は？（2/7は 7ぶんの2）', 'add', 2, 3, 7],
    ['g4-m07', '6/9 - 2/9 は？', 'subtract', 6, 2, 9],
    ['g4-m08', '1/5 + 2/5 は？', 'add', 1, 2, 5],
    ['g4-m09', '7/8 - 4/8 は？', 'subtract', 7, 4, 8],
    ['g4-m10', '3/10 + 4/10 は？', 'add', 3, 4, 10],
  ];
  for (const [id, prompt, operation, first, second, denominator] of cases) {
    const q = question(id);
    assert.equal(q.prompt, prompt, id);
    assert.equal(q.grade, 4);
    assert.deepEqual(hintForQuestion(q), { kind: 'fraction', operation, first, second, denominator }, id);
    assert.ok(first < denominator && second < denominator && denominator <= 10);
  }
});

test('only 25 reviewed math questions get diagrams; answer changes cannot change the diagram', () => {
  const supported = questions.filter(q => hintForQuestion(q) !== null);
  assert.equal(supported.length, 25);
  assert.deepEqual(supported.map(q => q.id), [
    ...Array.from({ length: 10 }, (_, i) => `g1-m${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 5 }, (_, i) => `g2-m${String(i + 6).padStart(2, '0')}`),
    ...Array.from({ length: 5 }, (_, i) => `g3-m${String(i + 1).padStart(2, '0')}`),
    ...Array.from({ length: 5 }, (_, i) => `g4-m${String(i + 6).padStart(2, '0')}`),
  ]);
  for (const q of supported) {
    assert.equal(q.subject, 'math');
    assert.deepEqual(hintForQuestion({ ...q, choices: ['redacted'], answer: -1 }), hintForQuestion(q), q.id);
    assert.equal(hintForQuestion({ ...q, subject: 'japanese' }), null);
    assert.equal(hintForQuestion({ ...q, grade: 6 }), null);
    const hint = hintForQuestion(q) as VisualHint;
    const { caption, description } = describeHint(hint);
    assert.doesNotMatch(caption + description, /[一-龠=＝]/u, `${q.id}: kana, no result equation`);
    assert.doesNotMatch(caption + description, /こたえは/u);
    assert.ok(description.length > 20, `${q.id}: text equivalent`);
  }
  assert.equal(hintForQuestion({ ...question('g1-m01'), id: 'unknown' }), null);
});
