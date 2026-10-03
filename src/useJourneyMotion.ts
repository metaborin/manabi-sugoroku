import { useEffect, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { reducer, type GameState } from './engine';

export type MotionStage = 'idle' | 'rolling' | 'settled' | 'stepping' | 'arrived';
export interface MotionFrame { stage: MotionStage; face: number; step: number; tick: number }
interface TrackedFrame extends MotionFrame { token: number; players: GameState['players'] }

/** Presentation only. The engine owns the die and commits the entire move exactly once. */
export function useJourneyMotion(game: GameState | null, gameRef: RefObject<GameState | null>, setGame: Dispatch<SetStateAction<GameState | null>>, reduced: boolean, suspended: boolean) {
  const [tracked, setTracked] = useState<TrackedFrame | null>(null);
  const moving = game?.phase === 'moving';
  const current = moving && tracked?.token === game.token && tracked.players === game.players;
  const frame: MotionFrame = current ? tracked : {
    stage: moving ? reduced ? 'settled' : 'rolling' : 'idle',
    face: moving && reduced ? game.dice! : 3, step: 0, tick: 0,
  };

  useEffect(() => {
    if (!game || game.phase !== 'moving') {
      if (tracked) setTracked(null);
      return;
    }
    if (suspended) return;
    const token = game.token;
    const players = game.players;
    const dice = game.dice!;
    const live = tracked?.token === token && tracked.players === players ? tracked : null;
    if (!live) {
      setTracked({ token, players, stage: reduced ? 'settled' : 'rolling', face: reduced ? dice : 3, step: 0, tick: 0 });
      return;
    }
    if (reduced && live.stage === 'rolling') {
      setTracked({ ...live, stage: 'settled', face: dice });
      return;
    }
    const delay = live.stage === 'rolling' ? 110 : live.stage === 'settled' ? reduced ? 140 : 540 : live.stage === 'arrived' ? reduced ? 100 : 300 : reduced ? 80 : 360;
    const timer = window.setTimeout(() => {
      const active = gameRef.current;
      // Discard callbacks from a previous turn, a replaced adventure, or a hidden tab.
      if (!active || active.phase !== 'moving' || active.token !== token || active.players !== players || document.hidden) return;
      if (live.stage === 'arrived') {
        const next = reducer(active, { type: 'moveComplete', token });
        gameRef.current = next; setGame(next);
      } else if (live.stage === 'rolling') {
        setTracked(live.tick >= 5 ? { ...live, stage: 'settled', face: dice } : { ...live, tick: live.tick + 1, face: (live.tick + 1) % 3 + 1 });
      } else if (live.step < dice) {
        setTracked({ ...live, stage: 'stepping', step: live.step + 1 });
      } else {
        setTracked({ ...live, stage: 'arrived' });
      }
    }, delay);
    // One timer at a time: slow/hidden tabs cannot batch missed squares into a jump.
    return () => window.clearTimeout(timer);
  }, [game, gameRef, setGame, tracked, reduced, suspended]);

  return frame;
}
