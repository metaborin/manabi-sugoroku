import type { Question } from './types';

export type VisualHint =
  | { kind: 'counters'; operation: 'add' | 'subtract'; first: number; second: number }
  | { kind: 'groups'; each: number; groups: number }
  | { kind: 'division'; mode: 'group' | 'share'; total: number; divisor: number }
  | { kind: 'fraction'; operation: 'add' | 'subtract'; first: number; second: number; denominator: number };

// Explicit, audited operands. Never infer a diagram from an answer or choice.
// Unsupported questions keep their existing text hints. If the bank changes,
// the independent prompt fixtures in hints.test.ts must be reviewed as well.
const diagrams: Readonly<Record<string, VisualHint>> = {
  'g1-m01': { kind: 'counters', operation: 'add', first: 3, second: 2 },
  'g1-m02': { kind: 'counters', operation: 'add', first: 4, second: 4 },
  'g1-m03': { kind: 'counters', operation: 'add', first: 6, second: 3 },
  'g1-m04': { kind: 'counters', operation: 'add', first: 7, second: 1 },
  'g1-m05': { kind: 'counters', operation: 'add', first: 5, second: 5 },
  'g1-m06': { kind: 'counters', operation: 'subtract', first: 5, second: 2 },
  'g1-m07': { kind: 'counters', operation: 'subtract', first: 9, second: 4 },
  'g1-m08': { kind: 'counters', operation: 'subtract', first: 7, second: 3 },
  'g1-m09': { kind: 'counters', operation: 'subtract', first: 10, second: 6 },
  'g1-m10': { kind: 'counters', operation: 'subtract', first: 8, second: 8 },
  'g2-m06': { kind: 'groups', each: 3, groups: 4 },
  'g2-m07': { kind: 'groups', each: 6, groups: 2 },
  'g2-m08': { kind: 'groups', each: 5, groups: 7 },
  'g2-m09': { kind: 'groups', each: 4, groups: 3 },
  'g2-m10': { kind: 'groups', each: 8, groups: 8 },
  'g3-m01': { kind: 'division', mode: 'group', total: 12, divisor: 3 },
  'g3-m02': { kind: 'division', mode: 'group', total: 24, divisor: 6 },
  'g3-m03': { kind: 'division', mode: 'group', total: 35, divisor: 5 },
  'g3-m04': { kind: 'division', mode: 'share', total: 18, divisor: 3 },
  'g3-m05': { kind: 'division', mode: 'group', total: 28, divisor: 4 },
  'g4-m06': { kind: 'fraction', operation: 'add', first: 2, second: 3, denominator: 7 },
  'g4-m07': { kind: 'fraction', operation: 'subtract', first: 6, second: 2, denominator: 9 },
  'g4-m08': { kind: 'fraction', operation: 'add', first: 1, second: 2, denominator: 5 },
  'g4-m09': { kind: 'fraction', operation: 'subtract', first: 7, second: 4, denominator: 8 },
  'g4-m10': { kind: 'fraction', operation: 'add', first: 3, second: 4, denominator: 10 },
};

export function hintForQuestion(question: Question): VisualHint | null {
  if (question.subject !== 'math' || !question.id.startsWith(`g${question.grade}-m`)) return null;
  const hint = diagrams[question.id];
  return hint ? { ...hint } : null;
}

/** Text equivalent describes only givens and the visual scaffold, never a result. */
export function describeHint(hint: VisualHint): { caption: string; description: string } {
  switch (hint.kind) {
    case 'counters':
      return hint.operation === 'add'
        ? { caption: 'まると しかくを あわせると？', description: `${hint.first}この まると、${hint.second}この しかく。あわせて かぞえてみよう。` }
        : { caption: 'せんを つけた まるを とると？', description: `${hint.first}この まるから、${hint.second}こに せんを つけた ず。のこる まるを かぞえよう。` };
    case 'groups':
      return {
        caption: `${hint.each}こずつの はこが ${hint.groups}こ。ぜんぶで？`,
        description: `ひとつの はこに ${hint.each}この まる。はこが ${hint.groups}こ ならんでいるよ。`,
      };
    case 'division':
      return hint.mode === 'share'
        ? { caption: `${hint.total}こを ${hint.divisor}にんに おなじ かずずつ。`, description: `${hint.total}この まると、${hint.divisor}まいの からの おさら。ひとりに 1こずつ くばる つもりで かんがえよう。` }
        : { caption: `${hint.total}こを ${hint.divisor}こずつ。はこは いくつ？`, description: `${hint.total}この まるを、${hint.divisor}こずつ はこで かこんだ ず。はこの かずを かぞえてみよう。` };
    case 'fraction':
      return {
        caption: hint.operation === 'add' ? 'いろの ますを あわせると？' : 'うえから したの ぶんを とると？',
        description: `おなじ ながさの おびを、それぞれ ${hint.denominator}こに わけた ず。うえは ${hint.first}ます、したは ${hint.second}ますに いろが あるよ。ひとますは ${hint.denominator}ぶんの1。`,
      };
  }
}
