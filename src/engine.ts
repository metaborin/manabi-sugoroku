import type { Player, Question, Subject } from './types.ts';

export type Phase = 'roll' | 'moving' | 'question' | 'feedback' | 'event' | 'goal';
export type Route = 'forest' | 'river';
export type EventKind = 'rest' | 'route' | 'final';

interface QuestionInfo {
  id: string;
  subject: Subject;
  answer: number;
  choices: number;
}

export interface GameState {
  version: 2;
  bankSignature: string;
  seed: number;
  token: number;
  players: Player[];
  phase: Phase;
  turnIndex: number;
  turnsCompleted: number;
  totalTurns: number;
  completedByPlayer: number[];
  /** Last committed space. Rolling and one-space animation remain UI-only until moveComplete. */
  position: number;
  goalPosition: number;
  dice: number | null;
  rolls: number[];
  questionId: string | null;
  attempts: number;
  hintUsed: boolean;
  helpUsed: boolean;
  selectedChoice: number | null;
  feedback: 'correct' | 'explained' | null;
  eventKind: EventKind | null;
  rescues: number;
  /** Completed actions in the current checkpoint rescue; 3 means it is complete. */
  rescueProgress: number;
  routes: Route[];
  /** Per-player deterministic decks; these contain only eligible questions. */
  decks: QuestionInfo[][];
  usedQuestionIds: string[][];
}

type Guard = { token: number };
export type GameAction = Guard & (
  | { type: 'roll' }
  /** Animation completion and skip share this atomic, token-guarded landing action. */
  | { type: 'moveComplete' }
  | { type: 'answer'; choice: number }
  | { type: 'hint' }
  | { type: 'help' }
  | { type: 'exchange' }
  | { type: 'reveal' }
  | { type: 'continue' }
  | { type: 'rescue'; step: number }
  | { type: 'next'; route?: Route }
);

/** Review deliberately means the previous grade only, not all earlier grades. */
export function eligibleQuestions(player: Player, questions: readonly Question[]): Question[] {
  const grade = player.review ? Math.max(1, player.grade - 1) : player.grade;
  return questions.filter(question => question.grade === grade &&
    (player.units.length === 0 || player.units.includes(question.unit)));
}

function randomGenerator(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let mixed = Math.imul(value ^ (value >>> 15), value | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

function bankSignature(questions: readonly Question[]): string {
  const data = JSON.stringify([...questions].sort((left, right) => left.id.localeCompare(right.id)).map(question => [
    question.id, question.grade, question.subject, question.unit, question.prerequisite, question.prompt,
    question.choices, question.answer, question.hint, question.explanation, question.speech, question.speechSafe,
  ]));
  let hash = 0x811C9DC5;
  for (let index = 0; index < data.length; index += 1) hash = Math.imul(hash ^ data.charCodeAt(index), 0x01000193);
  return `v1-${(hash >>> 0).toString(16)}`;
}

export function createGame(players: readonly Player[], questions: readonly Question[], seed = Date.now()): GameState {
  if (players.length < 1 || players.length > 4) throw new Error('Choose 1–4 players.');
  if (new Set(players.map(player => player.id)).size !== players.length) throw new Error('Player IDs must be unique.');
  for (const player of players) {
    if (!Number.isInteger(player.grade) || player.grade < 1 || player.grade > 6 ||
      !Number.isInteger(player.character) || player.character < 0 || player.character > 3 ||
      !Number.isInteger(player.id) || typeof player.review !== 'boolean' ||
      !Array.isArray(player.units) || player.units.some(unit => typeof unit !== 'string')) {
      throw new Error('Invalid player settings.');
    }
  }
  const normalizedSeed = seed >>> 0;
  const random = randomGenerator(normalizedSeed);
  const totalTurns = Math.ceil(12 / players.length) * players.length;
  const rolls = Array.from({ length: totalTurns }, () => 1 + Math.floor(random() * 3));
  const decks = players.map(player => {
    const eligible = eligibleQuestions(player, questions);
    if (eligible.length === 0) throw new Error('Choose at least one available unit.');
    if (new Set(eligible.map(question => question.id)).size !== eligible.length) throw new Error('Question IDs must be unique.');
    return shuffled(eligible, random).map(question => ({
      id: question.id, subject: question.subject, answer: question.answer, choices: question.choices.length,
    }));
  });
  return {
    version: 2, bankSignature: bankSignature(questions), seed: normalizedSeed, token: 0,
    players: players.map(player => ({ ...player, units: [...player.units] })),
    phase: 'roll', turnIndex: 0, turnsCompleted: 0, totalTurns,
    completedByPlayer: players.map(() => 0),
    position: 0, goalPosition: rolls.reduce((sum, roll) => sum + roll, 0), dice: null, rolls,
    questionId: null, attempts: 0, hintUsed: false, helpUsed: false,
    selectedChoice: null, feedback: null, eventKind: null, rescues: 0, rescueProgress: 0, routes: [],
    decks, usedQuestionIds: players.map(() => []),
  };
}

/** Rescue markers sit on the spaces reached by the fourth, eighth and last dice rolls. */
export function checkpointPositions(state: Pick<GameState, 'rolls'>): number[] {
  return [4, 8, 12].map(turn => state.rolls.slice(0, turn).reduce((sum, roll) => sum + roll, 0));
}

export function getQuestion(state: GameState, questions: readonly Question[]): Question | undefined {
  return questions.find(question => question.id === state.questionId);
}

function currentInfo(state: GameState): QuestionInfo | undefined {
  return state.decks[state.turnIndex]?.find(question => question.id === state.questionId);
}

function drawQuestion(state: GameState, exchange: boolean): GameState {
  const deck = state.decks[state.turnIndex]!;
  const preferred: Subject = state.completedByPlayer[state.turnIndex]! % 2 === 0 ? 'math' : 'japanese';
  const oldQuestion = currentInfo(state);
  const subject = exchange && oldQuestion ? oldQuestion.subject : preferred;
  const subjectDeck = deck.filter(question => question.subject === subject);
  // A player's unit choices can intentionally omit an entire subject.
  const pool = subjectDeck.length > 0 ? subjectDeck : deck;
  let candidates = exchange ? pool.filter(question => question.id !== state.questionId) : pool;
  // An exchange may use the other selected subject when the current unit has one question.
  if (exchange && candidates.length === 0) candidates = deck.filter(question => question.id !== state.questionId);
  if (candidates.length === 0) return state;
  let used = [...state.usedQuestionIds[state.turnIndex]!];
  let next = candidates.find(question => !used.includes(question.id));
  if (!next) {
    const candidateIds = new Set(candidates.map(question => question.id));
    used = used.filter(id => !candidateIds.has(id));
    next = candidates[0]!;
  }
  used.push(next.id);
  const usedQuestionIds = state.usedQuestionIds.map((ids, index) => index === state.turnIndex ? used : ids);
  return { ...state, questionId: next.id, usedQuestionIds, attempts: 0, hintUsed: false,
    helpUsed: false, selectedChoice: null, feedback: null };
}

/** Every accepted action advances the token. Old UI callbacks cannot advance a later turn. */
export function reducer(state: GameState, action: GameAction): GameState {
  if (action.token !== state.token) return state;
  let next: GameState = state;
  switch (action.type) {
    case 'roll':
      // Commit the result before presentation so interruptions can never roll again.
      if (state.phase === 'roll') next = { ...state, phase: 'moving', dice: state.rolls[state.turnsCompleted]! };
      break;
    case 'moveComplete':
      if (state.phase === 'moving') next = drawQuestion({ ...state, phase: 'question', position: state.position + state.dice! }, false);
      break;
    case 'answer': {
      const question = currentInfo(state);
      if (state.phase !== 'question' || !question || !Number.isInteger(action.choice) || action.choice < 0 || action.choice >= question.choices) break;
      const correct = action.choice === question.answer;
      next = { ...state, selectedChoice: action.choice,
        attempts: correct ? state.attempts : state.attempts + 1,
        phase: correct ? 'feedback' : 'question', feedback: correct ? 'correct' : null,
        hintUsed: state.hintUsed || !correct };
      break;
    }
    case 'hint':
      if (state.phase === 'question' && !state.hintUsed) next = { ...state, hintUsed: true };
      break;
    case 'help':
      if (state.phase === 'question' && !state.helpUsed) next = { ...state, helpUsed: true };
      break;
    case 'exchange':
      if (state.phase === 'question') next = drawQuestion(state, true);
      break;
    case 'reveal':
      if (state.phase === 'question' && state.attempts >= 2) next = { ...state, phase: 'feedback', feedback: 'explained' };
      break;
    case 'continue': {
      if (state.phase !== 'feedback') break;
      const turnsCompleted = state.turnsCompleted + 1;
      const completedByPlayer = state.completedByPlayer.map((count, index) => count + (index === state.turnIndex ? 1 : 0));
      next = { ...state, phase: 'event', turnsCompleted, completedByPlayer,
        rescueProgress: 0,
        eventKind: turnsCompleted === state.totalTurns ? 'final' : turnsCompleted % 4 === 0 ? 'route' : 'rest' };
      break;
    }
    case 'rescue': {
      if (state.phase !== 'event' || (state.eventKind !== 'route' && state.eventKind !== 'final') ||
          state.rescueProgress >= 3 || action.step !== state.rescueProgress) break;
      const rescueProgress = state.rescueProgress + 1;
      next = { ...state, rescueProgress, rescues: state.rescues + (rescueProgress === 3 ? 1 : 0) };
      break;
    }
    case 'next': {
      if (state.phase !== 'event') break;
      if ((state.eventKind === 'route' || state.eventKind === 'final') && state.rescueProgress !== 3) break;
      if (state.eventKind === 'route' && action.route !== 'forest' && action.route !== 'river') break;
      const routes = state.eventKind === 'route'
        ? [...state.routes, action.route!]
        : state.routes;
      next = state.turnsCompleted === state.totalTurns
        ? { ...state, phase: 'goal', routes }
        : { ...state, phase: 'roll', turnIndex: (state.turnIndex + 1) % state.players.length,
          dice: null, questionId: null, attempts: 0, hintUsed: false, helpUsed: false,
          selectedChoice: null, feedback: null, eventKind: null, rescueProgress: 0, routes };
      break;
    }
  }
  return next === state ? state : { ...next, token: state.token + 1 };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function integer(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;
}

/** Validate a local snapshot against the current fixed bank; corrupt/incompatible saves return null. */
export function restoreGame(snapshot: unknown, questions: readonly Question[]): GameState | null {
  if (!isRecord(snapshot) || (snapshot.version !== 1 && snapshot.version !== 2) || !Array.isArray(snapshot.players) ||
      !integer(snapshot.seed, 0, 0xFFFFFFFF) || !integer(snapshot.token, 0, Number.MAX_SAFE_INTEGER)) return null;
  let base: GameState;
  try { base = createGame(snapshot.players as Player[], questions, snapshot.seed); } catch { return null; }
  if (snapshot.bankSignature !== base.bankSignature || JSON.stringify(snapshot.rolls) !== JSON.stringify(base.rolls)) return null;
  if (!['roll', 'moving', 'question', 'feedback', 'event', 'goal'].includes(String(snapshot.phase)) ||
      !integer(snapshot.turnsCompleted, 0, base.totalTurns) || !integer(snapshot.turnIndex, 0, base.players.length - 1) ||
      !integer(snapshot.attempts, 0, Number.MAX_SAFE_INTEGER) || typeof snapshot.hintUsed !== 'boolean' ||
      typeof snapshot.helpUsed !== 'boolean' || !Array.isArray(snapshot.usedQuestionIds) ||
      snapshot.usedQuestionIds.length !== base.players.length || !Array.isArray(snapshot.routes)) return null;
  const phase = snapshot.phase as Phase;
  const completed = snapshot.turnsCompleted;
  const completedPhase = phase === 'event' || phase === 'goal';
  if ((phase === 'goal' && completed !== base.totalTurns) ||
      (!completedPhase && completed === base.totalTurns) || (completedPhase && completed === 0)) return null;
  const expectedIndex = (completed - (completedPhase ? 1 : 0)) % base.players.length;
  if (snapshot.turnIndex !== expectedIndex) return null;
  const movedTurns = completed + (phase === 'question' || phase === 'feedback' ? 1 : 0);
  const position = base.rolls.slice(0, movedTurns).reduce((sum, value) => sum + value, 0);
  if (snapshot.position !== position || snapshot.goalPosition !== base.goalPosition || snapshot.totalTurns !== base.totalTurns) return null;
  const diceIndex = completedPhase ? completed - 1 : completed;
  const dice = phase === 'roll' ? null : base.rolls[diceIndex]!;
  if (snapshot.dice !== dice) return null;
  const questionId = snapshot.questionId;
  const info = base.decks[expectedIndex]!.find(question => question.id === questionId);
  if (phase === 'roll' || phase === 'moving') {
    if (questionId !== null || snapshot.attempts !== 0 || snapshot.selectedChoice !== null || snapshot.feedback !== null ||
      snapshot.hintUsed || snapshot.helpUsed) return null;
  } else if (!info) return null;
  const selectedChoice = snapshot.selectedChoice;
  if (selectedChoice !== null && (!info || !integer(selectedChoice, 0, info.choices - 1))) return null;
  if (phase === 'question' && selectedChoice !== null && (selectedChoice === info?.answer || snapshot.attempts === 0)) return null;
  if (snapshot.attempts > 0 && !snapshot.hintUsed) return null;
  const feedback = snapshot.feedback;
  if (phase === 'feedback' || completedPhase) {
    if (feedback !== 'correct' && feedback !== 'explained') return null;
    if (feedback === 'correct' && selectedChoice !== info?.answer) return null;
    if (feedback === 'explained' && snapshot.attempts < 2) return null;
  } else if (feedback !== null) return null;
  const usedQuestionIds: string[][] = [];
  for (let index = 0; index < base.players.length; index += 1) {
    const ids: unknown = snapshot.usedQuestionIds[index];
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !base.decks[index]!.some(question => question.id === id)) ||
        new Set(ids).size !== ids.length) return null;
    usedQuestionIds.push(ids as string[]);
  }
  if (typeof questionId === 'string' && !usedQuestionIds[expectedIndex]!.includes(questionId)) return null;
  const routes: GameState['routes'] = [];
  const routeTurns = [4, 8].filter(turn => turn < completed || (turn === completed && phase !== 'event'));
  if (snapshot.routes.length !== routeTurns.length) return null;
  for (let index = 0; index < routeTurns.length; index += 1) {
    const route: unknown = snapshot.routes[index];
    if (route !== 'forest' && route !== 'river') return null;
    routes.push(route);
  }
  const eventKind = completedPhase ? completed === base.totalTurns ? 'final' : completed % 4 === 0 ? 'route' : 'rest' : null;
  const checkpointEvent = phase === 'event' && (eventKind === 'route' || eventKind === 'final');
  // Original saves awarded each rescue on arrival; preserve that progress on upgrade.
  const rescueProgress = snapshot.version === 1
    ? checkpointEvent || phase === 'goal' ? 3 : 0
    : snapshot.rescueProgress;
  if (!integer(rescueProgress, 0, 3) || (phase === 'goal' && rescueProgress !== 3) ||
      (!checkpointEvent && phase !== 'goal' && rescueProgress !== 0)) return null;
  const rescues = Math.floor(completed / 4) - (checkpointEvent && rescueProgress < 3 ? 1 : 0);
  if (snapshot.eventKind !== eventKind || snapshot.rescues !== rescues) return null;
  const completedByPlayer = base.players.map((_, index) => Math.floor(completed / base.players.length) + (index < completed % base.players.length ? 1 : 0));
  if (JSON.stringify(snapshot.completedByPlayer) !== JSON.stringify(completedByPlayer)) return null;
  return { ...base, token: snapshot.token, phase, turnIndex: expectedIndex, turnsCompleted: completed,
    completedByPlayer, position, dice, questionId: questionId as string | null,
    attempts: snapshot.attempts, hintUsed: snapshot.hintUsed, helpUsed: snapshot.helpUsed,
    selectedChoice: selectedChoice as number | null, feedback: feedback as GameState['feedback'],
    eventKind, rescues, rescueProgress, routes, usedQuestionIds };
}
