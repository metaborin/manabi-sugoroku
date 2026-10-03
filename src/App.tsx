import { useEffect, useRef, useState } from 'react';
import type { Grade, Player } from './types';
import { questions } from './questions';
import { createGame, reducer, getQuestion, restoreGame } from './engine';
import type { GameAction, GameState } from './engine';
import { Animal, Board, RescueAnimal } from './Art';

const names = ['こむぎ', 'みみ', 'くるみ', 'そら'];
const saveKey = 'manabi-sugoroku-save-v1';
const makePlayer = (i: number): Player => ({ id: i, character: i, grade: 1, review: false, units: [] });
const initialPlayers = [0, 1, 2, 3].map(makePlayer);
const effectiveGrade = (p: Player) => Math.max(1, p.grade - (p.review ? 1 : 0));
const unitsFor = (p: Player) => [...new Set(questions.filter(q => q.grade === effectiveGrade(p)).map(q => q.unit))];

function readSaved(): GameState | null {
  try { const value = localStorage.getItem(saveKey); return value ? restoreGame(JSON.parse(value), questions) : null; } catch { return null; }
}

function App() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [count, setCount] = useState(1);
  const [game, setGame] = useState<GameState | null>(null);
  const gameRef = useRef<GameState | null>(null);
  const [saved, setSaved] = useState<GameState | null>(readSaved);
  const [paused, setPaused] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [settings, setSettings] = useState(false);
  const [speechOn, setSpeechOn] = useState(false);
  const [volume, setVolume] = useState(0);
  const [shortMotion, setShortMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [notice, setNotice] = useState('');
  const [exchangeNotice, setExchangeNotice] = useState('');
  const focusRef = useRef<HTMLHeadingElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const modalOpen = paused || settings || confirmRestart;
  const current = game ? game.players[game.turnIndex] : null;
  const question = game ? getQuestion(game, questions) : null;

  function updateGame(next: GameState | null) { gameRef.current = next; setGame(next); }
  function send(action: Omit<GameAction, 'token'> | { type: 'answer'; choice: number } | { type: 'next'; route?: 'forest' | 'river' }) {
    if (!game) return;
    const next = reducer(gameRef.current ?? game, { ...action, token: game.token } as GameAction);
    if (action.type === 'exchange') setExchangeNotice(next === game ? 'この たんげんの ほかの もんだいは ないよ。ヒントや こたえを つかってね。' : 'もんだいを かえたよ。あわてず やってみよう。');
    else if (action.type === 'roll' || action.type === 'next') setExchangeNotice('');
    updateGame(next);
  }
  function stopSpeech() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  function playSound() {
    if (!volume) return;
    try {
      const audio = audioRef.current ?? new AudioContext(); audioRef.current = audio;
      void audio.resume();
      const oscillator = audio.createOscillator(); const gain = audio.createGain();
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audio.currentTime); oscillator.frequency.linearRampToValueAtTime(783.99, audio.currentTime + 0.12);
      gain.gain.setValueAtTime(volume / 500, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25);
      oscillator.start(); oscillator.stop(audio.currentTime + 0.26);
    } catch { /* Sound is optional. */ }
  }
  function speak() {
    if (!question || !speechOn) return;
    if (!question.speechSafe) { setNotice('よみかたの もんだいは、こたえが わからないように よみあげを おやすみするよ。'); return; }
    if (!('speechSynthesis' in window)) { setNotice('この ブラウザでは よみあげが つかえないよ。もじで つづけよう。'); return; }
    // Only local voices: no child or question data is sent to a remote voice service.
    const voice = speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith('ja'));
    if (!voice) { setNotice('この たんまつに 日本語の よみあげが ないよ。もじで つづけよう。'); return; }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(question.speech); utterance.voice = voice; utterance.lang = 'ja-JP'; utterance.rate = 0.85;
    utterance.onerror = () => setNotice('よみあげが できなかったよ。もじで つづけられるよ。');
    try { speechSynthesis.speak(utterance); } catch { setNotice('よみあげが できなかったよ。もじで つづけよう。'); }
  }
  function start() {
    const configured = players.slice(0, count).map(p => ({ ...p, units: p.units.length ? p.units : unitsFor(p) }));
    updateGame(createGame(configured, questions)); setNotice('');
    history.pushState({ adventure: true }, '', location.href);
  }
  function save() {
    if (!game) return;
    try { localStorage.setItem(saveKey, JSON.stringify(game)); setSaved(game); setNotice('ここまでを この たんまつに ほぞんしたよ。つぎは「つづきから」で あそべるよ。'); }
    catch { setNotice('この たんまつでは ほぞんできなかったよ。ページを とじずに つづけてね。'); }
  }
  function restart() { stopSpeech(); updateGame(null); setConfirmRestart(false); setPaused(false); setNotice(''); }
  function editPlayer(index: number, patch: Partial<Player>) { setPlayers(list => list.map((p, i) => i === index ? { ...p, ...patch } : p)); }

  useEffect(() => {
    if (game?.phase !== 'moving' || modalOpen) return;
    const token = game.token;
    const timer = setTimeout(() => {
      if (gameRef.current) updateGame(reducer(gameRef.current, { type: 'moveComplete', token }));
    }, shortMotion ? 80 : 650);
    return () => clearTimeout(timer);
  }, [game?.phase, game?.token, shortMotion, modalOpen]);

  useEffect(() => {
    stopSpeech();
    if (game && !modalOpen) focusRef.current?.focus();
  }, [game?.phase, game?.turnIndex, modalOpen]); // Keep keyboard users at the active instruction.

  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (gameRef.current && gameRef.current.phase !== 'goal') { event.preventDefault(); event.returnValue = ''; } };
    const back = () => { if (gameRef.current) { history.pushState({ adventure: true }, '', location.href); setPaused(true); } };
    window.addEventListener('beforeunload', unload); window.addEventListener('popstate', back);
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener('popstate', back); };
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = modalRef.current?.querySelector<HTMLElement>('button, input, select'); first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSettings(false); setPaused(false); setConfirmRestart(false); }
      if (e.key !== 'Tab') return;
      const nodes = modalRef.current?.querySelectorAll<HTMLElement>('button, input, select'); if (!nodes?.length) return;
      const firstNode = nodes[0], lastNode = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === firstNode) { e.preventDefault(); lastNode.focus(); }
      else if (!e.shiftKey && document.activeElement === lastNode) { e.preventDefault(); firstNode.focus(); }
    };
    document.addEventListener('keydown', trap); return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [modalOpen]);

  return <div className={`app ${shortMotion ? 'short-motion' : ''}`}>
    <header className="site-header"><a className="brand" href="#" onClick={e => { e.preventDefault(); if (game) setPaused(true); }} aria-label="まなびの冒険すごろく ホーム"><span className="brand-icon">✦</span><span>まなびの<span className="brand-small">冒険すごろく</span></span></a><div className="header-actions"><span className="co-op-label">みんなで ちからを あわせよう</span><button className="icon-button" onClick={() => setSettings(true)}>⚙ <span>せってい</span></button>{game && <button className="icon-button" onClick={() => setPaused(true)}>Ⅱ <span>ひとやすみ</span></button>}</div></header>
    <main inert={modalOpen}>
      {!game ? <>
        <section className="welcome">
          <div className="welcome-copy"><p className="eyebrow"><span/> 1〜4人で あそぶ おべんきょうの 冒険</p><h1>ひとりでも、<br/>みんなでも。<br/><span>まなびが 冒険になる。</span></h1><p className="intro">どうぶつの なかまたちと、ふしぎな もりへ。<br/>こくごと さんすうの 力で、<br/>こまっている なかまを たすけに いこう！</p><div className="welcome-facts"><span>✦ 小学1〜6年</span><span>◷ 10分くらい</span><span>♡ まちがえても だいじょうぶ</span></div><a className="primary setup-jump" href="#party">なかまを えらぼう <span>→</span></a>{saved && <button className="secondary resume-button" onClick={() => { updateGame(saved); history.pushState({ adventure: true }, '', location.href); setNotice(''); }}>ほぞんした つづきから →</button>}</div>
          <div className="welcome-map"><div className="map-label">ぼうけんの ちず <span>こもれびの もり</span></div><Board position={0} totalDistance={24} rescued={0} route="forest" characters={players.slice(0, count).map(p => p.character)}/><div className="map-caption"><span>START はじまりの おか</span><span>GOAL なかまの むら ⚑</span></div></div>
        </section>
        <section className="party-section" id="party"><div className="section-heading"><div><p className="eyebrow">ぼうけんの じゅんび</p><h2>きょうの なかまは？</h2></div><div className="count-selector" role="group" aria-label="あそぶ人数">{[1, 2, 3, 4].map(n => <button key={n} aria-pressed={count === n} onClick={() => setCount(n)}>{n}人</button>)}</div></div>
          <div className={`player-setup-grid count-${count}`}>{players.slice(0, count).map((player, index) => <article className="player-setup" key={player.id} aria-label={`${index + 1}人めの設定`}><div className="player-setup-title"><span className="number-badge">{index + 1}</span><strong>{index + 1}人めの なかま</strong></div><div className="animal-options" role="group" aria-label={`${index + 1}人めのキャラクター`}>{names.map((name, kind) => <button key={kind} className={player.character === kind ? 'chosen' : ''} aria-pressed={player.character === kind} aria-label={name} onClick={() => editPlayer(index, { character: kind })}><Animal kind={kind} size={52}/><span>{name}</span></button>)}</div><label className="field-label">がくねん<select aria-label={`${index + 1}人めの学年`} value={player.grade} onChange={e => editPlayer(index, { grade: Number(e.target.value) as Grade, review: false, units: [] })}>{[1, 2, 3, 4, 5, 6].map(grade => <option value={grade} key={grade}>小学 {grade} 年</option>)}</select></label>{player.grade > 1 && <label className="check-label"><input type="checkbox" checked={player.review} onChange={e => editPlayer(index, { review: e.target.checked, units: [] })}/>ひとつ前の がくねんを ふくしゅう</label>}<details className="unit-picker"><summary>ならった たんげんを えらぶ</summary><p>{effectiveGrade(player)}年の いちぶの たんげんだよ。<br/>まだの もんだいは、あとでも かえられるよ。</p>{unitsFor(player).map(unit => <label className="check-label" key={unit}><input type="checkbox" checked={player.units.length === 0 || player.units.includes(unit)} onChange={e => { const chosen = player.units.length ? player.units : unitsFor(player); const next = e.target.checked ? [...chosen, unit] : chosen.filter(u => u !== unit); if (!next.length) { setNotice('たんげんは ひとつ いじょう えらんでね。'); return; } editPlayer(index, { units: next }); }}/>{unit}</label>)}</details></article>)}</div>
          <div className="start-strip"><p>ひとつの ワゴンに のって、なかまを 3びき たすけよう。<br/><small>じゅんばんに サイコロ → もんだい → なかまの ばん。じかんせいげんは ないよ。</small></p><button className="primary" onClick={start}>ぼうけんに しゅっぱつ <span>→</span></button></div>
        </section><aside className="adult-note"><strong>おうちの方へ</strong><p>国語・算数の一部単元を収録した初版です。各学年20問、全120問。学年の全範囲を網羅するものではありません。本名・アカウントは不要です。ゲーム中にデータを外部送信せず、「ほぞん」を押したときだけ、このブラウザに進行状況を保存します。</p></aside>
      </> : <>
        <section className="adventure-heading"><div><p className="eyebrow">みんなで つくる、ひとつの 冒険</p><h1>こもれびの もりの おとしもの</h1></div><div className="mission"><span className="mission-icon">⚑</span><div><small>なかまを たすけよう</small><strong>{game.rescues} <span>/ 3 びき</span></strong></div></div></section>
        <div className="adventure-layout"><section className="board-panel" aria-label="冒険のマップ"><div className="board-top"><span>✦ {game.routes.length ? game.routes[game.routes.length - 1] === 'river' ? 'きらきらの かわ' : 'こもれびの こみち' : 'はじまりの おか'}</span><span>{game.turnsCompleted} / {game.totalTurns} もん</span></div><Board position={game.position} totalDistance={game.goalPosition} rescued={game.rescues} route={game.routes[game.routes.length - 1] ?? 'forest'} characters={game.players.map(p => p.character)}/><div className="board-bottom"><span>ひとつの ワゴンで、いっしょに ゴールへ。</span><span>{game.position} / {game.goalPosition} マス</span></div><div className="progress-track" role="progressbar" aria-label="冒険の進みぐあい" aria-valuemin={0} aria-valuemax={game.totalTurns} aria-valuenow={game.turnsCompleted}><span style={{ width: `${game.turnsCompleted / game.totalTurns * 100}%` }}/></div></section>
        <section className="play-panel" aria-label="いまの手番">
          {game.phase !== 'goal' && current && <div className="turn-banner"><Animal kind={current.character} size={62}/><div><small>{game.turnIndex + 1}人め ・ 小学{current.grade}年{current.review ? '（ふくしゅう）' : ''}</small><strong>{names[current.character]}の ばん</strong></div><span className="turn-star">✦</span></div>}
          {(game.phase === 'roll' || game.phase === 'moving') && <div className="roll-scene"><p className="eyebrow">つぎは どこへ いこう？</p><h2 ref={focusRef} tabIndex={-1}>{game.phase === 'moving' ? `${game.dice}マス すすむよ！` : 'サイコロを ふろう'}</h2><div className={`dice ${game.phase === 'moving' ? 'rolling' : ''}`} aria-hidden="true">{game.phase === 'moving' ? ['','⚀','⚁','⚂'][game.dice ?? 1] : '⚂'}</div><p>でる めは 1・2・3。<br/>みんなの ワゴンを すすめよう。</p>{game.phase === 'roll' ? <button className="primary full" onClick={() => { send({ type: 'roll' }); playSound(); }}>サイコロを ふる <span>↗</span></button> : <button className="secondary full" onClick={() => send({ type: 'moveComplete' })}>アニメを とばす →</button>}<div className="gentle-note">♡ ゆっくりで いいよ。いっしょに かんがえよう。</div></div>}
          {(game.phase === 'question' || game.phase === 'feedback') && question && <div className="question-scene"><div className="question-meta"><span>{question.subject === 'math' ? 'さんすう' : 'こくご'}</span><small>{question.grade}年 · {question.unit}</small></div><h2 className="question-prompt" ref={focusRef} tabIndex={-1}>{question.prompt}</h2>{speechOn && game.phase === 'question' && <button className="text-button speak-button" onClick={speak}>♪ もんだいを きく</button>}<div className="choices">{question.choices.map((choice, index) => <button key={question.id + index} className={`choice ${game.phase === 'feedback' && index === question.answer ? 'correct' : ''} ${game.phase === 'question' && game.attempts > 0 && game.selectedChoice === index ? 'tried' : ''}`} disabled={game.phase !== 'question'} onClick={() => { stopSpeech(); send({ type: 'answer', choice: index }); if (index === question.answer) playSound(); }}><span className="choice-letter">{['ア', 'イ', 'ウ', 'エ'][index]}</span><span>{choice}</span>{game.phase === 'feedback' && index === question.answer && <span className="correct-mark">✓</span>}</button>)}</div>
            {game.phase === 'question' ? <><div className="feedback-space" aria-live="polite">{game.attempts > 0 && <p className="retry-note">もういちど かんがえてみよう。<br/>まちがえても もどらないよ。</p>}{game.hintUsed && <div className="hint-box"><strong>ひらめきの ヒント</strong><p>{question.hint}</p></div>}{game.helpUsed && <div className="help-box">なかまや おうちの人と そうだんしよう。<br/>ひとりなら ヒントを つかってね。<br/><strong>さいごは じぶんで えらんでみよう！</strong></div>}{exchangeNotice && <p>{exchangeNotice}</p>}</div><div className="support-buttons"><button className="secondary" onClick={() => send({ type: 'hint' })}>✦ ヒント</button><button className="secondary" onClick={() => send({ type: 'help' })}>♡ たすけて</button></div><button className="text-button exchange" onClick={() => send({ type: 'exchange' })}>↻ まだ ならっていない · もんだいを かえる</button>{game.attempts >= 2 && <button className="text-button" onClick={() => send({ type: 'reveal' })}>こたえと せつめいを みる →</button>}</> : <div className="answer-feedback" aria-live="polite"><h3>{game.feedback === 'correct' ? '✦ できたね！' : '✦ いっしょに おぼえよう！'}</h3><p>{question.explanation}</p><button className="primary full" onClick={() => send({ type: 'continue' })}>おはなしへ すすむ →</button></div>}
          </div>}
          {game.phase === 'event' && <div className="event-scene"><div className="event-picture"><RescueAnimal kind={game.turnsCompleted >= 12 ? 2 : game.turnsCompleted >= 8 ? 1 : 0} size={116}/><span>✦</span></div><p className="eyebrow">{game.turnsCompleted % 4 === 0 ? 'なかまが みつかった！' : 'もりの ちいさな できごと'}</p><h2 ref={focusRef} tabIndex={-1}>{game.turnsCompleted === 4 ? 'りすさんの はしわたし' : game.turnsCompleted === 8 ? 'ふくろうさんの おとしもの' : game.turnsCompleted === 12 ? 'みんなで むらへ！' : ['ことりの みちあんない', 'きのみを おすそわけ', 'はっぱの おてがみ'][game.turnsCompleted % 3]}</h2><p className="event-story">{game.turnsCompleted === 4 ? 'こわれた はしを みんなで なおしたよ。りすさんも ワゴンに のって、しゅっぱつ！' : game.turnsCompleted === 8 ? 'なくした かごを みつけたよ。「ありがとう！」ふくろうさんも むらへ いっしょに いこう。' : game.turnsCompleted === 12 ? 'まいごの はりねずみさんを むらへ おくったよ。3びきの なかまが にっこり。みんなの 力で たどりついたね！' : ['ことりが「こっちだよ！」と うたっているよ。ワゴンは のんびり すすんでいく。', 'みちばたの きのみを みんなで わけたよ。ひとやすみしたら、つぎの なかまの ばん。', 'はっぱに「おうえんしているよ」の もじ。みんなの ぼうけんは まだまだ つづく！'][game.turnsCompleted % 3]}</p>{[4, 8].includes(game.turnsCompleted) ? <><p className="route-label">どちらの みちへ いこう？<small>どちらも おなじ ながさだよ。</small></p><div className="route-buttons"><button className="secondary" onClick={() => send({ type: 'next', route: 'forest' })}>♧ もりの みち</button><button className="secondary" onClick={() => send({ type: 'next', route: 'river' })}>≈ かわの みち</button></div></> : <button className="primary full" onClick={() => send({ type: 'next' })}>{game.turnsCompleted === 12 ? 'みんなで ゴール！' : game.players.length === 1 ? 'つぎの ぼうけんへ →' : 'つぎの なかまへ →'}</button>}</div>}
          {game.phase === 'goal' && <div className="goal-scene"><div className="celebration" aria-hidden="true">✦ ⚑ ✦</div><p className="eyebrow">ぼうけん だいせいこう</p><h2 ref={focusRef} tabIndex={-1}>みんなで、<br/>たどりついたね！</h2><p>3びきの なかまを たすけたよ。<br/>かんがえる 力を あわせて、<br/>12この まなびを みつけたね。</p><div className="goal-party">{game.players.map((p, i) => <div key={p.id}><Animal kind={p.character} size={58}/><small>{i + 1}人め</small><strong>{game.completedByPlayer[i]}もん</strong></div>)}</div><button className="primary full" onClick={() => { updateGame(createGame(game.players, questions)); setNotice(''); }}>おなじ なかまで もういちど ↻</button><button className="text-button" onClick={restart}>なかまを えらびなおす →</button></div>}
        </section></div>
        <section className="team-strip" aria-label="冒険の仲間">{game.players.map((p, index) => <div className={`team-member ${game.turnIndex === index && game.phase !== 'goal' ? 'active' : ''}`} key={p.id}><Animal kind={p.character} size={54}/><div><small>{index + 1}人め · {p.grade}年</small><strong>{names[p.character]}</strong></div><span>{game.turnIndex === index && game.phase !== 'goal' ? 'いまの ばん' : `${game.completedByPlayer[index]}もん おわり`}</span></div>)}</section>
        <div className="save-strip"><p>すこし おやすみ？ この たんまつに つづきを のこせるよ。</p><button className="secondary" onClick={save}>ここまでを ほぞん</button></div>
      </>}
      {notice && <div className="notice" role="status">{notice}<button aria-label="おしらせを閉じる" onClick={() => setNotice('')}>×</button></div>}
    </main>
    <footer><span>まなびの冒険すごろく</span><span>こくごと さんすうで、ちいさな 一歩。</span><a href="https://github.com/metaborin/manabi-sugoroku" target="_blank" rel="noreferrer">この ゲームについて ↗</a></footer>
    {modalOpen && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={modalRef}>
      {confirmRestart ? <><h2 id="modal-title">はじめから あそぶ？</h2><p>いまの ぼうけんは おわるよ。<br/>ほぞんした つづきは のこるよ。</p><button className="primary full" onClick={() => setConfirmRestart(false)}>いまの ぼうけんに もどる</button><button className="secondary full" onClick={restart}>はじめから あそぶ</button></> : settings ? <><h2 id="modal-title">あそびやすく せってい</h2><label className="field-label">こうかおんの おおきさ<select value={volume} onChange={e => setVolume(Number(e.target.value))}><option value={0}>オフ（おとは でない）</option><option value={20}>ちいさい</option><option value={50}>ふつう</option></select></label><label className="check-label"><input type="checkbox" checked={speechOn} onChange={e => { setSpeechOn(e.target.checked); stopSpeech(); }}/>もんだいの よみあげボタンを つかう</label><p className="setting-help">たんまつの 日本語音声が ある ときだけ つかえます。よみかたを こたえる もんだいは よみません。</p><label className="check-label"><input type="checkbox" checked={shortMotion} onChange={e => setShortMotion(e.target.checked)}/>うごきを みじかくする</label><button className="primary full" onClick={() => setSettings(false)}>とじる</button>{saved && <button className="text-button" onClick={() => { try { localStorage.removeItem(saveKey); setSaved(null); setNotice('ほぞんした つづきを けしたよ。いまの ぼうけんは つづけられるよ。'); } catch { setNotice('ほぞんを けせなかったよ。'); } }}>ほぞんした つづきを けす</button>}</> : <><p className="eyebrow">ゆっくり ひとやすみ</p><h2 id="modal-title">ぼうけんは まっているよ。</h2><p>とじる ときは「ほぞん」を おしてね。<br/>この たんまつで つづきから あそべるよ。</p><button className="primary full" onClick={() => setPaused(false)}>ぼうけんを つづける →</button><button className="secondary full" onClick={save}>ここまでを ほぞん</button><button className="text-button" onClick={() => setConfirmRestart(true)}>はじめから あそぶ</button>{notice && <p role="status">{notice}</p>}</>}
    </div></div>}
  </div>;
}
export default App;
