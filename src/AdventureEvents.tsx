import { useEffect, useRef } from 'react';
import './adventure-events.css';

export type RescueEventProps = {
  chapter: number;
  progress: number;
  onStep: (step: number) => void;
  route: string;
};

const ink = '#564333';

function Squirrel() {
  return <g stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="0" cy="43" rx="34" ry="7" fill="#4b563a" opacity=".15" stroke="none" />
    <path d="M-21 26 C-67 32 -67 -23 -40 -26 C-12 -30 -17 -7 -31 -6 C-40 -6 -40 -16 -34 -16" fill="#c4885c" />
    <ellipse cx="0" cy="21" rx="24" ry="25" fill="#dca06c" /><ellipse cx="5" cy="24" rx="14" ry="17" fill="#ffe6bc" stroke="none" />
    <path d="M-22 -13 L-20 -34 -6 -23 M7 -24 L21 -35 23 -13" fill="#dca06c" />
    <path d="M-16 -24 L-14 -29 -9 -22 M13 -22 L18 -29 18 -23" stroke="#85533e" strokeWidth="3" />
    <path d="M-27 -6 Q-27 -26 0 -25 Q28 -25 29 -5 Q31 15 0 15 Q-27 16 -27 -6Z" fill="#dca06c" />
    <ellipse cx="-10" cy="-4" rx="3" ry="4" fill={ink} stroke="none" /><ellipse cx="13" cy="-4" rx="3" ry="4" fill={ink} stroke="none" />
    <path d="M-3 3 L3 3 0 7Z" fill={ink} /><path d="M-6 9 Q0 14 7 9" fill="none" strokeWidth="2" />
    <ellipse cx="-18" cy="5" rx="5" ry="3" fill="#e57f72" stroke="none" /><ellipse cx="21" cy="5" rx="5" ry="3" fill="#e57f72" stroke="none" />
    <path d="M-18 13 Q0 21 20 13 L18 22 Q0 29 -17 21Z" fill="#639b8c" /><path d="M-20 26 L-10 31 M18 27 L10 32" fill="none" />
    <ellipse cx="-15" cy="43" rx="10" ry="5" fill="#dca06c" /><ellipse cx="15" cy="43" rx="10" ry="5" fill="#dca06c" />
  </g>;
}

function Owl({ happy = false }: { happy?: boolean }) {
  return <g stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="0" cy="43" rx="34" ry="7" fill="#4b563a" opacity=".13" stroke="none" />
    <path d="M-33 24 Q-42 -3 -24 -22 L-27 -41 -9 -32 Q0 -37 10 -32 L29 -41 25 -21 Q44 0 32 26 Q28 42 0 42 Q-30 41 -33 24Z" fill="#aa89b8" />
    <ellipse cx="-14" cy="-4" rx="17" ry="21" fill="#fff0d1" stroke="none" /><ellipse cx="16" cy="-4" rx="17" ry="21" fill="#fff0d1" stroke="none" />
    {happy ? <path d="M-21 -2 Q-14 -10 -8 -2 M9 -2 Q16 -10 23 -2" fill="none" strokeWidth="3" /> : <><circle cx="-14" cy="-4" r="4" fill={ink} stroke="none" /><circle cx="16" cy="-4" r="4" fill={ink} stroke="none" /></>}
    <path d="M-6 5 L1 14 8 5Z" fill="#e7b455" />
    <path d="M-32 8 Q-40 23 -26 28 M32 8 Q43 25 26 29" fill="#9672a4" />
    <path d="M-12 42 V48 M12 42 V48 M-17 48 H-7 M7 48 H17" fill="none" />
    <path d="M-17 23 l3 4 3 -4 M-3 24 l3 4 3 -4 M10 23 l3 4 3 -4" stroke="#e8d1d7" strokeWidth="2" fill="none" />
  </g>;
}

function Hedgehog() {
  return <g stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="0" cy="31" rx="37" ry="7" fill="#222f39" opacity=".18" stroke="none" />
    <path d="M-35 18 L-41 4 -34 -3 -37 -15 -25 -18 -20 -31 -8 -26 2 -35 10 -26 23 -27 26 -15 36 -9 32 4 37 15 21 29 -23 28Z" fill="#8e725f" />
    <path d="M-22 24 Q-34 5 -17 -9 Q-2 -16 12 -3 L34 10 Q47 19 30 28 Q2 39 -22 24Z" fill="#f4d8aa" />
    <circle cx="37" cy="15" r="4" fill={ink} /><circle cx="13" cy="7" r="3" fill={ink} stroke="none" />
    <ellipse cx="18" cy="18" rx="5" ry="3" fill="#e79b84" stroke="none" /><path d="M25 23 Q29 26 33 22" fill="none" strokeWidth="1.8" />
    <path d="M-17 -17 l-4 8 M-3 -23 l-3 9 M12 -19 l-2 8" stroke="#c1a287" fill="none" />
    <ellipse cx="-16" cy="30" rx="7" ry="4" fill="#e6c08d" /><ellipse cx="18" cy="32" rx="7" ry="4" fill="#e6c08d" />
  </g>;
}

function LittleTree({ x, y, scale = 1, night = false }: { x: number; y: number; scale?: number; night?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-7 0 L-5 -65 H5 L8 0Z" fill={night ? '#514947' : '#9b7652'} />
    <path d="M-46 -49 Q-59 -71 -34 -88 Q-43 -116 -14 -119 Q9 -142 29 -115 Q57 -116 56 -89 Q76 -61 44 -48 Q20 -29 -3 -44 Q-27 -31 -46 -49Z" fill={night ? '#365653' : '#6d9e69'} />
    <path d="M-37 -84 Q-31 -109 -8 -107 Q10 -125 26 -109 Q46 -105 43 -85 Q15 -95 -5 -78Z" fill={night ? '#466866' : '#96b77d'} />
    <path d="M0 -37 V-78 M0 -51 L-18 -69 M0 -46 L20 -63" fill="none" stroke={night ? '#2d4848' : '#518057'} strokeWidth="4" strokeLinecap="round" />
  </g>;
}

function Sparkles({ x, y }: { x: number; y: number }) {
  return <g className="rescue-sparkles" transform={`translate(${x} ${y})`} fill="#efbb56" stroke="#c08a32" strokeWidth="1">
    <path d="M0 -10 L3 -3 10 0 3 3 0 10 -3 3 -10 0 -3 -3Z" />
    <path d="M24 11 L26 16 31 18 26 20 24 25 22 20 17 18 22 16Z" /><circle cx="-18" cy="22" r="3" />
  </g>;
}

function BridgeScene({ progress }: { progress: number }) {
  return <>
    <rect width="600" height="260" fill="#e7efd4" />
    <path d="M0 80 Q110 26 207 86 T410 63 T600 73 V0 H0Z" fill="#d4e6bd" />
    <path d="M0 206 Q126 181 223 210 T423 197 T600 220 V260 H0Z" fill="#c3d89f" />
    <path d="M323 -20 C269 30 328 82 302 124 S290 213 337 280" stroke="#e9ecc5" strokeWidth="153" fill="none" />
    <path d="M323 -20 C269 30 328 82 302 124 S290 213 337 280" stroke="#85c9cc" strokeWidth="118" fill="none" />
    <path d="M282 46 l31 5 M300 76 l29 4 M279 111 l23 3 M300 221 l30 4 M315 236 l24 2" fill="none" stroke="#d8f0de" strokeWidth="3" strokeLinecap="round" />
    <LittleTree x={54} y={123} scale={.8} /><LittleTree x={520} y={120} scale={.8} /><LittleTree x={573} y={142} scale={.56} />
    <path d="M-15 192 Q110 161 236 173 M376 173 Q474 178 615 190" fill="none" stroke="#e8d5a6" strokeWidth="35" />
    <g stroke="#846748" strokeWidth="3" strokeLinecap="round">
      <path d="M234 146 H383 M234 194 H383" stroke="#cba976" strokeWidth="7" />
      {[0, 1, 2].map(index => <g key={index}>
        <rect x={238 + index * 47} y="143" width="44" height="55" rx="4" fill={progress > index ? '#e8bb7d' : '#d8efdf'} stroke={progress > index ? '#a27c4e' : '#7da59a'} strokeDasharray={progress > index ? undefined : '5 5'} opacity={progress > index ? 1 : .72} />
        {progress > index ? <path d={`M${249 + index * 47} 150 v39 M${266 + index * 47} 153 v34`} stroke="#c8955d" strokeWidth="2" /> : <text x={260 + index * 47} y="180" textAnchor="middle" fill="#486b62" stroke="none" fontSize="23" fontWeight="800">{index + 1}</text>}
      </g>)}
      <path d="M231 137 V153 M385 137 V153 M231 190 V206 M385 190 V206" strokeWidth="6" />
    </g>
    <g className="rescue-friend-travel" style={{ transform: `translate(${progress === 3 ? 176 : 454}px, 139px)` }}><Squirrel /></g>
    {progress === 3 && <Sparkles x={200} y={95} />}
    <g fill="#e1a37d"><circle cx="81" cy="211" r="5" /><circle cx="93" cy="215" r="4" /><circle cx="506" cy="220" r="4" /></g>
    <path d="M63 238 l-6 -10 10 5 5 -11 4 12 8 -3 -4 9 M535 236 l-5 -8 8 3 4 -10 4 12 7 -3 -4 7" fill="#91b477" />
  </>;
}

function Basket() {
  return <g stroke="#86623e" strokeWidth="2.5" strokeLinejoin="round">
    <path d="M-25 -17 Q-25 -51 0 -49 Q25 -50 25 -17" stroke="#ac8051" strokeWidth="6" fill="none" />
    <path d="M-33 -21 L-26 18 Q0 30 28 18 L35 -21Z" fill="#d7a15d" /><path d="M-30 -12 H32 M-28 0 H30 M-25 13 H28 M-16 -19 L-11 23 M0 -19 V25 M18 -19 L13 23" fill="none" stroke="#b58149" strokeWidth="2" />
    <path d="M-29 -21 Q-33 -33 -17 -35 Q-9 -42 -1 -33 Q11 -43 21 -32 Q32 -34 32 -21Z" fill="#de8c73" /><path d="M-2 -33 Q-1 -43 7 -46" stroke="#6f8f52" strokeWidth="4" fill="none" />
    <path d="M-36 -22 H37" fill="none" stroke="#efcb88" strokeWidth="7" strokeLinecap="round" />
  </g>;
}

function BasketScene({ progress, river }: { progress: number; river: boolean }) {
  const basketX = progress === 3 ? 191 : river && progress === 2 ? 266 : 382;
  const basketY = progress > 1 ? 156 : 202;
  return <>
    <rect width="600" height="260" fill={river ? '#e0eee1' : '#edf0d7'} />
    <path d="M0 102 Q150 39 301 86 T600 72 V0 H0Z" fill="#d0e0b3" />
    <LittleTree x={62} y={133} scale={.85} /><LittleTree x={502} y={119} scale={.95} /><LittleTree x={573} y={138} scale={.7} />
    <path d="M0 190 Q182 170 312 192 T600 180 V260 H0Z" fill="#c1d49c" />
    {river ? <>
      <path d="M265 278 Q270 185 450 162 T647 176" fill="none" stroke="#e9e5bb" strokeWidth="108" /><path d="M265 278 Q270 185 450 162 T647 176" fill="none" stroke="#87c7cc" strokeWidth="77" />
      <path d="M321 226 l34 -7 M448 196 l26 -6 M538 185 l33 2" stroke="#dff2e6" strokeWidth="3" strokeLinecap="round" />
      {progress > 0 && <path d={progress === 3 ? 'M211 137 Q240 167 276 185' : progress === 2 ? 'M267 120 Q239 104 220 166' : 'M385 162 Q319 125 237 167'} fill="none" stroke="#866848" strokeWidth="4" strokeDasharray="7 3" />}
    </> : <>
      <path d="M212 270 Q237 205 341 190 T577 175" fill="none" stroke="#dec99d" strokeWidth="39" />
      <path d="M279 148 Q320 126 357 151 Q385 128 418 148 Q455 137 475 177 H277Z" fill="#9dba7b" />
      <g fill="#e6ae68" stroke="#a88751" strokeWidth="1.5"><path d="M287 201 Q267 187 277 177 Q294 177 295 195Z" /><path d="M466 219 Q453 203 464 191 Q479 197 472 214Z" /></g>
      {progress === 2 && <path d="M382 117 V76 Q351 54 328 92" fill="none" stroke="#866848" strokeWidth="3" strokeDasharray="6 3" />}
    </>}
    <g transform="translate(140 141)"><Owl happy={progress === 3} /></g>
    <g className="rescue-basket-travel" style={{ transform: `translate(${basketX}px, ${basketY}px) scale(.75)` }}>
      {progress === 3 && <path d="M-40 17 Q0 4 40 17 L28 36 Q0 28 -27 37Z" fill="#e6ecd1" stroke="#829a70" strokeWidth="2" />}
      <Basket />
    </g>
    {!river && <g className={progress === 0 ? 'rescue-leaves' : 'rescue-leaves rescue-leaves-cleared'}>
      <path d="M335 190 Q326 152 350 152 Q377 158 365 199 M363 195 Q371 148 393 157 Q414 177 387 205 M389 201 Q411 165 435 181 Q447 201 416 210" fill="#99ac62" stroke="#728c53" strokeWidth="2" />
      <path d="M317 213 Q337 184 370 211 Q386 184 409 214 Q430 193 451 216Z" fill="#babc73" stroke="#839555" strokeWidth="2" />
    </g>}
    {river && progress === 0 && <path d="M345 219 Q370 208 389 219 T422 217" fill="none" stroke="#daf0e6" strokeWidth="4" strokeLinecap="round" />}
    {progress === 3 && <Sparkles x={192} y={71} />}
    <g fill="#f2d489"><circle cx="60" cy="210" r="4" /><circle cx="72" cy="207" r="5" /><circle cx="525" cy="232" r="4" /></g>
  </>;
}

function LanternScene({ progress, river }: { progress: number; river: boolean }) {
  return <>
    <rect width="600" height="260" fill="#455b71" />
    <path d="M0 130 Q141 78 265 125 T600 99 V260 H0Z" fill="#566e63" />
    <circle cx="425" cy="38" r="20" fill="#f8e6ac" /><circle cx="433" cy="31" r="18" fill="#455b71" />
    <g fill="#f1e4bb"><circle cx="161" cy="36" r="2" /><circle cx="264" cy="52" r="2" /><circle cx="358" cy="24" r="2" /><circle cx="527" cy="48" r="2" /><circle cx="218" cy="78" r="1.5" /></g>
    <LittleTree x={49} y={134} scale={.82} night /><LittleTree x={558} y={132} scale={.7} night />
    <path d="M-20 202 Q230 183 499 200" stroke="#928770" strokeWidth="42" fill="none" />
    {river && <path d="M-10 253 Q131 224 240 249 T624 243" fill="none" stroke="#6b9ea3" strokeWidth="30" />}
    <g transform="translate(499 158)" stroke="#5b473e" strokeWidth="3" strokeLinejoin="round">
      <path d="M-43 -35 H43 L40 31 Q0 41 -41 31Z" fill="#e5c99a" /><path d="M-59 -34 Q-47 -90 -2 -94 Q41 -93 58 -34 Q0 -15 -59 -34Z" fill="#b97865" />
      <path d="M-40 -57 Q-22 -81 -3 -80" stroke="#dba283" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M-10 35 V5 Q2 -16 15 5 V34" fill={progress === 3 ? '#ffe9ac' : '#8c947b'} /><circle cx="-24" cy="-10" r="9" fill="#f2cf7b" /><circle cx="27" cy="-10" r="8" fill="#f2cf7b" />
    </g>
    {[187, 292, 392].map((x, index) => <g key={x} transform={`translate(${x} ${index === 1 ? 161 : 175})`}>
      {progress > index && <><ellipse className="rescue-lantern-glow" cx="0" cy="17" rx="68" ry="28" fill="#ffe9a6" opacity=".18" /><circle cy="-24" r="43" fill="#ffe49a" opacity=".14" /></>}
      <path d="M0 13 V-12" stroke="#4e4641" strokeWidth="6" strokeLinecap="round" />
      <path d="M-13 -34 L-9 -12 H9 L13 -34Z" fill={progress > index ? '#ffe09a' : '#879292'} stroke="#453e39" strokeWidth="2.5" />
      <path d="M-15 -35 L0 -48 15 -35Z" fill={progress > index ? '#d9a76a' : '#748580'} stroke="#453e39" strokeWidth="2.5" strokeLinejoin="round" />
      {progress > index ? <path d="M0 -29 Q-7 -22 0 -17 Q7 -22 0 -29Z" fill="#fff9d7" /> : <text y="-17" textAnchor="middle" fill="#f5f0db" fontSize="16" fontWeight="800">{index + 1}</text>}
    </g>)}
    <g className="rescue-friend-travel" style={{ transform: `translate(${progress === 3 ? 462 : 92}px, 180px) scale(.9)` }}><Hedgehog /></g>
    {progress === 3 && <Sparkles x={442} y={112} />}
  </>;
}

export function RescueEvent({ chapter, progress: rawProgress, onStep, route }: RescueEventProps) {
  const progress = Math.max(0, Math.min(3, Math.trunc(rawProgress)));
  const stage = chapter === 1 ? 1 : chapter === 2 ? 2 : 3;
  const river = route === 'river';
  const actionRef = useRef<HTMLButtonElement>(null);
  const story = stage === 1 ? 'はしの いたが なくて、りすが わたれないよ。3まいの いたを おこう！' : stage === 2 ? river ? 'ふくろうの かごが、かわに おちちゃった。ひもを つかって とどけよう！' : 'ふくろうの かごが、はっぱに うもれちゃった。みつけて とどけよう！' : 'くらくて、おうちが みえないよ。3つの ランプで みちを てらそう！';
  const actions = stage === 1 ? ['1まいめの いたを おく', '2まいめの いたを おく', '3まいめの いたを おく'] : stage === 2 ? river ? ['かごに ひもを かける', 'かごを ひきよせる', 'ふくろうに わたす'] : ['はっぱを よける', 'ひもで かごを もちあげる', 'ふくろうに わたす'] : ['1つめの ランプを ともす', '2つめの ランプを ともす', '3つめの ランプを ともす'];
  const status = stage === 1 ? ['はしに あなが 3つ。いたは 3まい あるよ。', '1まい おけた！ はしが つながってきたね。', 'あと 1まいで、りすが わたれるよ。', 'はしが つながった！ りすが わたれたよ。'] : stage === 2 ? river ? ['ひもを かごに かけよう。', 'ひもが かかった！ ゆっくり ひこう。', 'かごが とれた！ ふくろうに わたそう。', 'かごを とどけた！ ふくろうも にっこり。'] : ['まずは、かごの まわりの はっぱを よけよう。', 'かごを みつけた！ もちあげよう。', 'かごが とれた！ ふくろうに わたそう。', 'かごを とどけた！ ふくろうも にっこり。'] : ['おうちまで、ランプを ならべたよ。', 'ひとつ ともった！ あしもとが みえたね。', 'あと ひとつで、おうちまで あかるくなるよ。', 'みちが あかるいね！ おうちに かえれたよ。'];
  const tools = stage === 1 ? ['いた 1', 'いた 2', 'いた 3'] : stage === 2 ? river ? ['ひも', 'てぶくろ', 'ぬの'] : ['てぶくろ', 'ひも', 'ぬの'] : ['ランプ 1', 'ランプ 2', 'ランプ 3'];
  const thankYou = stage === 1 ? '「ありがとう！ みんなの はし、じょうぶだね！」' : stage === 2 ? '「ありがとう！ おまつりの りんごが とどけられるよ！」' : '「ありがとう！ みんなで おまつりへ いこう！」';

  useEffect(() => {
    if (progress > 0 && progress < 3) actionRef.current?.focus({ preventScroll: true });
  }, [progress, stage]);

  return <div className={`rescue-activity rescue-chapter-${stage}`} data-testid="rescue-event" data-progress={progress}>
    {progress < 3 && <p className="rescue-story">{story}</p>}
    <svg className="rescue-scene" viewBox="0 0 600 260" role="img" aria-label={status[progress]}>
      {stage === 1 ? <BridgeScene progress={progress} /> : stage === 2 ? <BasketScene progress={progress} river={river} /> : <LanternScene progress={progress} river={river} />}
    </svg>
    <div className="rescue-status" role="status" aria-live="polite" aria-atomic="true">
      <strong>{progress === 3 ? 'おてつだい できた！' : `おてつだい ${progress + 1} / 3`}</strong>
      <p>{status[progress]}</p>
    </div>
    {progress < 3 ? <>
      <button key={`${stage}-${progress}`} ref={actionRef} type="button" className="rescue-action" data-testid="rescue-action" onClick={event => { if (event.detail < 2) onStep(progress); }}>
        <span className="rescue-action-number" aria-hidden="true">{progress + 1}</span>{actions[progress]}<span aria-hidden="true"> →</span>
      </button>
      <p className="rescue-earned">みんなで 4もんに とりくんで、どうぐが そろったよ！</p>
      <ol className="rescue-tools" aria-label="みんなで あつめた どうぐ">
        {tools.map((tool, index) => <li key={tool} className={index < progress ? 'rescue-tool-used' : ''}><span aria-hidden="true">{index < progress ? '✓' : '◇'}</span> {tool}<span className="rescue-tool-state">{index < progress ? 'つかった' : 'じゅんび OK'}</span></li>)}
      </ol>
    </> : <p className="rescue-thanks">{thankYou}</p>}
  </div>;
}
