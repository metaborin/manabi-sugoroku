import type { Grade, Question, Subject } from './types.ts';

// Authored fixed questions only. This helper attaches metadata; it does not
// create questions at runtime. The correct answer is stored separately so a
// reordered choice cannot silently change the answer key.
export type FixedQuestion = [
  id: string, prompt: string, choices: [string, string, string], correct: string,
  hint: string, explanation: string, speech: string, audit: string,
  speechSafe?: boolean,

];

export function unit(grade: Grade, subject: Subject, name: string, prerequisite: string, rows: FixedQuestion[]): Question[] {
  return rows.map(([id, prompt, choices, correct, hint, explanation, speech, audit, speechSafe = true]) => {
    const answer = choices.indexOf(correct);
    if (answer < 0 || new Set(choices).size !== choices.length) throw new Error(`Invalid fixed question: ${id}`);
    return { id, grade, subject, unit: name, prerequisite, prompt, choices, answer, hint, explanation, speech, speechSafe, audit };
  });
}

export const readingNotice = 'これは、かんじの よみかたの もんだいです。かっこの なかの ことばを みて、こたえを えらんでね。';
