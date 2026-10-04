import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { questions, legacyQuestions } from '../src/questions.ts';
import { reviewedAnswers as lowerMathUpperJapanese } from './fixtures/expanded-lower-math-upper-japanese.ts';
import { reviewedAnswers as upperMathLowerJapanese } from './fixtures/expanded-upper-math-lower-japanese.ts';

// These fixtures were calculated independently of the question-bank answer
// fields. Keep them separate: a changed key must not validate itself.
const mathResults = [
  [3 + 2, 4 + 4, 6 + 3, 7 + 1, 5 + 5, 5 - 2, 9 - 4, 7 - 3, 10 - 6, 8 - 8],
  [23 + 15, 47 + 26, 56 - 24, 72 - 38, 28 + 17, 3 * 4, 6 * 2, 5 * 7, 4 * 3, 8 * 8],
  [12 / 3, 24 / 6, 35 / 5, 18 / 3, 28 / 4, 9 * 60 + 20 + 30, 10 * 60 + 50 + 20, 2 * 60, 45 - 10, 4 * 60 - 15],
  [1.25 + 0.3, 2.4 - 0.75, 0.48 + 0.27, 3.06 - 1.2, 1.5 + 0.75, 2 / 7 + 3 / 7, 6 / 9 - 2 / 9, 1 / 5 + 2 / 5, 7 / 8 - 4 / 8, 3 / 10 + 4 / 10],
  [1.2 * 0.5, 2.4 * 1.5, 3.6 / 0.6, 4.8 / 1.2, 0.7 * 0.8, 1 / 2 + 1 / 3, 3 / 4 - 1 / 2, 2 / 3 + 1 / 6, 5 / 6 - 1 / 3, 1 / 4 + 1 / 2],
  [1 / 2 * 2 / 3, 3 / 4 * 2 / 5, (2 / 3) / (4 / 5), (3 / 5) / (2 / 3), 5 / 6 * 3 / 5, 2 / 3, 6 / 9, 8 / 2 * 3, 4 / 10, 500 / (1 + 4)],
];

const japaneseAnswers = [
  ['は', 'を', 'すいか', 'ネコ', 'っ', 'やま', 'かわ', 'もり', 'はな', 'つき'],
  ['うみ', 'なつ', 'とけい', 'まいにち', 'でんしゃ', 'ぶどう', 'さむい', 'とぶ', 'ちいさい', 'ひこうき'],
  ['りょこう', 'にもつ', 'れんしゅう', 'びょういん', 'みじかい', 'うさぎが', 'うたう', 'そらが', 'あるく', 'ふうせんが'],
  ['きせつ', 'きぼう', 'どりょく', 'やくそく', 'きょうりょく', 'だから', 'しかし', 'たとえば', 'なぜなら', 'つぎに'],
  ['けいけん', 'ほうさく', 'ぼうさい', 'ぼうえき', 'じょうけん', 'ごらんになる', 'いらっしゃる', 'めしあがる', 'うかがう', 'おっしゃる'],
  ['そんちょう', 'ゆうびん', 'むね', 'こきゅう', 'てんらんかい', 'あさの どくしょを つづけたい', 'はなの せわを つづけたい', 'うんどうでき、まちの ようすに きづける ため', 'ほんによって よみかたを くふうしたい', 'みんなが きもちよく つかう ため'],
];

function question(id: string) {
  const item = questions.find(q => q.id === id);
  assert.ok(item, `Missing ${id}`);
  return item;
}

function mathematicalValue(text: string): number {
  const time = text.match(/^(\d+)じ(\d+)[ふぷ]ん$/u);
  if (time) {
    assert.ok(Number(time[2]) < 60, `Invalid time notation: ${text}`);
    return Number(time[1]) * 60 + Number(time[2]);
  }
  const fraction = text.match(/^(\d+)\/(\d+)$/u);
  if (fraction) {
    assert.notEqual(Number(fraction[2]), 0);
    return Number(fraction[1]) / Number(fraction[2]);
  }
  const ratio = text.match(/^(\d+)：(\d+)$/u);
  if (ratio) return Number(ratio[1]) / Number(ratio[2]);
  const quantity = text.match(/^(\d+(?:\.\d+)?)(?:こ|わ|ふくろ|びょう|ふん|ぷん|m|cm|mL)?$/u);
  assert.ok(quantity, `Unreviewed mathematical notation: ${text}`);
  return Number(quantity[1]);
}

test('fixed bank has exactly 360 complete unique questions and 5 per unit', () => {
  assert.equal(questions.length, 360);
  assert.equal(new Set(questions.map(q => q.id)).size, 360);
  assert.equal(new Set(questions.map(q => q.prompt.replace(/\s/gu, ''))).size, 360, 'no repeated prompt');
  for (const q of questions) {
    for (const field of ['id', 'unit', 'prerequisite', 'prompt', 'hint', 'explanation', 'speech', 'audit'] as const) {
      assert.equal(typeof q[field], 'string', `${q.id}:${field}`);
      assert.ok(q[field].trim().length > 0, `${q.id}:${field}`);
    }
    assert.match(q.id, /^g[1-6]-[mj](0[1-9]|[12][0-9]|30)$/);
    assert.ok(q.id.startsWith(`g${q.grade}-${q.subject === 'math' ? 'm' : 'j'}`), `${q.id}: metadata`);
    assert.equal(q.choices.length, 3, q.id);
    assert.equal(new Set(q.choices).size, 3, q.id);
    assert.ok(q.choices.every(choice => choice.trim().length > 0), q.id);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3, q.id);
    assert.ok(Number.isInteger(q.grade) && q.grade >= 1 && q.grade <= 6, q.id);
    assert.ok(q.subject === 'math' || q.subject === 'japanese', q.id);
    assert.equal(typeof q.speechSafe, 'boolean', q.id);
    assert.ok(q.audit.length >= 10, `${q.id}: answer reasoning`);
  }
  for (let grade = 1; grade <= 6; grade++) {
    for (const subject of ['math', 'japanese']) {
      const pool = questions.filter(q => q.grade === grade && q.subject === subject);
      assert.equal(pool.length, 30, `${grade}:${subject}`);
      const units = [...new Set(pool.map(q => q.unit))];
      assert.equal(units.length, 6, `${grade}:${subject}`);
      for (const unit of units) assert.equal(pool.filter(q => q.unit === unit).length, 5);
    }
  }
});

test('published original 120 questions retain every field and their stable IDs', () => {
  assert.equal(legacyQuestions.length, 120);
  assert.equal(createHash('sha256').update(JSON.stringify(legacyQuestions)).digest('hex'),
    'd789d580730c36ba5c5666665fa83df33f65a6a98a7757862d6c95581a8e75f0');
  for (const original of legacyQuestions) assert.deepEqual(question(original.id), original);
});

test('all 240 additions match independently derived review keys', () => {
  assert.equal(Object.keys(lowerMathUpperJapanese).length, 120);
  assert.equal(Object.keys(upperMathLowerJapanese).length, 120);
  const keys = { ...lowerMathUpperJapanese, ...upperMathLowerJapanese };
  assert.equal(Object.keys(keys).length, 240, 'review assignments do not overlap');
  const additions = questions.filter(q => Number(q.id.slice(-2)) > 10);
  assert.deepEqual(Object.keys(keys).sort(), additions.map(q => q.id).sort());
  for (const q of additions) {
    assert.equal(q.choices[q.answer], keys[q.id], `${q.id}: independent answer`);
    assert.equal(q.choices.filter(choice => choice === keys[q.id]).length, 1, `${q.id}: one answer`);
  }
});

test('all 60 math answers match independent calculations; choices have distinct values', () => {
  for (let grade = 1; grade <= 6; grade++) {
    for (let index = 1; index <= 10; index++) {
      const q = question(`g${grade}-m${String(index).padStart(2, '0')}`);
      assert.equal(q.grade, grade);
      assert.equal(q.subject, 'math');
      const values = q.choices.map(mathematicalValue);
      const expected = mathResults[grade - 1][index - 1];
      assert.ok(Math.abs(values[q.answer] - expected) < 1e-10, `${q.id}: computed answer`);
      assert.equal(values.filter(v => Math.abs(v - expected) < 1e-10).length, 1, `${q.id}: exactly one correct value`);
      assert.equal(new Set(values.map(v => v.toFixed(10))).size, 3, `${q.id}: equivalent choices`);
    }
  }
});

test('all 60 Japanese answers match the independently reviewed answer list', () => {
  for (let grade = 1; grade <= 6; grade++) {
    for (let index = 1; index <= 10; index++) {
      const q = question(`g${grade}-j${String(index).padStart(2, '0')}`);
      assert.equal(q.grade, grade);
      assert.equal(q.subject, 'japanese');
      assert.equal(q.choices[q.answer], japaneseAnswers[grade - 1][index - 1], q.id);
    }
  }
});

test('contextual reading targets use the reviewed MEXT grade allocation', () => {
  // Only the characters used by this bank; not a complete curriculum list.
  // Compared visually with MEXT Japanese PDF printed pp. 192–195.
  const reviewedGradeCharacters = [
    '山川森花月日車力',
    '海夏時計毎電行場作会',
    '旅荷物練習病院短重',
    '季節希望努約束協験便',
    '経豊防災貿易条件',
    '尊郵胸呼吸展覧',
  ];
  const readings = questions.filter(q => q.unit === 'かんじのよみ');
  assert.equal(readings.length, 30);
  for (const q of readings) {
    assert.ok(q.prompt.includes('【') && q.prompt.includes('】'), `${q.id}: explicit target`);
    const allowed = reviewedGradeCharacters.slice(0, q.grade).join('');
    for (const kanji of q.prompt.match(/[一-龠]/gu) ?? []) {
      assert.ok(allowed.includes(kanji), `${q.id}: unreviewed grade character ${kanji}`);
    }
    assert.equal(q.speechSafe, false, q.id);
    assert.equal(q.speech, 'これは、かんじの よみかたの もんだいです。かっこの なかの ことばを みて、こたえを えらんでね。', q.id);
  }
});

test('reading/spelling prompts cannot reveal answers through speech and other text is kana', () => {
  const spellingIds = new Set(['g1-j01', 'g1-j02', 'g1-j04', 'g1-j05',
    'g1-j11', 'g1-j12', 'g1-j13', 'g1-j14', 'g1-j15', 'g2-j16', 'g2-j17', 'g2-j18']);
  assert.equal(legacyQuestions.filter(q => !q.speechSafe).length, 34);
  assert.equal(legacyQuestions.filter(q => q.speechSafe).length, 86);
  assert.equal(questions.filter(q => !q.speechSafe).length, 42);
  for (const q of questions) {
    if (spellingIds.has(q.id)) {
      assert.equal(q.speechSafe, false, q.id);
      assert.ok(q.speech.startsWith('これは、'), `${q.id}: neutral spelling instruction`);
    }
    if (!q.speechSafe) assert.ok(q.speech.startsWith('これは、'), `${q.id}: neutral reading instruction`);
    for (const field of ['unit', 'prerequisite', 'prompt', 'hint', 'explanation', 'speech'] as const) {
      if (q.unit === 'かんじのよみ' && (field === 'prompt' || field === 'explanation')) continue;
      assert.doesNotMatch(q[field], /[一-龠]/u, `${q.id}:${field} non-target kanji without reading`);
    }
    for (const choice of q.choices) assert.doesNotMatch(choice, /[一-龠]/u, `${q.id}:choice`);
  }
});
