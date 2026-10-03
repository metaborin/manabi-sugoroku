export type Grade = 1 | 2 | 3 | 4 | 5 | 6;
export type Subject = 'math' | 'japanese';
export interface Question {
  id: string;
  grade: Grade;
  subject: Subject;
  unit: string;
  prerequisite: string;
  prompt: string;
  choices: string[];
  answer: number;
  hint: string;
  explanation: string;
  speech: string;
  speechSafe: boolean;
  audit: string;
}
export interface Player {
  id: number;
  character: number;
  grade: Grade;
  review: boolean;
  units: string[];
}
