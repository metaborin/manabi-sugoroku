import type { GameState } from './engine';
import { chapters, chapterIndex } from './adventure';
import { Animal } from './Art';
import './save-summary.css';

const names = ['こむぎ', 'みみ', 'くるみ', 'そら'];

function savedStep(saved: GameState): string {
  switch (saved.phase) {
    case 'roll': return 'サイコロを ふるところ';
    case 'moving': return `${saved.dice}の めで すすむところ`;
    case 'question': return 'もんだいを かんがえるところ';
    case 'feedback': return 'こたえの せつめいを みるところ';
    case 'event':
      if (saved.eventKind === 'rest') return 'もりの できごとを みるところ';
      if (saved.rescueProgress < 3) return `おてつだいの とちゅう（${saved.rescueProgress} / 3）`;
      return saved.eventKind === 'final' ? 'みんなで ゴールするところ' : 'つぎの みちを えらぶところ';
    case 'goal': return 'ゴールした ぼうけん';
  }
}

/** Describe only the explicit saved snapshot, never newer progress in the live game. */
export function SaveSummary({ saved, compact = false }: { saved: GameState; compact?: boolean }) {
  const chapter = chapterIndex(saved);
  const current = saved.players[saved.turnIndex];
  return <section className={`save-summary${compact ? ' save-summary-compact' : ''}`} aria-label="ほぞんした ぼうけん" data-testid="save-summary">
    <div className="save-summary-heading"><strong>ほぞんした ぼうけん</strong><span>{saved.players.length}人の なかま</span></div>
    <p className="save-summary-chapter">第{chapter + 1}話 · {chapters[chapter].title}</p>
    <div className="save-summary-progress"><span>✦ {saved.turnsCompleted} / {saved.totalTurns} まなび</span><span>♡ {saved.rescues} / 3びき たすけた</span></div>
    <p className="save-summary-step"><strong>つづき：</strong>{savedStep(saved)}</p>
    {saved.phase !== 'goal' && <p className="save-summary-turn">{saved.turnIndex + 1}人め・{names[current.character]}の ばん</p>}
    <ol className="save-summary-party" aria-label="ほぞんした なかまの がくねん">{saved.players.map((player, index) => <li key={player.id}>
      {!compact && <Animal kind={player.character} size={35}/>}
      <span><strong>{index + 1}人め · {player.grade}年</strong>{player.review && <small>{Math.max(1, player.grade - 1)}年の ふくしゅう</small>}</span>
    </li>)}</ol>
  </section>;
}
