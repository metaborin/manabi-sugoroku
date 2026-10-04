import type { Question } from './types.ts';
import { legacyQuestions } from './questions-legacy.ts';
import { mathLowerQuestions } from './questions/math-lower.ts';
import { mathUpperQuestions } from './questions/math-upper.ts';
import { japaneseLowerQuestions } from './questions/japanese-lower.ts';
import { japaneseUpperQuestions } from './questions/japanese-upper.ts';

export { legacyQuestions };

// Fixed, authored content only. The original IDs and all original fields remain intact.
export const questions: Question[] = [
  ...legacyQuestions, ...mathLowerQuestions, ...mathUpperQuestions,
  ...japaneseLowerQuestions, ...japaneseUpperQuestions,
];
