import { useId } from 'react';

type AnimalProps = { kind: number; size?: number; className?: string };
export type BoardProps = {
  position: number;
  totalDistance: number;
  rescued: number;
  route: string;
  characters: number[];
  checkpoints?: number[];
  routes?: ('forest' | 'river')[];
  moving?: boolean;
  arrived?: boolean;
  travel?: { start: number; dice: number; step: number };
  rescueProgress?: number;
};

const animalNames = ['きつね', 'うさぎ', 'くま', 'ねこ'];
const fur = ['#ec9557', '#f2d9c8', '#ad7960', '#83b1a3'];
const scarves = ['#438f8a', '#ca6c82', '#e5b14e', '#ed9661'];
const ink = '#493e35';

/** Original little expedition companions; every shape is authored for this game. */
function AnimalGlyph({ kind = 0 }: { kind: number }) {
  const index = ((Math.floor(kind) % 4) + 4) % 4;
  return (
    <g stroke={ink} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="50" cy="91" rx="28" ry="6" fill="#514f3b" opacity=".1" stroke="none" />
      <path d="M29 77 Q27 61 40 57 H61 Q74 63 71 80 L67 91 H33Z" fill={fur[index]} />
      <ellipse cx="39" cy="89" rx="9" ry="5" fill={fur[index]} />
      <ellipse cx="62" cy="89" rx="9" ry="5" fill={fur[index]} />
      {index === 0 && <>
        <path d="M25 38 L20 7 Q35 12 43 25 M57 25 Q67 11 82 7 L77 38" fill={fur[index]} />
        <path d="M27 26 L25 15 37 27 M64 27 L77 15 73 29" fill="#674a3f" stroke="none" />
      </>}
      {index === 1 && <>
        <path d="M32 33 Q14 -6 31 3 Q44 10 43 31 M56 29 Q56 -3 70 3 Q84 10 68 36" fill={fur[index]} />
        <path d="M33 25 Q26 10 30 10 M64 25 Q67 10 70 10" stroke="#db9b98" strokeWidth="6" />
      </>}
      {index === 2 && <>
        <circle cx="26" cy="25" r="14" fill={fur[index]} /><circle cx="75" cy="25" r="14" fill={fur[index]} />
        <circle cx="26" cy="25" r="7" fill="#d7ad8b" stroke="none" /><circle cx="75" cy="25" r="7" fill="#d7ad8b" stroke="none" />
      </>}
      {index === 3 && <>
        <path d="M23 38 L22 10 43 24 M57 24 L80 10 78 40" fill={fur[index]} />
        <path d="M29 29 L28 18 38 27 M64 27 L74 18 74 31" fill="#edb7a1" stroke="none" />
      </>}
      <path d="M19 43 Q21 23 49 23 Q78 23 82 43 Q85 65 63 72 Q49 76 34 70 Q15 63 19 43Z" fill={fur[index]} />
      {index === 0 && <path d="M21 44 Q36 43 49 54 Q62 43 80 44 Q80 65 61 70 Q48 74 35 69 Q23 64 21 44Z" fill="#fff0d5" stroke="none" />}
      {index === 2 && <ellipse cx="50" cy="57" rx="19" ry="13" fill="#e8cba6" stroke="none" />}
      {index === 3 && <>
        <path d="M42 25 L45 34 M52 25 L52 33 M62 26 L59 34" stroke="#50887c" strokeWidth="4" />
        <path d="M17 49 L7 46 M18 56 L6 57 M82 49 L92 46 M81 56 L94 57" strokeWidth="1.8" />
      </>}
      <ellipse cx="34" cy="49" rx="3.3" ry="4.1" fill={ink} stroke="none" />
      <ellipse cx="66" cy="49" rx="3.3" ry="4.1" fill={ink} stroke="none" />
      <circle cx="35" cy="48" r=".9" fill="#fff" stroke="none" /><circle cx="67" cy="48" r=".9" fill="#fff" stroke="none" />
      <ellipse cx="28" cy="57" rx="6" ry="3.8" fill="#e98f7d" opacity=".65" stroke="none" />
      <ellipse cx="73" cy="57" rx="6" ry="3.8" fill="#e98f7d" opacity=".65" stroke="none" />
      <path d="M46 55 Q50 52 54 55 L50 59Z" fill={ink} strokeWidth="1" />
      <path d="M43 62 Q46 66 50 61 Q54 66 58 62" fill="none" strokeWidth="1.8" />
      <path d="M35 70 Q51 78 67 70 L66 78 Q50 86 34 78Z" fill={scarves[index]} />
      <path d="M59 78 L64 91 73 86 66 76" fill={scarves[index]} />
      <path d="M31 74 L26 82 M71 74 L75 81" fill="none" />
    </g>
  );
}

export function Animal({ kind, size = 88, className }: AnimalProps) {
  const index = ((Math.floor(kind) % 4) + 4) % 4;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label={animalNames[index]}>
      <AnimalGlyph kind={index} />
    </svg>
  );
}

function CaravanGlyph({ characters, rescued = 0 }: { characters: number[]; rescued?: number }) {
  const passengers = characters.length ? characters.slice(0, 4) : [0];
  return (
    <g stroke={ink} strokeWidth="2.3" strokeLinejoin="round">
      <ellipse cx="85" cy="108" rx="75" ry="9" fill="#514d38" opacity=".17" stroke="none" />
      <path d="M22 54 L16 94 Q18 101 31 101 H142 Q153 100 154 88 L146 51Z" fill="#e5aa3e" />
      <path d="M20 54 H148 L148 87 Q86 99 19 86Z" fill="#f7c75c" />
      <path d="M16 56 L23 29 Q25 21 37 20 H134 Q143 21 146 28 L155 56Z" fill="#fff6d9" />
      <path d="M23 29 Q83 19 146 28 L149 38 Q84 28 19 38Z" fill="#739f79" stroke="none" />
      <path d="M33 39 L29 71 M137 38 L140 71" fill="none" stroke="#755d40" strokeWidth="4" />
      {passengers.map((kind, index) => (
        <g key={index} transform={`translate(${passengers.length === 1 ? 63 : 31 + index * (82 / Math.max(1, passengers.length - 1))} 35) scale(.43)`}>
          <g className="wagon-passenger"><AnimalGlyph kind={kind} /></g>
        </g>
      ))}
      <path d="M17 76 Q84 84 153 74 L152 90 Q86 102 18 91Z" fill="#f6c451" />
      <path d="M48 85 H75 M99 84 H125" stroke="#fff0b8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="41" cy="99" r="12" fill="#665348" /><circle cx="41" cy="99" r="5" fill="#dac49a" stroke="none" />
      <circle cx="128" cy="99" r="12" fill="#665348" /><circle cx="128" cy="99" r="5" fill="#dac49a" stroke="none" />
      <path d="M154 88 H165 Q171 88 173 83" fill="none" strokeLinecap="round" />
      <path d="M78 82 L84 74 90 82 87 91 80 91Z" fill="#fff2bd" stroke="#a77d36" strokeWidth="1.5" />
      {rescued > 0 && <g transform="translate(-44 83)">
        <path d="M32 12 H58" stroke="#7e6245" strokeWidth="3" />
        <rect x="-34" y="-6" width="75" height="26" rx="7" fill="#82af91" />
        {Array.from({ length: Math.min(3, rescued) }, (_, index) => <g key={index} transform={`translate(${-18 + index * 22} -3) scale(.42)`}><Friend index={index} saved={false} /></g>)}
        <path d="M-33 4 H39 V17 Q3 25 -33 17Z" fill="#9ac49d" />
        <circle cx="-19" cy="22" r="7" fill="#665348" /><circle cx="26" cy="22" r="7" fill="#665348" />
        <circle cx="-19" cy="22" r="2.5" fill="#e8d6a4" stroke="none" /><circle cx="26" cy="22" r="2.5" fill="#e8d6a4" stroke="none" />
      </g>}
    </g>
  );
}

export function Caravan({ characters }: { characters: number[] }) {
  return <svg viewBox="0 0 180 125" role="img" aria-label="みんなで のる ぼうけんワゴン"><CaravanGlyph characters={characters} /></svg>;
}

function Tree({ x, y, scale = 1, kind = 0 }: { x: number; y: number; scale?: number; kind?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <ellipse cx="0" cy="3" rx="23" ry="7" fill="#577b53" opacity=".15" />
    <path d="M-4 0 L-3 -48 H4 L5 0" fill="#94704f" />
    {kind === 0 ? <>
      <path d="M-32 -35 Q-38 -54 -22 -66 Q-26 -85 -7 -88 Q8 -102 21 -82 Q40 -81 35 -63 Q50 -40 25 -32 Q4 -19 -15 -28 Q-27 -24 -32 -35Z" fill="#4e916b" />
      <path d="M-27 -57 Q-34 -70 -15 -77 Q-12 -92 5 -87 Q18 -91 24 -76 Q34 -70 27 -61 Q3 -66 -13 -53Z" fill="#75ac78" />
      <path d="M0 -24 V-52 M1 -40 L-13 -51 M1 -32 L14 -45" stroke="#447b5e" strokeWidth="3" fill="none" strokeLinecap="round" />
    </> : <>
      <path d="M0 -101 L-28 -59 H-17 L-36 -31 H-14 L-28 -13 H28 L15 -31 H36 L17 -59 H28Z" fill="#4b8770" />
      <path d="M0 -101 L-22 -64 H0 L-17 -38 H4 L-10 -19 H21 L11 -32 H29 L13 -60 H23Z" fill="#6caa88" />
    </>}
  </g>;
}

function Flower({ x, y, color = '#f3cd71' }: { x: number; y: number; color?: string }) {
  return <g transform={`translate(${x} ${y})`}>
    <path d="M0 8 V0 M0 6 L-4 3" stroke="#6b965c" strokeWidth="2" fill="none" />
    <path d="M0 -5 C5 -8 6 -2 3 0 C8 3 2 7 0 3 C-4 7 -7 2 -3 0 C-8 -3 -3 -8 0 -5Z" fill={color} />
    <circle r="1.7" fill="#f9f0d0" />
  </g>;
}

function House({ x, y, scale = 1, color = '#cd8062' }: { x: number; y: number; scale?: number; color?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`} stroke="#745d46" strokeWidth="2" strokeLinejoin="round">
    <ellipse cx="0" cy="3" rx="38" ry="9" fill="#607e51" opacity=".15" stroke="none" />
    <path d="M-27 -43 H27 L25 1 Q0 7 -25 1Z" fill="#fff1c9" />
    <path d="M-40 -43 Q-30 -83 -4 -86 Q21 -83 40 -44 Q0 -32 -40 -43Z" fill={color} />
    <path d="M-27 -53 Q-10 -76 2 -76" stroke="#f5c89b" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".55" />
    <path d="M-8 3 V-16 Q0 -28 9 -16 V3" fill="#91b5a0" />
    <circle cx="-16" cy="-28" r="6" fill="#edbe61" /><circle cx="16" cy="-28" r="6" fill="#edbe61" />
    <path d="M-21 -28 H-11 M16 -33 V-23" strokeWidth="1" />
    <circle cx="4" cy="-7" r="1.4" fill="#745d46" stroke="none" />
  </g>;
}

type Point = { x: number; y: number };
type Curve = [Point, Point, Point, Point];
type Trail = { data: string; points: (Point & { distance: number })[]; length: number };

// Each chapter ends at its rescue square. Dice distances are distributed within
// that chapter, so neither a random roll nor a route choice moves a rescue flag.
function makeTrail(curves: Curve[]): Trail {
  const points: Trail['points'] = [];
  let length = 0;
  for (const curve of curves) {
    for (let n = 0; n <= 40; n += 1) {
      const t = n / 40;
      const u = 1 - t;
      const point = {
        x: u ** 3 * curve[0].x + 3 * u ** 2 * t * curve[1].x + 3 * u * t ** 2 * curve[2].x + t ** 3 * curve[3].x,
        y: u ** 3 * curve[0].y + 3 * u ** 2 * t * curve[1].y + 3 * u * t ** 2 * curve[2].y + t ** 3 * curve[3].y,
      };
      const previous = points.at(-1);
      if (previous) length += Math.hypot(point.x - previous.x, point.y - previous.y);
      points.push({ ...point, distance: length });
    }
  }
  const start = curves[0][0];
  return { points, length, data: `M${start.x} ${start.y} ${curves.map(curve => `C${curve.slice(1).map(p => `${p.x} ${p.y}`).join(' ')}`).join(' ')}` };
}

const meadowTrail = makeTrail([
  [{ x: 97, y: 465 }, { x: 196, y: 442 }, { x: 352, y: 493 }, { x: 446, y: 443 }],
  [{ x: 446, y: 443 }, { x: 560, y: 383 }, { x: 756, y: 434 }, { x: 729, y: 338 }],
]);
const chapterTrails = [
  {
    forest: makeTrail([
      [{ x: 729, y: 338 }, { x: 676, y: 275 }, { x: 541, y: 285 }, { x: 414, y: 290 }],
      [{ x: 414, y: 290 }, { x: 300, y: 288 }, { x: 190, y: 267 }, { x: 233, y: 214 }],
    ]),
    river: makeTrail([
      [{ x: 729, y: 338 }, { x: 671, y: 386 }, { x: 521, y: 349 }, { x: 406, y: 351 }],
      [{ x: 406, y: 351 }, { x: 283, y: 352 }, { x: 164, y: 280 }, { x: 233, y: 214 }],
    ]),
  },
  {
    forest: makeTrail([
      [{ x: 233, y: 214 }, { x: 265, y: 159 }, { x: 352, y: 134 }, { x: 430, y: 139 }],
      [{ x: 430, y: 139 }, { x: 555, y: 142 }, { x: 665, y: 150 }, { x: 724, y: 123 }],
      [{ x: 724, y: 123 }, { x: 757, y: 109 }, { x: 779, y: 104 }, { x: 796, y: 102 }],
    ]),
    river: makeTrail([
      [{ x: 233, y: 214 }, { x: 316, y: 174 }, { x: 401, y: 216 }, { x: 493, y: 220 }],
      [{ x: 493, y: 220 }, { x: 604, y: 242 }, { x: 718, y: 230 }, { x: 754, y: 171 }],
      [{ x: 754, y: 171 }, { x: 774, y: 138 }, { x: 789, y: 125 }, { x: 796, y: 102 }],
    ]),
  },
];

function onTrail(trail: Trail, fraction: number): Point {
  const distance = Math.min(1, Math.max(0, fraction)) * trail.length;
  const next = trail.points.findIndex(point => point.distance >= distance);
  if (next <= 0) return trail.points[0];
  const a = trail.points[next - 1];
  const b = trail.points[next];
  const ratio = (distance - a.distance) / Math.max(0.001, b.distance - a.distance);
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}

function Friend({ index, saved }: { index: number; saved: boolean }) {
  return <g stroke="#685341" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {index === 0 && <>
      <path d="M-17 8 Q-19 -5 -10 -15 L-8 -25 -1 -18 7 -25 11 -14 Q22 -6 16 9Z" fill="#d39a74" />
      <path d="M-7 -16 L-9 -21 M5 -17 L7 -21" fill="none" />
      <ellipse cx="0" cy="7" rx="12" ry="9" fill="#f5e0b7" stroke="none" />
      <path d="M-20 6 Q-35 -4 -28 -17 Q-21 -26 -16 -18 Q-20 -10 -15 -4" fill="#d39a74" />
    </>}
    {index === 1 && <>
      <path d="M-19 12 Q-24 -1 -14 -11 L-15 -21 -3 -16 7 -21 16 -13 Q23 -4 17 12Z" fill="#b993c8" />
      <ellipse cx="-7" cy="-3" rx="8" ry="10" fill="#fff2d4" stroke="none" /><ellipse cx="8" cy="-3" rx="8" ry="10" fill="#fff2d4" stroke="none" />
      <path d="M-4 0 L1 5 5 0" fill="#e6b555" stroke="none" />
      <path d="M-11 12 L-12 17 M9 12 L10 17" fill="none" />
    </>}
    {index === 2 && <>
      <path d="M-20 12 L-23 3 -19 -2 -21 -10 -13 -12 -9 -21 -2 -17 5 -23 10 -16 19 -14 19 -6 24 0 18 10Z" fill="#9a856b" />
      <path d="M-17 11 Q-21 -6 -8 -7 Q0 -12 11 -4 L20 5 Q20 16 0 17Z" fill="#f1d6ae" />
      <circle cx="20" cy="5" r="2" fill="#685341" />
    </>}
    {index === 2 ? <circle cx="7" cy="1" r="2" fill="#493e35" stroke="none" /> : <>
      <circle cx="-7" cy="-4" r="2" fill="#493e35" stroke="none" /><circle cx="8" cy="-4" r="2" fill="#493e35" stroke="none" />
      {index !== 1 && <path d="M-2 2 Q1 6 5 2" fill="none" />}
    </>}
    {saved && <g transform="translate(23 -26)">
      <circle r="10" fill="#fff9de" stroke="#598a59" /><path d="M-5 0 L-1 4 5 -4" fill="none" stroke="#47724b" strokeWidth="2.4" />
    </g>}
  </g>;
}

export function RescueAnimal({ kind, size = 88 }: { kind: number; size?: number }) {
  const index = ((Math.floor(kind) % 3) + 3) % 3;
  const labels = ['りす', 'ふくろう', 'はりねずみ'];
  return <svg width={size} height={size} viewBox="-45 -43 90 90" role="img" aria-label={labels[index]}>
    <ellipse cx="0" cy="21" rx="28" ry="5" fill="#514f3b" opacity=".1" />
    <Friend index={index} saved={false} />
  </svg>;
}

export function Board({ position, totalDistance, rescued, route, characters, checkpoints, routes, moving = false, arrived = false, travel, rescueProgress = 0 }: BoardProps) {
  const uid = useId().replace(/:/g, '');
  const distance = Math.max(3, Math.round(totalDistance));
  const progress = Math.max(0, Math.min(distance, position));
  const chapterEnds = checkpoints?.length === 3 && checkpoints[0] > 0 && checkpoints[1] > checkpoints[0] && checkpoints[1] < distance
    ? [checkpoints[0], checkpoints[1], distance]
    : [Math.floor(distance / 3), Math.floor(distance * 2 / 3), distance];
  const selectedRoutes = routes ?? [route === 'river' ? 'river' : 'forest', route === 'river' ? 'river' : 'forest'];
  const trails = [meadowTrail, chapterTrails[0][selectedRoutes[0] ?? 'forest'], chapterTrails[1][selectedRoutes[1] ?? 'forest']];
  const place = (value: number) => {
    const chapter = Math.max(0, chapterEnds.findIndex(end => value <= end));
    const start = chapter === 0 ? 0 : chapterEnds[chapter - 1];
    return onTrail(trails[chapter], (value - start) / (chapterEnds[chapter] - start));
  };
  const wagon = place(progress);
  const friends = [
    { x: 821, y: 386, square: { x: 729, y: 338 }, label: 'りす', chapter: 0 },
    { x: 132, y: 270, square: { x: 233, y: 214 }, label: 'ふくろう', chapter: 1 },
    { x: 847, y: 201, square: { x: 796, y: 102 }, label: 'はりねずみ', chapter: 2 },
  ];
  const cappedRescued = Math.max(0, Math.min(3, rescued));
  return <svg
    className={`adventure-board${moving ? ' is-moving' : ''}${arrived ? ' has-arrived' : ''}`}
    data-position={progress}
    width="100%"
    viewBox="0 0 900 570"
    role="img"
    aria-label={`ぼうけんの ちず。${distance}マスの うち ${progress}マス。ともだちを ${cappedRescued}ひき たすけた。${selectedRoutes.map((choice, index) => `${index + 2}つめの みちは ${choice === 'river' ? 'かわ' : 'もり'}`).join('。')}`}
    style={{ display: 'block', overflow: 'visible' }}
  >
    <defs>
      <linearGradient id={`${uid}-land`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e2edcf" /><stop offset="1" stopColor="#b9d49e" /></linearGradient>
      <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b0ded6" /><stop offset="1" stopColor="#76bfca" /></linearGradient>
      <filter id={`${uid}-shadow`} x="-100%" y="-60%" width="280%" height="220%"><feDropShadow dx="0" dy="3" stdDeviation="2" floodColor="#50623b" floodOpacity=".16" /></filter>
      <clipPath id={`${uid}-map-clip`}><rect width="900" height="570" rx="26" /></clipPath>
    </defs>
    <g clipPath={`url(#${uid}-map-clip)`}>
      <rect width="900" height="570" rx="26" fill={`url(#${uid}-land)`} />
      <path d="M-40 105 Q125 1 326 58 T641 55 T950 83 V0 H-40Z" fill="#d0e3b8" />
      <path d="M-50 156 Q71 119 161 144 Q267 173 280 112 Q385 35 545 120 Q696 158 928 86" stroke="#c2dcaa" strokeWidth="40" fill="none" />
      <path d="M-48 432 Q124 373 258 420 T471 475 T710 460 T933 477 V601 H-48Z" fill="#bad49c" />
      <path d="M-49 559 Q115 498 252 542 T531 526 T933 536" stroke="#aeca8d" strokeWidth="42" fill="none" />
      <path d="M782 -40 C838 83 756 176 804 262 S864 427 777 611" stroke="#dfebc4" strokeWidth="73" fill="none" />
      <path d="M782 -40 C838 83 756 176 804 262 S864 427 777 611" stroke={`url(#${uid}-water)`} strokeWidth="51" fill="none" />
      <g stroke="#e3f3e2" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".85"><path d="M787 18 L802 21 M787 180 L801 184 M814 283 L832 285 M815 445 L831 438 M784 514 L800 508" /></g>
      <Tree x={47} y={123} scale={1.02} /><Tree x={113} y={107} scale={.76} kind={1} />
      <Tree x={169} y={152} scale={.8} /><Tree x={54} y={279} scale={.64} kind={1} />
      <Tree x={873} y={318} scale={.6} kind={1} /><Tree x={875} y={503} scale={.8} />
      <House x={71} y={386} scale={.77} /><House x={119} y={393} scale={.48} color="#d7a552" />

      {selectedRoutes[0] === 'river' ? <g data-landscape="chapter-2-river">
        <path d={trails[1].data} stroke="#d9e7be" strokeWidth="96" fill="none" strokeLinecap="round" />
        <path d={trails[1].data} stroke={`url(#${uid}-water)`} strokeWidth="80" fill="none" strokeLinecap="round" />
        <g fill="#7cab79" stroke="#527e64" strokeWidth="1.2">
          <path d="M310 322 A14 6 0 1 1 324 315 L310 322Z" /><path d="M485 322 A16 6 0 1 1 502 316 L485 322Z" /><path d="M601 330 A13 5 0 1 1 614 324 L601 330Z" />
        </g>
        <Flower x={490} y={310} color="#f0acc0" /><Flower x={315} y={310} color="#fff1cc" />
        <g stroke="#dff2e8" strokeWidth="2" strokeLinecap="round"><path d="M379 317 h18 M540 389 h19 M599 306 h15 M268 291 h13" /></g>
      </g> : <g data-landscape="chapter-2-forest">
        <ellipse cx="449" cy="333" rx="238" ry="57" fill="#a5c990" opacity=".6" />
        <Tree x={300} y={374} scale={.61} /><Tree x={347} y={355} scale={.43} kind={1} />
        <Tree x={555} y={371} scale={.62} kind={1} /><Tree x={606} y={362} scale={.47} />
        <g transform="translate(449 340)" stroke="#997953" strokeWidth="1.6">
          <path d="M-22 13 V-5 H-12 V13 M10 15 V-2 H18 V15" fill="#fff0cb" />
          <path d="M-36 -5 Q-26 -34 -17 -30 Q-2 -29 2 -5Z" fill="#d69568" />
          <path d="M0 -2 Q12 -23 20 -18 Q27 -14 30 -2Z" fill="#e5b170" />
          <circle cx="-21" cy="-18" r="4" fill="#fff0cf" stroke="none" /><circle cx="17" cy="-10" r="3" fill="#fff0cf" stroke="none" />
        </g>
      </g>}
      {selectedRoutes[1] === 'river' ? <g data-landscape="chapter-3-river">
        <path d={trails[2].data} stroke="#dce8bd" strokeWidth="91" fill="none" strokeLinecap="round" />
        <path d={trails[2].data} stroke={`url(#${uid}-water)`} strokeWidth="76" fill="none" strokeLinecap="round" />
        <g transform="translate(564 180)">
          <path d="M-25 0 H29 L18 14 H-10Z" fill="#deab6f" stroke="#876b45" strokeWidth="1.8" />
          <path d="M0 -30 V2 M3 -28 L23 -4 H3Z" fill="#fff2ce" stroke="#8e7954" strokeWidth="1.6" />
          <path d="M-18 22 H19" stroke="#e2f1e4" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g transform="translate(414 175)" fill="#e9a568" stroke="#a7764f" strokeWidth="1.4"><path d="M-12 0 Q0 -12 13 0 Q1 13 -12 0 L-20 7 V-7Z" /><circle cx="8" cy="-2" r="1.5" fill="#514b37" stroke="none" /></g>
        <g stroke="#e1f3e7" strokeWidth="2.5" strokeLinecap="round"><path d="M337 170 h17 M627 190 h15 M663 252 h14" /></g>
      </g> : <g data-landscape="chapter-3-forest">
        <ellipse cx="484" cy="121" rx="197" ry="61" fill="#b4d297" />
        <Tree x={320} y={107} scale={.58} kind={1} /><Tree x={377} y={106} scale={.67} />
        <Tree x={524} y={106} scale={.53} kind={1} /><Tree x={583} y={105} scale={.67} />
        <path d="M416 134 Q427 86 451 88 Q477 87 489 137" stroke="#75a771" strokeWidth="20" fill="none" />
        <path d="M420 139 Q434 96 451 95 Q472 98 484 143" stroke="#5f875b" strokeWidth="4" fill="none" />
        <g transform="translate(617 75)"><path d="M0 0 Q-19 -19 -20 -5 Q-23 7 -4 6 Q-10 21 1 18 Q9 12 3 5 Q24 7 22 -6 Q18 -18 2 0Z" fill="#e0ae60" /><path d="M0 -2 L3 13" stroke="#8d7550" strokeWidth="2" strokeLinecap="round" /></g>
      </g>}

      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {routes && chapterTrails.map((options, index) => !routes[index] && <path key={`possible-${index}`} d={options.river.data} stroke="#678b73" strokeWidth="3" strokeDasharray="5 9" opacity=".38" />)}
        {trails.map((trail, index) => {
          const boardwalk = index > 0 && selectedRoutes[index - 1] === 'river';
          return <g key={index} data-chapter-path={index + 1} data-route={index === 0 ? 'meadow' : selectedRoutes[index - 1] ?? 'forest'}>
            <path d={trail.data} stroke="#819365" strokeWidth="45" opacity=".15" transform="translate(0 4)" />
            <path d={trail.data} stroke={boardwalk ? '#9b7a52' : '#d2bd90'} strokeWidth="42" />
            <path d={trail.data} stroke={boardwalk ? '#e6bf83' : '#fff0cf'} strokeWidth="35" />
            {boardwalk ? <path d={trail.data} stroke="#ad875a" strokeWidth="33" strokeDasharray="2 13" strokeLinecap="butt" /> : <path d={trail.data} stroke="#fff9e8" strokeWidth="23" opacity=".55" />}
          </g>;
        })}
      </g>

      <g fontFamily="'Noto Sans JP', 'Yu Gothic', sans-serif" fontWeight="800" textAnchor="middle">
        {Array.from({ length: Math.min(60, distance) + 1 }, (_, index) => {
          const value = Math.round(index * distance / Math.min(60, distance));
          const p = place(value);
          const complete = value <= progress;
          const special = chapterEnds.includes(value);
          const travelStep = travel && value > travel.start && value <= travel.start + travel.dice ? value - travel.start : 0;
          return <g key={value} transform={`translate(${p.x} ${p.y})`} data-square={value} data-checkpoint={special || undefined}>
            {travelStep > 0 && <g data-travel-step={travelStep} data-reached={value <= progress}>
              <circle r="24" fill={value <= progress ? '#fff0ac' : '#fffdf5'} fillOpacity=".85" stroke="#275e48" strokeWidth={value === progress ? 4 : 2} strokeDasharray={value > progress ? '4 4' : undefined}/>
            </g>}
            {special && <circle r="23" fill="#fff7d1" stroke="#c89543" strokeWidth="1.6" strokeDasharray="3 4" />}
            <circle r={value === 0 || special ? 18 : 12.5} fill={complete ? '#f6c970' : '#fffaf0'} stroke={complete ? '#a47a33' : '#b7a17c'} strokeWidth="1.5" />
            {special ? <><path d="M0 -12 L2 -7 8 -7 3 -3 4 2 0 -1 -4 2 -3 -3 -8 -7 -2 -7Z" fill={complete ? '#946629' : '#b19455'} /><text y="12" fill="#735c34" fontSize="10">{value}</text></> : <text y="4" fill={complete ? '#6e5026' : '#73644b'} fontSize="11">{value}</text>}
          </g>;
        })}

        <g transform="translate(113 506)"><path d="M-50 -15 H48 L60 0 48 15 H-50Z" fill="#fff8e7" stroke="#b5a076" strokeWidth="1.6" /><text x="0" y="5" fill="#6a5432" fontSize="14">しゅっぱつ</text></g>
        <g transform="translate(382 509)"><rect x="-77" y="-14" width="154" height="28" rx="12" fill="#e6edcf" /><text y="5" fill="#4d6846" fontSize="13">① はじまりの はら</text></g>
        <g transform="translate(426 392)"><rect x="-88" y="-13" width="176" height="26" rx="13" fill="#f7f7dd" fillOpacity=".94" /><text y="5" fill="#496844" fontSize="13">② {selectedRoutes[0] === 'river' ? 'はすの いけの きばし' : 'こもれびの こみち'}</text></g>
        <g transform="translate(458 41)"><rect x="-98" y="-14" width="196" height="28" rx="14" fill="#f7f7dd" fillOpacity=".94" /><text y="5" fill="#496844" fontSize="13">③ {selectedRoutes[1] === 'river' ? 'きらきらの かわぎし' : 'もりの トンネル'}</text></g>
      </g>

      <g transform="translate(824 68)">
        <House x={-20} y={-9} scale={.46} color="#b97c77" /><House x={38} y={2} scale={.57} color="#c9855d" />
        <path d="M3 3 V-52" stroke="#88724f" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M5 -51 Q20 -61 32 -51 V-32 Q19 -40 5 -31Z" fill="#e5a45e" stroke="#a07146" strokeWidth="1.5" />
        <path d="M11 -45 L15 -41 24 -47" stroke="#fff6d7" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <rect x="-24" y="59" width="98" height="26" rx="13" fill="#fff8e4" stroke="#beaa77" strokeWidth="1.5" />
        <text x="25" y="77" fill="#655030" fontSize="12" fontWeight="800" textAnchor="middle">ゴールの むら</text>
      </g>

      {friends.map((friend, index) => {
        const saved = cappedRescued > index;
        const atRescue = !saved && index === cappedRescued && progress === chapterEnds[index];
        return <g key={friend.label} data-rescue-site={index + 1}>
          <path d={`M${friend.square.x} ${friend.square.y} Q${friend.x} ${friend.square.y} ${friend.x} ${friend.y + 5}`} fill="none" stroke={saved ? '#669165' : '#a28955'} strokeWidth="3" strokeDasharray="4 5" />
          <g transform={`translate(${friend.x} ${friend.y})`}>
            <ellipse cy="16" rx="41" ry="12" fill="#8aad71" opacity=".35" />
            {atRescue && <ellipse cy="2" rx="45" ry="34" fill="#fff0a4" fillOpacity=".6" stroke="#be8b37" strokeWidth="2" strokeDasharray="5 4" />}
            <path d="M-39 12 V-43" stroke="#94764d" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M-37 -42 H-6 L-13 -31 -6 -20 H-37Z" fill={saved ? '#5a8970' : '#f4d186'} stroke="#9c8050" strokeWidth="1.2" />
            {saved ? <path d="M-30 -31 L-24 -26 -16 -36" fill="none" stroke="#fff9df" strokeWidth="2.5" strokeLinecap="round" /> : <text x="-23" y="-27" fill="#6d502b" textAnchor="middle" fontSize="14" fontWeight="800">{index + 1}</text>}
            {saved ? <g><circle cy="-4" r="17" fill="#fff7d3" stroke="#749163" strokeWidth="2" /><path d="M-9 -7 Q-10 -17 -1 -13 Q4 -18 10 -13 Q17 -6 -1 5Z" fill="#d99b71" stroke="#a37c55" strokeWidth="1.5" /></g> : <g transform="translate(4 -3)"><Friend index={index} saved={false} /></g>}
            <rect x="-48" y="21" width="98" height="23" rx="11.5" fill="#fff8e7" stroke={atRescue ? '#b99344' : 'none'} />
            <text x="1" y="37" textAnchor="middle" fill="#665032" fontSize="12" fontWeight="800">{saved ? 'ありがとう！' : friend.label}</text>
            {atRescue && rescueProgress > 0 && <g transform="translate(-12 51)">{[0, 1, 2].map(n => <circle key={n} cx={n * 12} r="3.8" fill={n < rescueProgress ? '#bf8d3e' : '#faf4d8'} stroke="#a8874c" strokeWidth="1" />)}</g>}
          </g>
        </g>;
      })}

      <g transform="translate(265 404)"><path d="M-13 7 Q-16 -5 -3 -10 Q10 -9 12 8Z" fill="#9e9378" /><path d="M-22 12 Q-24 2 -13 0 Q-2 2 -4 13Z" fill="#b5a888" /></g>
      {[{ x: 192, y: 532 }, { x: 212, y: 525 }, { x: 477, y: 477 }, { x: 496, y: 486 }, { x: 89, y: 175 }, { x: 175, y: 350 }, { x: 596, y: 523 }, { x: 858, y: 316 }].map((p, i) => <Flower key={i} {...p} color={i % 3 === 0 ? '#e59984' : '#f2d183'} />)}
      <g transform="translate(257 61)" fill="none" stroke="#789478" strokeWidth="2" strokeLinecap="round"><path d="M0 9 Q6 0 13 9 M13 9 Q19 1 25 9 M35 21 Q40 13 46 21 M46 21 Q52 14 57 21" /></g>
      <g className="board-caravan" data-position={progress} transform={`translate(${wagon.x - 67} ${wagon.y - 81}) scale(.8)`} filter={`url(#${uid}-shadow)`}>
        <g transform={progress > chapterEnds[0] && progress <= chapterEnds[1] ? 'translate(168 0) scale(-1 1)' : undefined}><CaravanGlyph characters={characters} rescued={cappedRescued} /></g>
      </g>
      <Tree x={24} y={563} scale={.94} /><Tree x={890} y={570} scale={.86} kind={1} />
    </g>
    <rect x="1" y="1" width="898" height="568" rx="25" fill="none" stroke="#8ba776" strokeOpacity=".3" strokeWidth="2" />
  </svg>;
}
