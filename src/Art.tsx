import { useId } from 'react';

type AnimalProps = { kind: number; size?: number; className?: string };
export type BoardProps = {
  position: number;
  totalDistance: number;
  rescued: number;
  route: string;
  characters: number[];
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

function CaravanGlyph({ characters }: { characters: number[] }) {
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
          <AnimalGlyph kind={kind} />
        </g>
      ))}
      <path d="M17 76 Q84 84 153 74 L152 90 Q86 102 18 91Z" fill="#f6c451" />
      <path d="M48 85 H75 M99 84 H125" stroke="#fff0b8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="41" cy="99" r="12" fill="#665348" /><circle cx="41" cy="99" r="5" fill="#dac49a" stroke="none" />
      <circle cx="128" cy="99" r="12" fill="#665348" /><circle cx="128" cy="99" r="5" fill="#dac49a" stroke="none" />
      <path d="M154 88 H165 Q171 88 173 83" fill="none" strokeLinecap="round" />
      <path d="M78 82 L84 74 90 82 87 91 80 91Z" fill="#fff2bd" stroke="#a77d36" strokeWidth="1.5" />
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
const segments: [Point, Point, Point, Point][] = [
  [{ x: 97, y: 465 }, { x: 196, y: 442 }, { x: 352, y: 493 }, { x: 446, y: 443 }],
  [{ x: 446, y: 443 }, { x: 560, y: 383 }, { x: 756, y: 434 }, { x: 729, y: 338 }],
  [{ x: 729, y: 338 }, { x: 706, y: 271 }, { x: 491, y: 334 }, { x: 382, y: 327 }],
  [{ x: 382, y: 327 }, { x: 251, y: 320 }, { x: 164, y: 278 }, { x: 233, y: 214 }],
  [{ x: 233, y: 214 }, { x: 302, y: 151 }, { x: 420, y: 176 }, { x: 494, y: 196 }],
  [{ x: 494, y: 196 }, { x: 588, y: 221 }, { x: 699, y: 248 }, { x: 762, y: 171 }],
  [{ x: 762, y: 171 }, { x: 778, y: 154 }, { x: 796, y: 136 }, { x: 796, y: 102 }],
];
const pathData = 'M97 465 C196 442 352 493 446 443 C560 383 756 434 729 338 C706 271 491 334 382 327 C251 320 164 278 233 214 C302 151 420 176 494 196 C588 221 699 248 762 171 C778 154 796 136 796 102';
const routePoints: (Point & { distance: number })[] = [];
let pathLength = 0;
for (const segment of segments) {
  for (let n = 0; n <= 40; n += 1) {
    const t = n / 40;
    const u = 1 - t;
    const point = {
      x: u ** 3 * segment[0].x + 3 * u ** 2 * t * segment[1].x + 3 * u * t ** 2 * segment[2].x + t ** 3 * segment[3].x,
      y: u ** 3 * segment[0].y + 3 * u ** 2 * t * segment[1].y + 3 * u * t ** 2 * segment[2].y + t ** 3 * segment[3].y,
    };
    const previous = routePoints.at(-1);
    if (previous) pathLength += Math.hypot(point.x - previous.x, point.y - previous.y);
    routePoints.push({ ...point, distance: pathLength });
  }
}

function onPath(fraction: number): Point {
  const distance = Math.min(1, Math.max(0, fraction)) * pathLength;
  const next = routePoints.findIndex((point) => point.distance >= distance);
  if (next <= 0) return routePoints[0];
  const a = routePoints[next - 1];
  const b = routePoints[next];
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

export function Board({ position, totalDistance, rescued, route, characters }: BoardProps) {
  const uid = useId().replace(/:/g, '');
  const distance = Math.max(1, Math.round(totalDistance));
  const progress = Math.max(0, Math.min(distance, position));
  const wagon = onPath(progress / distance);
  const count = Math.min(60, distance);
  const riverRoute = route === 'river';
  const friends = [
    { x: 529, y: 477, label: 'りす', flag: 1 },
    { x: 448, y: 262, label: 'ふくろう', flag: 2 },
    { x: 428, y: 112, label: 'はりねずみ', flag: 3 },
  ];
  return <svg
    className="adventure-board"
    width="100%"
    viewBox="0 0 900 570"
    role="img"
    aria-label={`ぼうけんの ちず。${distance}マスの うち ${progress}マス。ともだちを ${rescued}ひき たすけたよ。`}
    style={{ display: 'block', overflow: 'visible' }}
  >
    <defs>
      <linearGradient id={`${uid}-land`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#e1edcf" /><stop offset="1" stopColor="#b9d49e" /></linearGradient>
      <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a3d9d7" /><stop offset="1" stopColor="#78bfc8" /></linearGradient>
      <filter id={`${uid}-shadow`} x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="3" stdDeviation="2.4" floodColor="#50623b" floodOpacity=".16" /></filter>
      <clipPath id={`${uid}-map-clip`}><rect x="0" y="0" width="900" height="570" rx="26" /></clipPath>
    </defs>
    <g clipPath={`url(#${uid}-map-clip)`}>
      <rect width="900" height="570" rx="26" fill={`url(#${uid}-land)`} />
      <path d="M-40 105 Q125 1 326 58 T641 55 T950 83 V0 H-40Z" fill="#d0e3b8" />
      <path d="M-50 156 Q71 119 161 144 Q267 173 280 112 Q385 35 545 120 Q696 158 928 86" stroke="#c2dcaa" strokeWidth="40" fill="none" />
      <path d="M-48 432 Q124 373 258 420 T471 475 T710 460 T933 477 V601 H-48Z" fill="#bad49c" />
      <path d="M-49 559 Q115 498 252 542 T531 526 T933 536" stroke="#aeca8d" strokeWidth="42" fill="none" />
      <path d="M691 -40 C758 72 661 119 694 209 S846 315 794 405 S733 517 777 611" stroke="#dbe7bb" strokeWidth="92" fill="none" />
      <path d="M691 -40 C758 72 661 119 694 209 S846 315 794 405 S733 517 777 611" stroke={`url(#${uid}-water)`} strokeWidth="66" fill="none" />
      <g stroke="#d3efdf" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".8">
        <path d="M704 39 L720 43 M685 105 L701 109 M704 243 L725 252 M781 323 L803 329 M773 425 L789 418 M741 512 L762 512" />
        <path d="M700 45 L711 48 M695 111 L708 114 M716 260 L731 265 M783 337 L795 341 M769 438 L780 434 M746 520 L764 520" />
      </g>
      <ellipse cx="80" cy="189" rx="64" ry="27" fill="#c3dca6" />
      <ellipse cx="426" cy="260" rx="107" ry="29" fill="#cbe0ad" />
      <ellipse cx="603" cy="359" rx="94" ry="16" fill="#afd093" opacity=".6" />
      <g opacity=".65" fill="#87af73">
        <path d="M111 318 l-5 -10 9 5 4 -11 4 12 8 -4 -4 9Z M332 102 l-5 -8 8 3 4 -8 3 10 7 -4 -3 8Z M574 495 l-5 -8 9 4 4 -9 3 11 7 -5 -3 9Z M837 255 l-5 -8 9 3 3 -8 4 11 7 -4 -3 8Z" />
      </g>
      <Tree x={56} y={124} scale={1.02} /><Tree x={120} y={109} scale={.8} kind={1} />
      <Tree x={165} y={156} scale={.85} /><Tree x={49} y={292} scale={.72} kind={1} />
      <Tree x={92} y={278} scale={.86} /><Tree x={369} y={115} scale={.73} />
      <Tree x={574} y={114} scale={.85} kind={1} /><Tree x={619} y={94} scale={.95} />
      <Tree x={851} y={182} scale={.79} kind={1} /><Tree x={871} y={330} scale={1.03} />
      <Tree x={841} y={487} scale={.8} kind={1} />
      <House x={72} y={385} scale={.78} /><House x={117} y={392} scale={.47} color="#d7a552" />
      <g transform="translate(349 253)">
        <path d="M-30 12 Q-29 -3 -13 -6 Q1 -18 13 -2 Q30 -6 34 13Z" fill="#83ac74" />
        <path d="M-14 8 Q-13 -1 -4 -4 Q6 -7 12 6" fill="#a8c78e" />
      </g>
      <g transform="translate(485 113) rotate(-8)">
        <path d="M-28 2 Q-28 -9 -10 -9 H17 Q29 -9 29 2 V12 H-28Z" fill="#d2ab72" stroke="#957e54" strokeWidth="2" />
        <path d="M-20 10 V22 M18 10 V22 M-30 3 H30" stroke="#8b7450" strokeWidth="3" />
        <path d="M-8 -10 V-21 M-2 -10 V-18 M5 -10 V-23 M12 -10 V-19" stroke="#9cab7a" strokeWidth="4" />
      </g>
      <g fill="none" strokeLinecap="round">
        <path d={pathData} stroke="#8f9e70" strokeWidth="43" opacity=".16" transform="translate(0 4)" />
        <path d={pathData} stroke="#d7c8a1" strokeWidth="42" />
        <path d={pathData} stroke="#fff0cf" strokeWidth="35" />
        <path d={pathData} stroke="#fff9e8" strokeWidth="24" opacity=".55" />
      </g>
      <g transform="translate(709 210) rotate(-24)" stroke="#947043" strokeWidth="2">
        <rect x="-43" y="-24" width="86" height="48" rx="3" fill="#c89964" />
        {[-34, -22, -10, 2, 14, 26, 38].map((x) => <path key={x} d={`M${x} -21 V21`} />)}
        <path d="M-46 -25 H46 M-46 25 H46" stroke="#b28653" strokeWidth="6" strokeLinecap="round" />
        <path d="M-43 -32 V-18 M43 -32 V-18 M-43 19 V33 M43 19 V33" stroke="#7a6548" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g fontFamily="'Noto Sans JP', 'Yu Gothic', sans-serif" fontWeight="800" textAnchor="middle">
        {Array.from({ length: count + 1 }, (_, i) => {
          const value = Math.round(i * distance / count);
          const p = onPath(i / count);
          const complete = value <= progress;
          const special = i > 0 && i < count && [1, 2, 3].some((n) => Math.round(count * n / 4) === i);
          return <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <circle r={i === 0 || i === count ? 18 : count > 32 ? 9 : 12.5} fill={complete ? '#f6c970' : '#fffaf0'} stroke={complete ? '#b3914c' : '#d3c297'} strokeWidth="1.5" />
            {special || i === count ? <path d="M0 -7 L2 -2 8 -2 3 2 4 7 0 4 -4 7 -3 2 -8 -2 -2 -2Z" fill={complete ? '#a5712b' : '#b4a475'} /> : <text y="4" fill={complete ? '#76572a' : '#867b61'} fontSize={count > 32 ? 9 : 11}>{value}</text>}
          </g>;
        })}
      </g>
      <g transform="translate(112 500)" fontFamily="'Noto Sans JP', 'Yu Gothic', sans-serif">
        <path d="M-43 -12 H60 L68 1 60 14 H-43Z" fill="#fff8e7" stroke="#c3ab7c" strokeWidth="1.6" />
        <text x="10" y="5" textAnchor="middle" fill="#725a36" fontSize="14" fontWeight="800">しゅっぱつ</text>
      </g>
      <g transform="translate(803 84)">
        <House x={-44} y={-12} scale={.55} color="#b97c77" /><House x={30} y={-4} scale={.7} color="#c9855d" />
        <path d="M-15 1 V-62" stroke="#88724f" strokeWidth="4" strokeLinecap="round" />
        <path d="M-13 -61 Q2 -72 17 -60 V-39 Q2 -51 -13 -40Z" fill="#e5a45e" stroke="#a07146" strokeWidth="1.5" />
        <path d="M-7 -55 L-3 -50 6 -57" stroke="#fff6d7" strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="-51" y="-5" width="93" height="27" rx="13.5" fill="#fff8e4" stroke="#beaa77" strokeWidth="1.5" />
        <text x="-4" y="14" fill="#715937" fontSize="15" fontWeight="800" textAnchor="middle">ゴールの むら</text>
      </g>
      {friends.map((friend, index) => <g key={friend.label} transform={`translate(${friend.x} ${friend.y})`}>
        <ellipse cx="0" cy="15" rx="43" ry="13" fill="#9fbc80" opacity=".4" />
        <path d="M-37 12 V-43" stroke="#9e7d52" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M-35 -42 H-3 L-10 -31 -3 -20 H-35Z" fill={rescued > index ? '#5d9674' : '#f4d186'} stroke="#a48d5f" strokeWidth="1.2" />
        <text x="-21" y="-27" fill={rescued > index ? '#fffaf0' : '#735935'} textAnchor="middle" fontSize="14" fontWeight="800">{rescued > index ? '✓' : friend.flag}</text>
        <g transform="translate(4 -3)"><Friend index={index} saved={rescued > index} /></g>
        <rect x="-38" y="20" width="80" height="21" rx="10.5" fill="#fff8e7" opacity=".96" />
        <text x="2" y="35" textAnchor="middle" fill="#665439" fontSize="12" fontWeight="800">{rescued > index ? 'ありがとう！' : friend.label}</text>
      </g>)}
      <g transform="translate(272 381)">
        <path d="M-13 7 Q-16 -5 -3 -10 Q10 -9 12 8Z" fill="#9e9378" />
        <path d="M-22 12 Q-24 2 -13 0 Q-2 2 -4 13Z" fill="#b5a888" />
        <path d="M8 14 L5 5 11 7 14 0 18 9 23 7 20 14Z" fill="#86aa6e" />
      </g>
      <g transform="translate(572 280)">
        <path d="M-10 9 V-5 H0 V9" fill="#f5e7b8" stroke="#a98659" strokeWidth="1.4" />
        <path d="M-21 -5 Q-17 -28 -6 -27 Q7 -26 13 -5Z" fill="#d68b67" stroke="#aa7657" strokeWidth="1.5" />
        <circle cx="-8" cy="-16" r="4" fill="#fff0cf" /><circle cx="3" cy="-10" r="3" fill="#fff0cf" />
      </g>
      {[{ x: 192, y: 515 }, { x: 212, y: 507 }, { x: 446, y: 367 }, { x: 461, y: 376 }, { x: 103, y: 188 }, { x: 514, y: 145 }, { x: 586, y: 523 }, { x: 816, y: 289 }].map((p, i) => <Flower key={i} {...p} color={i % 3 === 0 ? '#e99f8b' : '#f2d183'} />)}
      <g transform="translate(502 34)">
        <path d="M0 9 Q6 0 13 9 M13 9 Q19 1 25 9" fill="none" stroke="#789478" strokeWidth="2" strokeLinecap="round" />
        <path d="M35 21 Q40 13 46 21 M46 21 Q52 14 57 21" fill="none" stroke="#789478" strokeWidth="2" strokeLinecap="round" />
      </g>
      {riverRoute ? <g transform="translate(783 469)">
        <path d="M-12 -4 Q0 -18 12 -5 Q21 -2 12 5 Q0 15 -12 4 L-22 12 V-12Z" fill="#e9aa6e" stroke="#b7845b" strokeWidth="1.5" />
        <circle cx="11" cy="-3" r="1.8" fill="#574d3d" />
        <circle cx="26" cy="-16" r="3" stroke="#dff5e7" strokeWidth="2" fill="none" />
      </g> : <g transform="translate(407 86)">
        <path d="M0 0 Q-20 -21 -23 -5 Q-25 7 -4 6 Q-13 23 -1 20 Q9 14 3 5 Q26 8 24 -6 Q20 -20 2 0Z" fill="#dcac64" />
        <path d="M0 -2 L3 13" stroke="#907b52" strokeWidth="2" strokeLinecap="round" />
      </g>}
      <g className="board-caravan" transform={`translate(${wagon.x - 67} ${wagon.y - 81}) scale(.8)`} filter={`url(#${uid}-shadow)`}>
        <CaravanGlyph characters={characters} />
      </g>
      <Tree x={26} y={563} scale={1.06} /><Tree x={891} y={569} scale={.96} kind={1} />
    </g>
    <rect x="1" y="1" width="898" height="568" rx="25" fill="none" stroke="#8ba776" strokeOpacity=".3" strokeWidth="2" />
  </svg>;
}
