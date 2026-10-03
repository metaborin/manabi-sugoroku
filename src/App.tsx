import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Grade, Player } from './types';
import { questions } from './questions';
import { createGame, reducer, getQuestion, restoreGame, checkpointPositions } from './engine';
import type { GameAction, GameState } from './engine';
import { Animal, Board, RescueAnimal } from './Art';
import { LearningSupport, AnswerExplanation } from './LearningSupport';
import { SaveSummary } from './SaveSummary';
import { useDialogFocus } from './useDialogFocus';
import { RescueEvent } from './AdventureEvents';
import { chapters, chapterIndex, encounter, routeChoices } from './adventure';
import { Dice } from './Dice';
import { JourneyRecap } from './JourneyRecap';
import { useJourneyMotion } from './useJourneyMotion';

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
  const [confirmErase, setConfirmErase] = useState(false);
  const [settings, setSettings] = useState(false);
  const [speechOn, setSpeechOn] = useState(false);
  const [volume, setVolume] = useState(0);
  const [shortMotion, setShortMotion] = useState(false);
  const [systemReduced, setSystemReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hidden, setHidden] = useState(() => document.hidden);
  const [notice, setNotice] = useState('');
  const [exchangeNotice, setExchangeNotice] = useState('');
  const [supportRequest, setSupportRequest] = useState(0);
  const rescueLock = useRef(false);
  const focusRef = useRef<HTMLHeadingElement>(null);
  const playPanelRef = useRef<HTMLElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const instructionModalWasOpen = useRef(false);
  const supportModalWasOpen = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const modalView = confirmErase ? 'erase' : confirmRestart ? 'restart' : settings ? 'settings' : paused ? 'pause' : null;
  const modalOpen = modalView !== null;
  const unsaved = game !== null && game !== saved;
  const reducedMotion = shortMotion || systemReduced;
  const motionSuspended = modalOpen || hidden;
  const motion = useJourneyMotion(game, gameRef, setGame, reducedMotion, motionSuspended);
  const current = game ? game.players[game.turnIndex] : null;
  const question = game ? getQuestion(game, questions) : null;
  const chapter = game ? chapterIndex(game) : 0;
  const checkpoints = game ? checkpointPositions(game) : [8, 16, 24];
  const visualPosition = game ? game.position + (game.phase === 'moving' ? motion.step : 0) : 0;
  const story = game ? encounter(game) : null;
  const currentRoute = game?.routes[chapter - 1] ?? 'forest';
  const isRescue = game?.phase === 'event' && game.turnsCompleted % 4 === 0;
  const nextPlayerIndex = game ? (game.turnIndex + 1) % game.players.length : 0;
  const personalTurn = game ? Math.min(game.totalTurns / game.players.length, game.completedByPlayer[game.turnIndex] + (game.phase === 'event' ? 0 : 1)) : 0;

  useDialogFocus(modalView, modalRef, () => {
    if (confirmErase) setConfirmErase(false);
    else if (confirmRestart) setConfirmRestart(false);
    else { setSettings(false); setPaused(false); }
  });

  function updateGame(next: GameState | null) { gameRef.current = next; setGame(next); }
  function send(action: Omit<GameAction, 'token'> | { type: 'answer'; choice: number } | { type: 'rescue'; step: number } | { type: 'next'; route?: 'forest' | 'river' }) {
    if (!game) return;
    const next = reducer(gameRef.current ?? game, { ...action, token: game.token } as GameAction);
    if (action.type === 'exchange') setExchangeNotice(next === game ? 'この たんげんの ほかの もんだいは ないよ。ヒントや こたえを つかってね。' : 'もんだいを かえたよ。あわてず やってみよう。');
    else if (action.type === 'roll' || action.type === 'next') setExchangeNotice('');
    updateGame(next);
  }
  function rescue(step: number) {
    if (rescueLock.current) return;
    rescueLock.current = true;
    send({ type: 'rescue', step });
    playSound();
    window.setTimeout(() => { rescueLock.current = false; }, 280);
  }
  function stopSpeech() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch { /* Optional device audio must never interrupt a turn. */ } }
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
    try {
      const voice = speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith('ja'));
      if (!voice) { setNotice('この たんまつに 日本語の よみあげが ないよ。もじで つづけよう。'); return; }
      stopSpeech();
      const utterance = new SpeechSynthesisUtterance(question.speech); utterance.voice = voice; utterance.lang = 'ja-JP'; utterance.rate = 0.85;
      utterance.onerror = () => setNotice('よみあげが できなかったよ。もじで つづけられるよ。');
      speechSynthesis.speak(utterance);
    } catch { setNotice('よみあげが できなかったよ。もじで つづけよう。'); }
  }
  function start() {
    const configured = players.slice(0, count).map(p => ({ ...p, units: p.units.length ? p.units : unitsFor(p) }));
    updateGame(createGame(configured, questions)); setNotice('');
    history.pushState({ adventure: true }, '', location.href);
  }
  function keepParty(party: Player[]) {
    setCount(party.length);
    setPlayers(initialPlayers.map((fallback, index) => party[index] ? { ...party[index], units: [...party[index].units] } : { ...fallback, units: [] }));
  }
  function resumeSaved() {
    if (!saved) return;
    keepParty(saved.players); updateGame(saved); setExchangeNotice(''); setNotice('');
    history.pushState({ adventure: true }, '', location.href);
  }
  function save() {
    const snapshot = gameRef.current;
    if (!snapshot) return;
    try { localStorage.setItem(saveKey, JSON.stringify(snapshot)); setSaved(snapshot); setNotice('ここまでを この たんまつに ほぞんしたよ。つぎは「つづきから」で あそべるよ。'); }
    catch { setNotice('この たんまつでは ほぞんできなかったよ。ページを とじずに つづけてね。'); }
  }
  function eraseSaved() {
    try { localStorage.removeItem(saveKey); setSaved(null); setConfirmErase(false); setNotice('ほぞんした つづきを けしたよ。いまの ぼうけんは つづけられるよ。'); }
    catch { setNotice('ほぞんを けせなかったよ。'); }
  }
  function restart() {
    if (gameRef.current) keepParty(gameRef.current.players);
    stopSpeech(); updateGame(null); setConfirmRestart(false); setConfirmErase(false); setPaused(false); setSettings(false); setNotice(''); setExchangeNotice('');
    requestAnimationFrame(() => { const title = document.getElementById('party-title'); title?.focus({ preventScroll: true }); title?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
  }
  function chooseAnswer() {
    const choice = playPanelRef.current?.querySelector<HTMLElement>('.choice:not(:disabled)');
    choice?.focus({ preventScroll: true }); choice?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  function showSupport(type: 'hint' | 'help') { send({ type }); setSupportRequest(value => value + 1); }
  function editPlayer(index: number, patch: Partial<Player>) { setPlayers(list => list.map((p, i) => i === index ? { ...p, ...patch } : p)); }

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const preference = () => setSystemReduced(media.matches);
    const visibility = () => { setHidden(document.hidden); if (document.hidden) stopSpeech(); };
    media.addEventListener('change', preference);
    document.addEventListener('visibilitychange', visibility);
    return () => { media.removeEventListener('change', preference); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useEffect(() => {
    stopSpeech();
    const justClosed = instructionModalWasOpen.current && !modalOpen;
    instructionModalWasOpen.current = modalOpen;
    if (justClosed) return; // The dialog hook restores its opener without moving the page.
    if (game && game.phase !== 'moving' && !modalOpen) {
      const panel = playPanelRef.current;
      if (game.phase === 'goal') {
        focusRef.current?.focus({ preventScroll: true });
        panel?.scrollIntoView({ block: 'start', behavior: 'instant' });
        return;
      }
      if (game.phase === 'feedback') {
        const feedback = panel?.querySelector<HTMLElement>('.answer-feedback');
        feedback?.querySelector<HTMLElement>('h3')?.focus({ preventScroll: true });
        feedback?.scrollIntoView({ block: 'start', behavior: 'instant' });
        return;
      }
      if (!(game.phase === 'event' && game.rescueProgress > 0 && game.rescueProgress < 3)) {
        focusRef.current?.focus({ preventScroll: true });
      }
      const action = panel?.querySelector<HTMLElement>('.rescue-action, .route-card, .primary, .choice');
      if (panel && action && (action.getBoundingClientRect().bottom > innerHeight - 18 || panel.getBoundingClientRect().top < -10)) {
        panel.scrollIntoView({ block: 'start', behavior: 'instant' });
        if (action.getBoundingClientRect().bottom > innerHeight - 18) {
          action.scrollIntoView({ block: 'end', behavior: 'instant' });
          window.scrollBy({ top: 18, behavior: 'instant' });
        }
      }
    }
  }, [game?.phase, game?.turnIndex, game?.rescueProgress, modalOpen]); // Keep the active instruction and action visible.

  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (gameRef.current && gameRef.current.phase !== 'goal') { event.preventDefault(); event.returnValue = ''; } };
    const back = () => { if (gameRef.current) { history.pushState({ adventure: true }, '', location.href); setPaused(true); } };
    window.addEventListener('beforeunload', unload); window.addEventListener('popstate', back);
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener('popstate', back); };
  }, []);

  useEffect(() => {
    const justClosed = supportModalWasOpen.current && !modalOpen;
    supportModalWasOpen.current = modalOpen;
    if (justClosed) return;
    if (game?.phase !== 'question' || modalOpen || !(game.hintUsed || game.helpUsed)) return;
    const heading = playPanelRef.current?.querySelector<HTMLElement>('[data-testid="learning-support"]');
    heading?.focus({ preventScroll: true }); heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [game?.phase, game?.questionId, game?.hintUsed, game?.helpUsed, game?.attempts, supportRequest, modalOpen]);

  return <div className={`app ${reducedMotion ? 'short-motion' : ''} ${motionSuspended ? 'motion-paused' : ''}`}>
    <header className="site-header" inert={modalOpen}><a className="brand" href="#" onClick={e => { e.preventDefault(); if (game) setPaused(true); }} aria-label="まなびの冒険すごろく ホーム"><span className="brand-icon">✦</span><span>まなびの<span className="brand-small">冒険すごろく</span></span></a><div className="header-actions"><span className="co-op-label">みんなで ちからを あわせよう</span><button className="icon-button" onClick={() => setSettings(true)}>⚙ <span>せってい</span></button>{game && <button className="icon-button" onClick={() => setPaused(true)}>Ⅱ <span>ひとやすみ</span></button>}</div></header>
    <main inert={modalOpen}>
      {!game ? <>
        <section className="welcome">
          <div className="welcome-copy"><p className="eyebrow"><span/> 1〜4人で あそぶ おべんきょうの 冒険</p><h1>ひとりでも、<br/>みんなでも。<br/><span>まなびが 冒険になる。</span></h1><p className="intro">どうぶつの なかまたちと、ふしぎな もりへ。<br/>こくごと さんすうの 力で、<br/>こまっている なかまを たすけに いこう！</p><div className="welcome-facts"><span>✦ 小学1〜6年</span><span>◷ 10分くらい</span><span>♡ まちがえても だいじょうぶ</span></div><a className="primary setup-jump" href="#party">なかまを えらぼう <span>→</span></a>{saved && <div className="resume-card"><SaveSummary saved={saved}/><button className="secondary resume-button full" onClick={resumeSaved}>ほぞんした つづきから →</button></div>}</div>
          <div className="welcome-map"><div className="map-label">ぼうけんの ちず <span>こもれびの もり</span></div><Board position={0} totalDistance={24} rescued={0} route="forest" characters={players.slice(0, count).map(p => p.character)}/><div className="map-caption"><span>START はじまりの おか</span><span>GOAL なかまの むら ⚑</span></div></div>
        </section>
        <section className="party-section" id="party"><div className="section-heading"><div><p className="eyebrow">ぼうけんの じゅんび</p><h2 id="party-title" tabIndex={-1}>きょうの なかまは？</h2></div><div className="count-selector" role="group" aria-label="あそぶ人数">{[1, 2, 3, 4].map(n => <button key={n} aria-pressed={count === n} onClick={() => setCount(n)}>{n}人</button>)}</div></div>
          <div className={`player-setup-grid count-${count}`}>{players.slice(0, count).map((player, index) => <article className="player-setup" key={player.id} aria-label={`${index + 1}人めの設定`}><div className="player-setup-title"><span className="number-badge">{index + 1}</span><strong>{index + 1}人めの なかま</strong></div><div className="animal-options" role="group" aria-label={`${index + 1}人めのキャラクター`}>{names.map((name, kind) => <button key={kind} className={player.character === kind ? 'chosen' : ''} aria-pressed={player.character === kind} aria-label={name} onClick={() => editPlayer(index, { character: kind })}><Animal kind={kind} size={52}/><span>{name}</span></button>)}</div><label className="field-label">がくねん<select aria-label={`${index + 1}人めの学年`} value={player.grade} onChange={e => editPlayer(index, { grade: Number(e.target.value) as Grade, review: false, units: [] })}>{[1, 2, 3, 4, 5, 6].map(grade => <option value={grade} key={grade}>小学 {grade} 年</option>)}</select></label>{player.grade > 1 && <label className="check-label"><input type="checkbox" checked={player.review} onChange={e => editPlayer(index, { review: e.target.checked, units: [] })}/>ひとつ前の がくねんを ふくしゅう</label>}<details className="unit-picker"><summary>ならった たんげんを えらぶ</summary><p>{effectiveGrade(player)}年の いちぶの たんげんだよ。<br/>まだの もんだいは、あとでも かえられるよ。</p>{unitsFor(player).map(unit => <label className="check-label" key={unit}><input type="checkbox" checked={player.units.length === 0 || player.units.includes(unit)} onChange={e => { const chosen = player.units.length ? player.units : unitsFor(player); const next = e.target.checked ? [...chosen, unit] : chosen.filter(u => u !== unit); if (!next.length) { setNotice('たんげんは ひとつ いじょう えらんでね。'); return; } editPlayer(index, { units: next }); }}/>{unit}</label>)}</details></article>)}</div>
          <div className="start-strip"><p>ひとつの ワゴンで、3つの おてつだいへ。みんなで みちを えらぼう。<br/><small>サイコロ → もんだい → おてつだい。12かいの まなびで ゴール。じかんせいげんは ないよ。</small></p><button className="primary" onClick={start}>ぼうけんに しゅっぱつ <span>→</span></button></div>
        </section><aside className="adult-note"><strong>おうちの方へ</strong><p>国語・算数の一部単元を収録した初版です。各学年20問、全120問。学年の全範囲を網羅するものではありません。本名・アカウントは不要です。ゲーム中にデータを外部送信せず、「ほぞん」を押したときだけ、このブラウザに進行状況を保存します。</p></aside>
      </> : <>
        <section className="adventure-heading"><div><p className="eyebrow">みんなで つくる、ひとつの 冒険</p><h1>こもれびの もりの おとしもの</h1></div><div className="mission"><span className="mission-icon">⚑</span><div><small>なかまを たすけよう</small><strong>{game.rescues} <span>/ 3 びき</span></strong></div></div></section>
        <div className="adventure-layout"><div className="journey-column"><section className="board-panel" aria-label="冒険のマップ"><div className="board-top"><span>第{chapter + 1}話 · {chapters[chapter].title}</span><span>{game.turnsCompleted} / {game.totalTurns} まなび</span></div><Board position={visualPosition} totalDistance={game.goalPosition} checkpoints={checkpoints} routes={game.routes} rescued={game.rescues} rescueProgress={game.rescueProgress} route={currentRoute} moving={motion.stage === 'stepping' && !motionSuspended} arrived={motion.stage === 'arrived'} travel={game.phase === 'moving' && motion.stage !== 'rolling' ? { start: game.position, dice: game.dice!, step: motion.step } : undefined} characters={game.players.map(p => p.character)}/><div className="board-bottom"><span>{game.phase === 'goal' ? 'みんなの ちからで、むらに とうちゃく！' : game.position >= checkpoints[chapter] ? 'なかまが まっているよ！' : 'つぎの なかままで あと ' + (checkpoints[chapter] - visualPosition) + 'マス'}</span><span>{visualPosition} / {game.goalPosition} マス</span></div><div className="progress-track" role="progressbar" aria-label="冒険の進みぐあい" aria-valuemin={0} aria-valuemax={game.totalTurns} aria-valuenow={game.turnsCompleted}><span style={{ width: game.turnsCompleted / game.totalTurns * 100 + '%' }}/></div></section>
          <ol className="journey-chapters" aria-label="3つのおてつだい">{chapters.map((item, index) => <li key={item.friend} className={game.rescues > index ? 'chapter-done' : chapter === index ? 'chapter-current' : ''}><RescueAnimal kind={index} size={46}/><div><small>{game.rescues > index ? '✓ たすけた！' : chapter === index ? 'いまの おてつだい' : 'つぎの おてつだい'}</small><strong>{item.friend}</strong><span>{index === 0 ? 'はしを なおそう' : index === 1 ? 'かごを とどけよう' : 'あかりを ともそう'}</span></div></li>)}</ol>
          {game.phase !== 'goal' && <div className="chapter-preparation"><div><strong>{isRescue ? 'おてつだいの じゅんびが できた！' : chapters[chapter].mission}</strong><small>{isRescue ? 'そうだんして、おどうぐを おしてみよう。' : '4つの まなびを あつめると、おどうぐが とどくよ。'}</small></div><div className="learning-lights" aria-label={Math.min(4, Math.max(0, game.turnsCompleted - chapter * 4)) + ' / 4 まなび'}>{[0,1,2,3].map(light => <span key={light} className={game.turnsCompleted - chapter * 4 > light ? 'lit' : ''}>{game.turnsCompleted - chapter * 4 > light ? '✦' : '·'}</span>)}</div></div>}
        </div>
        <section className="play-panel" aria-label="いまの手番" ref={playPanelRef}>
          {game.phase !== 'goal' && current && <div className="turn-banner"><Animal kind={current.character} size={62}/><div><small>{game.turnIndex + 1}人め ・ 小学{current.grade}年{current.review ? '（ふくしゅう）' : ''}</small><strong>{game.turnIndex + 1}人め · {names[current.character]}の ばん</strong><span className="turn-participation" data-testid="turn-participation">じぶんの {personalTurn} / {game.totalTurns / game.players.length}もんめ</span></div><span className="turn-star">✦</span></div>}
          {game.phase !== 'goal' && <ol className="turn-steps" aria-label="つぎにすること">{['サイコロ', 'もんだい', isRescue ? 'おてつだい' : 'できごと'].map((label, index) => <li key={index} aria-current={(game.phase === 'roll' || game.phase === 'moving' ? 0 : game.phase === 'question' || game.phase === 'feedback' ? 1 : 2) === index ? 'step' : undefined}><b>{index + 1}</b>{label}</li>)}</ol>}
          {(game.phase === 'roll' || game.phase === 'moving') && <div className="roll-scene" data-motion-stage={motion.stage}>
            <p className="eyebrow">{motion.stage === 'rolling' ? 'サイコロが ころころ…' : motion.stage === 'arrived' ? 'ぴたっ！ ついたよ' : 'つぎは どこへ いこう？'}</p>
            <h2 ref={focusRef} tabIndex={-1}>{game.phase === 'roll' ? 'サイコロを ふろう' : motion.stage === 'rolling' ? 'なにが でるかな？' : motion.stage === 'arrived' ? 'とうちゃく！' : game.dice + 'マス すすむよ！'}</h2>
            <Dice face={motion.face} settled={game.phase === 'moving' && motion.stage !== 'rolling'} rolling={motion.stage === 'rolling'}/>
            <div className="roll-progress" data-step={motion.step} data-total={game.dice ?? 0} aria-live="polite" aria-atomic="true">
              <strong>{game.phase === 'roll' ? 'でる めは 1・2・3。' : motion.stage === 'rolling' ? 'ころがって いるよ' : motion.stage === 'settled' ? game.dice + ' の め！ しゅっぱつ！' : motion.stage === 'arrived' ? game.dice + 'マス すすんだよ' : motion.step + ' / ' + game.dice + 'マス すすんだよ'}</strong>
              {game.phase === 'moving' && motion.stage !== 'rolling' ? <ol className="move-count" aria-label="すすむマスを かぞえよう">{Array.from({ length: game.dice! }, (_, i) => <li key={i} className={motion.step > i ? 'count-reached' : ''} aria-current={motion.step === i + 1 ? 'step' : undefined}><b>{i + 1}</b><span>{motion.step > i ? '✓' : '・'}</span></li>)}</ol> : <p>つぎの なかまを めざそう！</p>}
            </div>
            <button className="primary full" disabled={game.phase !== 'roll'} onClick={() => { send({ type: 'roll' }); playSound(); }}>{game.phase === 'roll' ? <>サイコロを ふる <span>↗</span></> : motion.stage === 'rolling' ? 'サイコロを ふっているよ' : 'ワゴンを みまもろう'}</button>
            <div className="motion-footer">{game.phase === 'moving' ? <button className="text-button full" data-testid="skip-motion" onClick={event => { if (event.detail <= 1) send({ type: 'moveComplete' }); }}>アニメを とばす →</button> : <p className="gentle-note">♡ ゆっくりで いいよ。いっしょに かんがえよう。</p>}</div>
          </div>}
          {(game.phase === 'question' || game.phase === 'feedback') && question && <div className="question-scene"><div className="last-roll" data-dice={game.dice} data-start={game.position - (game.dice ?? 0)} data-end={game.position}><span aria-hidden="true">{['','⚀','⚁','⚂'][game.dice ?? 1]}</span><strong>{game.dice} の め · {game.dice}マス すすんだよ</strong><span>✓ とうちゃく</span></div><div className="question-meta"><span>{question.subject === 'math' ? 'さんすう' : 'こくご'}</span><small>{question.grade}年 · {question.unit}</small></div><h2 className="question-prompt" ref={focusRef} tabIndex={-1}>{question.prompt}</h2>{speechOn && game.phase === 'question' && <button className="text-button speak-button" onClick={speak}>♪ もんだいを きく</button>}{game.phase === 'question' && <LearningSupport question={question} attempts={game.attempts} hintUsed={game.hintUsed} helpUsed={game.helpUsed} exchangeNotice={exchangeNotice} onChoose={chooseAnswer}/>}<div className="choices">{question.choices.map((choice, index) => <button key={question.id + index} className={`choice ${game.phase === 'feedback' && index === question.answer ? 'correct' : ''} ${game.phase === 'question' && game.attempts > 0 && game.selectedChoice === index ? 'tried' : ''}`} disabled={game.phase !== 'question'} onClick={event => { if (event.detail > 1) return; stopSpeech(); send({ type: 'answer', choice: index }); if (index === question.answer) playSound(); }}><span className="choice-letter">{['ア', 'イ', 'ウ', 'エ'][index]}</span><span>{choice}</span>{game.phase === 'feedback' && index === question.answer && <span className="correct-mark">✓</span>}</button>)}</div>
            {game.phase === 'question' ? <><div className="support-buttons"><button className="secondary" onClick={() => showSupport('hint')}>✦ ヒント</button><button className="secondary" onClick={() => showSupport('help')}>♡ たすけて</button></div><button className="text-button exchange" onClick={() => send({ type: 'exchange' })}>↻ まだ ならっていない · もんだいを かえる</button>{game.attempts >= 2 && <button className="text-button" onClick={() => send({ type: 'reveal' })}>こたえと せつめいを みる →</button>}</> : <div className="answer-feedback" aria-live="polite"><h3 tabIndex={-1}>{game.feedback === 'correct' ? '✦ できたね！' : '✦ いっしょに おぼえよう！'}</h3><AnswerExplanation question={question}/><p className="learning-earned">✦ {game.turnIndex + 1}人めの {names[current!.character]}が、まなびの あかりを ひとつ とどけた！</p><button className="primary full" data-testid="continue-answer" onClick={() => send({ type: 'continue' })}>{game.turnsCompleted % 4 === 3 ? 'なかまを たすけに いく →' : 'もりの できごとへ →'}</button></div>}
          </div>}
          {game.phase === 'event' && <div className={'event-scene ' + (isRescue ? 'rescue-panel' : '')}>
            <p className="eyebrow">{isRescue ? game.rescueProgress === 3 ? 'おてつだい だいせいこう！' : 'みんなの おてつだい' : 'えらんだ みちの ものがたり'}</p>
            <h2 ref={focusRef} tabIndex={-1}>{isRescue ? chapters[chapter].title : story?.title}</h2>
            {isRescue ? <RescueEvent chapter={chapter + 1} progress={game.rescueProgress} onStep={rescue} route={currentRoute}/> : <><div className="encounter-illustration" aria-hidden="true"><RescueAnimal kind={chapter} size={92}/><span>{story?.symbol}</span></div><p className="event-story">{story?.story}</p><p className="learning-earned">✦ おてつだいまで あと {4 - game.turnsCompleted % 4} まなび</p></>}
            {(!isRescue || game.rescueProgress === 3) && <>
              {isRescue && game.turnsCompleted < 12 ? <><p className="route-label">つぎは どちらの みちへ？<small>みちと おてつだいが かわるよ。マスの かずは おなじ。</small></p><div className="route-buttons route-cards">{routeChoices[chapter].map(choice => <button className={'route-card route-' + choice.route} key={choice.route} data-route={choice.route} onClick={() => send({ type: 'next', route: choice.route })}><span className="route-symbol" aria-hidden="true">{choice.symbol}</span><strong>{choice.title}</strong><span>{choice.detail}</span><small>{choice.action}</small><b aria-hidden="true">→</b></button>)}</div></> : <button className="primary full" data-testid="next-turn" onClick={() => send({ type: 'next' })}>{game.turnsCompleted === 12 ? 'みんなで ゴール！' : game.players.length === 1 ? 'つぎの ぼうけんへ →' : 'つぎの なかまへ →'}</button>}
              {game.turnsCompleted < 12 && <div className="handoff-note"><Animal kind={game.players[nextPlayerIndex].character} size={42}/><span>つぎは {nextPlayerIndex + 1}人めの <strong>{names[game.players[nextPlayerIndex].character]}</strong>だよ。</span></div>}
            </>}
          </div>}
          {game.phase === 'goal' && <div className="goal-scene"><div className="goal-confetti" aria-hidden="true">{Array.from({length:12},(_,index) => <i key={index} style={{'--i':index} as CSSProperties}/>)}</div><div className="celebration" aria-hidden="true">✦ ⚑ ✦</div><p className="eyebrow">ぼうけん だいせいこう</p><h2 ref={focusRef} tabIndex={-1}>みんなで、<br/>たどりついたね！</h2><p>3びきの なかまを たすけたよ。<br/>かんがえる 力を あわせて、<br/>12この まなびを みつけたね。</p><JourneyRecap game={game}/><button className="primary full" onClick={() => { updateGame(createGame(game.players, questions)); setNotice(''); }}>おなじ なかまで もういちど ↻</button><button className="text-button" onClick={restart}>なかまを えらびなおす →</button></div>}
        </section></div>
        <section className="team-strip" aria-label="冒険の仲間">{game.players.map((p, index) => <div className={`team-member ${game.turnIndex === index && game.phase !== 'goal' ? 'active' : ''}`} key={p.id}><Animal kind={p.character} size={54}/><div><small>{index + 1}人め · {p.grade}年</small><strong>{names[p.character]}</strong></div><span>{game.turnIndex === index && game.phase !== 'goal' ? `いまの ばん · ${game.completedByPlayer[index]}もん おわり` : `${game.completedByPlayer[index]}もん おわり`}</span></div>)}</section>
        <div className="save-strip"><p data-testid="save-status" data-state={unsaved ? 'unsaved' : 'saved'}>{unsaved ? 'いまの つづきは、まだ ほぞんしていないよ。' : '✓ いまの つづきを ほぞんしてあるよ。'}<small>とじる まえに、この たんまつへ のこせるよ。</small></p><button className="secondary" onClick={save}>ここまでを ほぞん</button></div>
      </>}
      {notice && <div className="notice" role="status">{notice}<button aria-label="おしらせを閉じる" onClick={() => setNotice('')}>×</button></div>}
    </main>
    <footer inert={modalOpen}><span>まなびの冒険すごろく</span><span>こくごと さんすうで、ちいさな 一歩。</span><a href="https://github.com/metaborin/manabi-sugoroku" target="_blank" rel="noreferrer">この ゲームについて ↗</a></footer>
    {modalOpen && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={modalRef}>
      {confirmErase ? <><h2 id="modal-title">ほぞんした つづきを けす？</h2><p>ほぞんした ぼうけんには、もどれなくなるよ。<br/>いま あそんでいる ぼうけんは つづくよ。</p>{saved && <SaveSummary saved={saved} compact/>}<button className="primary full" data-dialog-initial-focus onClick={() => setConfirmErase(false)}>けさずに もどる</button><button className="secondary full" onClick={eraseSaved}>ほぞんを けす</button>{notice && <p role="status">{notice}</p>}</> : confirmRestart ? <><h2 id="modal-title">はじめから あそぶ？</h2><p>いまの ぼうけんは おわるよ。<br/>ほぞんした つづきは のこるよ。</p><button className="primary full" onClick={() => setConfirmRestart(false)}>いまの ぼうけんに もどる</button><button className="secondary full" onClick={restart}>はじめから あそぶ</button></> : settings ? <><h2 id="modal-title">あそびやすく せってい</h2><label className="field-label">こうかおんの おおきさ<select value={volume} onChange={e => setVolume(Number(e.target.value))}><option value={0}>オフ（おとは でない）</option><option value={20}>ちいさい</option><option value={50}>ふつう</option></select></label><label className="check-label"><input type="checkbox" checked={speechOn} onChange={e => { setSpeechOn(e.target.checked); stopSpeech(); }}/>もんだいの よみあげボタンを つかう</label><p className="setting-help">たんまつの 日本語音声が ある ときだけ つかえます。よみかたを こたえる もんだいは よみません。</p><label className="check-label"><input type="checkbox" checked={reducedMotion} disabled={systemReduced} onChange={e => setShortMotion(e.target.checked)}/>うごきを みじかくする</label><p className="setting-help">{systemReduced ? 'たんまつの「動きを減らす」に あわせています。' : 'サイコロの かいてんを へらし、はやく すすみます。'}</p><button className="primary full" onClick={() => setSettings(false)}>とじる</button>{saved && <button className="text-button" onClick={() => { setConfirmErase(true); setNotice(''); }}>ほぞんした つづきを けす</button>}</> : <><p className="eyebrow">ゆっくり ひとやすみ</p><h2 id="modal-title">ぼうけんは まっているよ。</h2><p>とじる ときは「ほぞん」を おしてね。<br/>この たんまつで つづきから あそべるよ。</p><p className="pause-save-status" data-testid="pause-save-status">{unsaved ? 'いまの つづきは、まだ ほぞんしていないよ。' : '✓ いまの つづきを ほぞんしてあるよ。'}</p>{saved && <SaveSummary saved={saved} compact/>}<button className="primary full" onClick={() => setPaused(false)}>ぼうけんを つづける →</button><button className="secondary full" onClick={save}>ここまでを ほぞん</button><button className="text-button" onClick={() => setConfirmRestart(true)}>はじめから あそぶ</button>{notice && <p role="status">{notice}</p>}</>}
    </div></div>}
  </div>;
}
export default App;
