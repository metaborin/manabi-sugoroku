import { useState } from 'react';
import type { Grade, Player } from './types';
import { Animal } from './Art';
import { questions } from './questions';
import './party-setup.css';

export interface PartySetupProps {
  players: Player[];
  count: number;
  onCount: (count: number) => void;
  onChange: (index: number, patch: Partial<Player>) => void;
  onStart: () => void;
  onBack: () => void;
  onNotice: (message: string) => void;
}

const names = ['こむぎ', 'みみ', 'くるみ', 'そら'];
const effectiveGrade = (player: Player) => Math.max(1, player.grade - (player.review ? 1 : 0));
const unitsFor = (player: Player) => [...new Set(questions.filter(question => question.grade === effectiveGrade(player)).map(question => question.unit))];

/** Choose the party around camp, then edit one companion's settings at a time. */
export function PartySetup({ players, count, onCount, onChange, onStart, onBack, onNotice }: PartySetupProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const activeIndex = Math.min(selectedIndex, count - 1);
  const player = players[activeIndex];
  const units = unitsFor(player);

  function chooseCount(next: number) {
    setSelectedIndex(index => Math.min(index, next - 1));
    onCount(next);
  }

  function chooseUnit(unit: string, checked: boolean) {
    const chosen = player.units.length ? player.units : units;
    const next = checked ? [...chosen, unit] : chosen.filter(item => item !== unit);
    if (!next.length) {
      onNotice('たんげんは ひとつ いじょう えらんでね。');
      return;
    }
    onChange(activeIndex, { units: next });
  }

  return <section className="party-camp" aria-label="ぼうけんの なかまを えらぶ">
    <div className="camp-topline">
      <button className="secondary camp-back" onClick={onBack}>← もどる</button>
      <div className="camp-heading"><h1 id="party-title" data-scene-heading tabIndex={-1}>きょうの なかまは？</h1><p>なかまを おして、ひとりずつ じゅんびしよう。</p></div>
      <div className="count-selector" role="group" aria-label="あそぶ人数">{[1, 2, 3, 4].map(number => <button key={number} aria-pressed={count === number} onClick={() => chooseCount(number)}>{number}人</button>)}</div>
    </div>

    <div className="camp-party-slots" data-count={count}>{players.slice(0, count).map((companion, index) => <button
      key={companion.id}
      className="camp-player-slot"
      data-testid={`player-slot-${index}`}
      aria-label={`${index + 1}人めの設定をひらく`}
      aria-pressed={activeIndex === index}
      aria-controls="camp-active-player"
      onClick={() => setSelectedIndex(index)}
    >
      <span className="camp-slot-number">{index + 1}人め{activeIndex === index && <span> · えらんでいるよ</span>}</span>
      <Animal kind={companion.character} size={100}/>
      <strong>{names[companion.character]}</strong>
      <span className="camp-slot-grade">小学{companion.grade}年{companion.review ? ' · ふくしゅう' : ''}</span>
    </button>)}</div>

    <article className="player-setup camp-editor" aria-label={`${activeIndex + 1}人めの設定`} id="camp-active-player" key={player.id}>
      <div className="player-setup-title"><span className="number-badge">{activeIndex + 1}</span><h2>{activeIndex + 1}人めの なかまを えらぼう</h2></div>
      <div className="camp-editor-fields">
        <div className="animal-options" role="group" aria-label={`${activeIndex + 1}人めのキャラクター`}>{names.map((name, kind) => <button key={kind} className={player.character === kind ? 'chosen' : ''} aria-pressed={player.character === kind} aria-label={name} onClick={() => onChange(activeIndex, { character: kind })}><Animal kind={kind} size={58}/><span>{name}</span></button>)}</div>
        <div className="camp-learning-settings">
          <label className="field-label">がくねん<select aria-label={`${activeIndex + 1}人めの学年`} value={player.grade} onChange={event => onChange(activeIndex, { grade: Number(event.target.value) as Grade, review: false, units: [] })}>{[1, 2, 3, 4, 5, 6].map(grade => <option value={grade} key={grade}>小学 {grade} 年</option>)}</select></label>
          {player.grade > 1 && <label className="check-label"><input type="checkbox" checked={player.review} onChange={event => onChange(activeIndex, { review: event.target.checked, units: [] })}/>ひとつ前の がくねんを ふくしゅう</label>}
        </div>
      </div>
      <details className="unit-picker"><summary>ならった たんげんを えらぶ</summary><p>{effectiveGrade(player)}年の いちぶの たんげんだよ。<br/>まだの もんだいは、あとでも かえられるよ。</p><div className="camp-unit-options">{units.map(unit => <label className="check-label" key={unit}><input type="checkbox" checked={player.units.length === 0 || player.units.includes(unit)} onChange={event => chooseUnit(unit, event.target.checked)}/>{unit}</label>)}</div></details>
    </article>

    <div className="camp-start"><p><strong>{count}人で ひとつの ワゴンへ。</strong><span>まちがえても だいじょうぶ。</span></p><button className="primary" onClick={onStart}>ぼうけんに しゅっぱつ <span>→</span></button></div>
  </section>;
}
