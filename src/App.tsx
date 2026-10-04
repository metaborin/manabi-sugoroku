import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Player } from './types';
import { questions, legacyQuestions } from './questions';
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
import { WorldScenery, TitleCaravan } from './WorldScenery';
import { PartySetup } from './PartySetup';
import { useGameAudio } from './useGameAudio';

const names = ['こむぎ', 'みみ', 'くるみ', 'そら'];
const saveKey = 'manabi-sugoroku-save-v1';
const makePlayer = (i: number): Player => ({ id: i, character: i, grade: 1, review: false, units: [] });
const initialPlayers = [0, 1, 2, 3].map(makePlayer);
const effectiveGrade = (p: Player) => Math.max(1, p.grade - (p.review ? 1 : 0));
const unitsFor = (p: Player) => [...new Set(questions.filter(q => q.grade === effectiveGrade(p)).map(q => q.unit))];

function readSaved(): GameState | null {
  try { const value = localStorage.getItem(saveKey); return value ? restoreGame(JSON.parse(value), questions, [legacyQuestions]) : null; } catch { return null; }
}

function App() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [count, setCount] = useState(1);
  const [frontScene, setFrontScene] = useState<'title' | 'setup' | 'resume'>('title');
  const [information, setInformation] = useState(false);
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
  const audio = useGameAudio(volume);
  const heardMotion = useRef('');
  const modalView = information ? 'information' : confirmErase ? 'erase' : confirmRestart ? 'restart' : settings ? 'settings' : paused ? 'pause' : null;
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
    if (information) setInformation(false);
    else if (confirmErase) setConfirmErase(false);
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
    audio.play('rescue');
    window.setTimeout(() => { rescueLock.current = false; }, 280);
  }
  function stopSpeech() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch { /* Optional device audio must never interrupt a turn. */ } }
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
    audio.play('confirm'); updateGame(createGame(configured, questions)); setNotice(''); setExchangeNotice('');
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
    try {
      localStorage.removeItem(saveKey); setSaved(null); setConfirmErase(false);
      if (!gameRef.current && frontScene === 'resume') setFrontScene('title');
      setNotice('ほぞんした つづきを けしたよ。いまの ぼうけんは つづけられるよ。');
    }
    catch { setNotice('ほぞんを けせなかったよ。'); }
  }
  function restart() {
    if (gameRef.current) keepParty(gameRef.current.players);
    stopSpeech(); updateGame(null); setConfirmRestart(false); setConfirmErase(false); setPaused(false); setSettings(false); setNotice(''); setExchangeNotice('');
    setFrontScene('setup');
    requestAnimationFrame(() => { const title = document.getElementById('party-title'); title?.focus({ preventScroll: true }); title?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
  }
  function chooseAnswer() {
    const choice = playPanelRef.current?.querySelector<HTMLElement>('.choice:not(:disabled)');
    choice?.focus({ preventScroll: true }); choice?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  function showSupport(type: 'hint' | 'help') { send({ type }); setSupportRequest(value => value + 1); }
  function editPlayer(index: number, patch: Partial<Player>) { setPlayers(list => list.map((p, i) => i === index ? { ...p, ...patch } : p)); }

  useEffect(() => {
    if (!game) document.querySelector<HTMLElement>('[data-scene-heading]')?.focus({ preventScroll: true });
  }, [frontScene, game]);

  useEffect(() => {
    if (motionSuspended) audio.stop();
    const key = game?.phase === 'moving' ? `${game.token}:${motion.stage}:${motion.step}` : '';
    if (key === heardMotion.current) return;
    heardMotion.current = key;
    if (motionSuspended) return;
    if (motion.stage === 'stepping') audio.play('step');
    else if (motion.stage === 'arrived') audio.play('land');
  }, [game?.phase, game?.token, motion.stage, motion.step, motionSuspended, audio]);

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

  const scene = game?.phase ?? frontScene;
  const onMap = game?.phase === 'roll' || game?.phase === 'moving';
  return <div className={`app console-app ${reducedMotion ? 'short-motion' : ''} ${motionSuspended ? 'motion-paused' : ''}`}>
    <main className="game-shell" data-scene={scene} inert={modalOpen}>
      <WorldScenery variant={!game && frontScene === 'title' ? 'title' : !game ? 'camp' : 'adventure'}/>
      <header className={`game-hud ${game ? '' : 'front-hud'}`}>
        {game && current ? <>
          <div className="turn-banner"><Animal kind={current.character} size={54}/><div><small>{game.phase === 'goal' ? 'みんなの ぼうけんの きろく' : `${game.turnIndex + 1}人め ・ 小学${current.grade}年${current.review ? '（ふくしゅう）' : ''}`}</small><strong>{game.phase === 'goal' ? 'なかま みんなで ゴール！' : `${game.turnIndex + 1}人め · ${names[current.character]}の ばん`}</strong><span data-testid="turn-participation">{game.phase === 'goal' ? `${game.players.length}人で ${game.turnsCompleted}もん おわり` : `じぶんの ${personalTurn} / ${game.totalTurns / game.players.length}もんめ`}</span></div></div>
          <div className="quest-hud"><strong>第{chapter + 1}話 · {chapters[chapter].title}</strong><div className="quest-meter"><span className="mission">♥ {game.rescues} / 3 びき</span><span className="journey-position" data-position={visualPosition} data-total={game.goalPosition}>{visualPosition} / {game.goalPosition} マス</span><span className="progress-track" role="progressbar" aria-label="冒険の進みぐあい" aria-valuemin={0} aria-valuemax={game.totalTurns} aria-valuenow={game.turnsCompleted}><span style={{ width: game.turnsCompleted / game.totalTurns * 100 + '%' }}/></span></div></div>
        </> : <span className="edition-mark">こもれびの もりへ ようこそ</span>}
        <div className="hud-controls"><button className="hud-button" onClick={() => setSettings(true)}>⚙ <span>せってい</span></button>{game && <button className="hud-button" onClick={() => setPaused(true)}>Ⅱ <span>ひとやすみ</span></button>}</div>
      </header>

      {!game && frontScene === 'title' && <section className="title-scene scene-enter" aria-label="タイトル">
        <div className="title-copy"><p className="title-kicker">みんなで つくる、ひとつの 冒険</p><h1 data-scene-heading tabIndex={-1}><span>まなびの</span><strong>冒険すごろく</strong></h1><p className="title-episode">こもれびの もりの おとしもの</p>
          <div className="title-actions"><button className="primary title-start" data-testid="new-adventure" onClick={() => { audio.play('confirm'); setFrontScene('setup'); }}>はじめから あそぶ <span>▶</span></button>{saved && <button className="secondary title-continue" onClick={() => setFrontScene('resume')}>ほぞんした つづきから →</button>}</div>
          <p className="title-facts">1〜4人で ぼうけん · 小学1〜6年</p>
        </div><TitleCaravan className="title-heroes"/>
        <div className="title-bottom"><span>ひとつの ワゴンで、なかまを たすけに。</span><button className="text-button" onClick={() => setInformation(true)}>おうちの方へ</button></div>
      </section>}
      {!game && frontScene === 'setup' && <PartySetup players={players} count={count} onCount={setCount} onChange={editPlayer} onStart={start} onBack={() => setFrontScene('title')} onNotice={setNotice}/>}
      {!game && frontScene === 'resume' && saved && <section className="resume-scene scene-enter"><div className="travel-notebook"><p className="eyebrow">ぼうけんの きろく</p><h1 data-scene-heading tabIndex={-1}>この つづきから あそぼう</h1><SaveSummary saved={saved}/><button className="primary full" data-testid="resume-adventure" onClick={() => { audio.play('confirm'); resumeSaved(); }}>ぼうけんを さいかいする →</button><button className="text-button" onClick={() => setFrontScene('title')}>← タイトルへ もどる</button></div></section>}

      {game && <section className={`game-content play-panel scene-${game.phase}`} aria-label="いまの手番" ref={playPanelRef}>
        {onMap && <div className="map-adventure scene-enter">
          <div className="map-stage"><aside className="destination-sign"><span>つぎの おてつだい</span><RescueAnimal kind={chapter} size={88}/><strong>{chapters[chapter].friend}</strong><p>{chapters[chapter].mission}</p><div className="learning-lights" aria-label={Math.min(4, Math.max(0, game.turnsCompleted - chapter * 4)) + ' / 4 まなび'}>{[0,1,2,3].map(light => <span key={light} className={game.turnsCompleted - chapter * 4 > light ? 'lit' : ''}>{game.turnsCompleted - chapter * 4 > light ? '✦' : '·'}</span>)}</div></aside>
            <section className="board-panel" aria-label="冒険のマップ"><Board position={visualPosition} totalDistance={game.goalPosition} checkpoints={checkpoints} routes={game.routes} rescued={game.rescues} rescueProgress={game.rescueProgress} route={currentRoute} moving={motion.stage === 'stepping' && !motionSuspended} arrived={motion.stage === 'arrived'} travel={game.phase === 'moving' && motion.stage !== 'rolling' ? { start: game.position, dice: game.dice!, step: motion.step } : undefined} characters={game.players.map(p => p.character)}/><div className="board-bottom"><span>{game.position >= checkpoints[chapter] ? 'なかまが まっているよ！' : 'つぎの なかままで あと ' + (checkpoints[chapter] - visualPosition) + 'マス'}</span><span>{visualPosition} / {game.goalPosition} マス</span></div></section>
          </div>
          <div className="roll-scene command-deck" data-motion-stage={motion.stage}>
            <div className="command-character"><Animal kind={current!.character} size={80}/><div><p className="eyebrow">{game.turnIndex + 1}人めの なかまへ</p><h2 ref={focusRef} tabIndex={-1}>{game.phase === 'roll' ? 'サイコロを ふろう' : motion.stage === 'rolling' ? 'なにが でるかな？' : motion.stage === 'arrived' ? 'とうちゃく！' : game.dice + 'マス すすむよ！'}</h2></div></div>
            <Dice face={motion.face} settled={game.phase === 'moving' && motion.stage !== 'rolling'} rolling={motion.stage === 'rolling'}/>
            <div className="roll-progress" data-step={motion.step} data-total={game.dice ?? 0} aria-live="polite" aria-atomic="true"><strong>{game.phase === 'roll' ? 'でる めは 1・2・3' : motion.stage === 'rolling' ? 'ころころ…' : motion.stage === 'settled' ? game.dice + ' の め！' : motion.stage === 'arrived' ? game.dice + 'マス すすんだよ' : motion.step + ' / ' + game.dice + 'マス'}</strong>{game.phase === 'moving' && motion.stage !== 'rolling' && <ol className="move-count" aria-label="すすむマスを かぞえよう">{Array.from({ length: game.dice! }, (_, i) => <li key={i} className={motion.step > i ? 'count-reached' : ''} aria-current={motion.step === i + 1 ? 'step' : undefined}><b>{i + 1}</b><span>{motion.step > i ? '✓' : '・'}</span></li>)}</ol>}</div>
            <div className="command-action"><button className="primary" disabled={game.phase !== 'roll'} onClick={() => { send({ type: 'roll' }); audio.play('roll'); }}>{game.phase === 'roll' ? 'サイコロを ふる ▶' : motion.stage === 'rolling' ? 'ころころ…' : 'ワゴンを みまもろう'}</button>{game.phase === 'moving' && <button className="text-button" data-testid="skip-motion" onClick={event => { if (event.detail <= 1) send({ type: 'moveComplete' }); }}>アニメを とばす →</button>}</div>
          </div>
        </div>}

        {(game.phase === 'question' || game.phase === 'feedback') && question && <div className={`question-scene travel-notebook scene-enter ${game.phase === 'feedback' ? 'notebook-feedback' : ''}`}>
          <div className="notebook-top"><div className="question-meta"><span>{question.subject === 'math' ? 'さんすう' : 'こくご'}</span><small>{question.grade}年 · {question.unit}</small></div><div className="last-roll" data-dice={game.dice} data-start={game.position - (game.dice ?? 0)} data-end={game.position}><strong>{game.dice} の め · {game.dice}マス すすんだよ</strong><span>✓ とうちゃく</span></div></div>
          <h2 className="question-prompt" ref={focusRef} tabIndex={-1}>{question.prompt}</h2>{speechOn && game.phase === 'question' && <button className="text-button speak-button" onClick={speak}>♪ もんだいを きく</button>}
          {game.phase === 'question' ? <><div className={`question-workspace ${game.hintUsed || game.helpUsed || exchangeNotice ? 'has-support' : ''}`}>
            <div className="question-companion">{!game.hintUsed && !game.helpUsed && !exchangeNotice && <div className="thinking-friend"><Animal kind={current!.character} size={166}/><p>ゆっくり かんがえてね。<br/>まちがえても だいじょうぶ！</p></div>}<LearningSupport question={question} attempts={game.attempts} hintUsed={game.hintUsed} helpUsed={game.helpUsed} exchangeNotice={exchangeNotice} onChoose={chooseAnswer}/></div>
            <div className="choices">{question.choices.map((choice, index) => <button key={question.id + index} className={`choice ${game.attempts > 0 && game.selectedChoice === index ? 'tried' : ''}`} onClick={event => { if (event.detail > 1) return; stopSpeech(); send({ type: 'answer', choice: index }); if (index === question.answer) audio.play('learn'); }}><span className="choice-letter">{['ア', 'イ', 'ウ', 'エ'][index]}</span><span>{choice}</span><b aria-hidden="true">›</b></button>)}</div>
          </div><div className="notebook-tools"><div className="support-buttons"><button className="secondary" onClick={() => showSupport('hint')}>✦ ヒント</button><button className="secondary" onClick={() => showSupport('help')}>♡ たすけて</button></div><button className="text-button exchange" onClick={() => send({ type: 'exchange' })}>↻ まだ ならっていない · もんだいを かえる</button>{game.attempts >= 2 && <button className="text-button" onClick={() => send({ type: 'reveal' })}>こたえと せつめいを みる →</button>}</div></> : <div className="answer-feedback" aria-live="polite"><div className="answer-companion"><Animal kind={current!.character} size={155}/><span className="earned-star" aria-hidden="true">✦</span></div><div className="answer-content"><h3 tabIndex={-1}>{game.feedback === 'correct' ? '✦ できたね！' : '✦ いっしょに おぼえよう！'}</h3><AnswerExplanation question={question}/><p className="learning-earned">{game.turnIndex + 1}人めの {names[current!.character]}から、まなびの あかりが とどいた！</p><button className="primary full" data-testid="continue-answer" onClick={() => { audio.play('confirm'); send({ type: 'continue' }); }}>{game.turnsCompleted % 4 === 3 ? 'なかまを たすけに いく →' : 'もりの できごとへ →'}</button></div></div>}
        </div>}

        {game.phase === 'event' && <div className={`event-scene scene-enter ${isRescue ? 'rescue-panel' : 'encounter-scene'} ${isRescue && game.rescueProgress === 3 && game.turnsCompleted < 12 ? 'branch-scene' : ''}`}>
          <div className="scene-caption"><p className="eyebrow">{isRescue ? game.rescueProgress === 3 ? 'おてつだい だいせいこう！' : 'みんなで おてつだい' : 'もりの できごと'}</p><h2 ref={focusRef} tabIndex={-1}>{isRescue ? chapters[chapter].title : story?.title}</h2></div>
          {isRescue ? <RescueEvent chapter={chapter + 1} progress={game.rescueProgress} onStep={rescue} route={currentRoute} cinematic/> : <><div className="encounter-illustration" aria-hidden="true"><RescueAnimal kind={chapter} size={190}/><Animal kind={current!.character} size={132}/><span>{story?.symbol}</span></div><div className="encounter-dialogue"><p className="event-story">{story?.story}</p><p className="learning-earned">✦ おてつだいまで あと {4 - game.turnsCompleted % 4} まなび</p></div></>}
          {(!isRescue || game.rescueProgress === 3) && <div className="event-exit">
            {isRescue && game.turnsCompleted < 12 ? <><p className="route-label">つぎは どちらの みちへ？</p><div className="route-buttons route-cards">{routeChoices[chapter].map(choice => <button className={'route-card route-' + choice.route} key={choice.route} data-route={choice.route} onClick={() => { audio.play('confirm'); send({ type: 'next', route: choice.route }); }}><span className="route-symbol" aria-hidden="true">{choice.symbol}</span><strong>{choice.title}</strong><span>{choice.detail}</span><small>{choice.action}</small><b aria-hidden="true">→</b></button>)}</div></> : <button className="primary" data-testid="next-turn" onClick={() => { audio.play(game.turnsCompleted === 12 ? 'goal' : 'confirm'); send({ type: 'next' }); }}>{game.turnsCompleted === 12 ? 'みんなで ゴール！' : game.players.length === 1 ? 'つぎの ぼうけんへ →' : 'つぎの なかまへ →'}</button>}
            {game.turnsCompleted < 12 && <div className="handoff-note"><Animal kind={game.players[nextPlayerIndex].character} size={34}/><span>つぎは {nextPlayerIndex + 1}人めの <strong>{names[game.players[nextPlayerIndex].character]}</strong>だよ。</span></div>}
          </div>}
        </div>}

        {game.phase === 'goal' && <div className="goal-scene scene-enter"><div className="goal-confetti" aria-hidden="true">{Array.from({length:12},(_,index) => <i key={index} style={{'--i':index} as CSSProperties}/>)}</div><div className="goal-heading"><div className="celebration" aria-hidden="true">✦ ⚑ ✦</div><p className="eyebrow">ぼうけん だいせいこう</p><h2 ref={focusRef} tabIndex={-1}>みんなで、<br/>たどりついたね！</h2><TitleCaravan className="goal-caravan" characters={game.players.map(player => player.character)}/><p>3びきの なかまを たすけたよ。<br/>12この まなびが、みんなの ちからに。</p></div><div className="goal-record"><JourneyRecap game={game}/><button className="primary full" onClick={() => { audio.play('confirm'); updateGame(createGame(game.players, questions)); setNotice(''); }}>おなじ なかまで もういちど ↻</button><button className="text-button" onClick={restart}>なかまを えらびなおす →</button></div></div>}
      </section>}
      {notice && <div className="notice" role="status">{notice}<button aria-label="おしらせを閉じる" onClick={() => setNotice('')}>×</button></div>}
    </main>
    {modalOpen && <div className="modal-backdrop"><div className="modal game-menu" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={modalRef}>
      {information ? <><p className="eyebrow">まなびの 冒険すごろく</p><h2 id="modal-title">おうちの方へ</h2><p>1台で1〜4人が交代する協力型ゲームです。小1〜6年の国語・算数を、各学年・各教科30問ずつ、全360問収録。学年の一部単元で、全範囲対応ではありません。</p><p>本名・アカウントは不要です。学年や進行状況は端末の中だけに保持し、「ほぞん」を押したときだけ、このブラウザに保存します。自動保存ではありません。</p><p>音と読み上げは初期状態ではオフです。読み上げは端末内の日本語音声がある場合に使えます。</p><button className="primary full" onClick={() => setInformation(false)}>とじる</button></> : confirmErase ? <><h2 id="modal-title">ほぞんした つづきを けす？</h2><p>ほぞんした ぼうけんには、もどれなくなるよ。<br/>いま あそんでいる ぼうけんは つづくよ。</p>{saved && <SaveSummary saved={saved} compact/>}<button className="primary full" data-dialog-initial-focus onClick={() => setConfirmErase(false)}>けさずに もどる</button><button className="secondary full" onClick={eraseSaved}>ほぞんを けす</button>{notice && <p role="status">{notice}</p>}</> : confirmRestart ? <><h2 id="modal-title">はじめから あそぶ？</h2><p>いまの ぼうけんは おわるよ。<br/>ほぞんした つづきは のこるよ。</p><button className="primary full" onClick={() => setConfirmRestart(false)}>いまの ぼうけんに もどる</button><button className="secondary full" onClick={restart}>はじめから あそぶ</button></> : settings ? <><h2 id="modal-title">あそびやすく せってい</h2><label className="field-label">こうかおんの おおきさ<select value={volume} onChange={e => setVolume(Number(e.target.value))}><option value={0}>オフ（おとは でない）</option><option value={20}>ちいさい</option><option value={50}>ふつう</option></select></label><label className="check-label"><input type="checkbox" checked={speechOn} onChange={e => { setSpeechOn(e.target.checked); stopSpeech(); }}/>もんだいの よみあげボタンを つかう</label><p className="setting-help">たんまつの 日本語音声が ある ときだけ つかえます。よみかたを こたえる もんだいは よみません。</p><label className="check-label"><input type="checkbox" checked={reducedMotion} disabled={systemReduced} onChange={e => setShortMotion(e.target.checked)}/>うごきを みじかくする</label><p className="setting-help">{systemReduced ? 'たんまつの「動きを減らす」に あわせています。' : 'サイコロの かいてんを へらし、はやく すすみます。'}</p><button className="primary full" onClick={() => setSettings(false)}>とじる</button>{saved && <button className="text-button" onClick={() => { setConfirmErase(true); setNotice(''); }}>ほぞんした つづきを けす</button>}</> : <><p className="eyebrow">ぼうけんメニュー</p><h2 id="modal-title">ぼうけんは まっているよ。</h2><button className="primary full" onClick={() => setPaused(false)}>ぼうけんを つづける →</button><p className="pause-save-status" data-testid="pause-save-status"><span data-testid="save-status" data-state={unsaved ? 'unsaved' : 'saved'}>{unsaved ? 'いまの つづきは、まだ ほぞんしていないよ。' : '✓ いまの つづきを ほぞんしてあるよ。'}</span></p><button className="secondary full" onClick={save}>ここまでを ほぞん</button>{saved && <SaveSummary saved={saved} compact/>}<details className="party-record"><summary>なかまの ぼうけんの きろく</summary><section className="team-strip" aria-label="冒険の仲間">{game?.players.map((p,index)=><div className="team-member" key={p.id}><Animal kind={p.character} size={42}/><div><small>{index+1}人め · {p.grade}年</small><strong>{names[p.character]}</strong></div><span>{game.completedByPlayer[index]}もん おわり</span></div>)}</section></details><button className="text-button" onClick={() => setConfirmRestart(true)}>はじめから あそぶ</button>{notice && <p role="status">{notice}</p>}</>}
    </div></div>}
  </div>;
}
export default App;
