import { useId } from 'react';
import { Animal, Caravan } from './Art';
import './world-scenery.css';

export type WorldSceneryProps = {
  variant?: 'title' | 'camp' | 'adventure';
  className?: string;
};

type TreeProps = { x: number; y: number; scale?: number; distant?: boolean; flip?: boolean };

function WoodlandTree({ x, y, scale = 1, distant = false, flip = false }: TreeProps) {
  return <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
    <path d="M-29 9 C-8 -67 -32 -129 -22 -196 C-26 -271 -6 -324 -18 -390 L17 -391 C12 -301 29 -241 15 -177 C2 -109 17 -53 44 9 Q11 -1 -29 9Z" fill={distant ? '#427f78' : '#35594c'} />
    <path d="M-3 -176 Q-40 -239 -97 -272 L-94 -291 Q-39 -272 3 -217 M5 -248 Q49 -293 82 -334 L92 -322 Q68 -267 12 -214" fill={distant ? '#427f78' : '#35594c'} />
    {!distant && <>
      <path d="M-8 -347 Q-13 -259 -7 -205 T3 -60 M-17 -132 Q-5 -86 -15 -26" stroke="#70805a" strokeWidth="4" fill="none" opacity=".55" strokeLinecap="round" />
      <path d="M8 -154 Q-2 -143 6 -124 Q14 -112 18 -127 Q20 -142 8 -154Z" stroke="#213f39" strokeWidth="3" fill="none" />
    </>}
    <path d="M-147 -312 C-174 -345 -143 -384 -121 -386 C-145 -429 -95 -460 -70 -446 C-66 -486 -16 -503 12 -477 C44 -499 87 -477 89 -449 C132 -461 163 -427 145 -391 C183 -365 161 -323 129 -316 C118 -277 75 -271 52 -291 C18 -260 -14 -274 -30 -290 C-76 -270 -112 -287 -114 -307 Q-134 -296 -147 -312Z" fill={distant ? '#518c80' : '#1e6158'} />
    <path d="M-142 -363 C-143 -390 -110 -403 -89 -400 C-105 -435 -68 -461 -41 -449 C-28 -476 12 -480 36 -458 C65 -469 103 -449 100 -424 C135 -426 149 -404 137 -384 C112 -397 84 -380 62 -386 C42 -415 9 -411 -12 -398 C-40 -410 -67 -396 -81 -378 Q-116 -385 -142 -363Z" fill={distant ? '#649789' : '#317668'} />
    {!distant && <>
      <path d="M-92 -423 Q-63 -449 -38 -433 M10 -454 Q35 -454 46 -435 M67 -407 Q94 -421 111 -401" fill="none" stroke="#76a476" strokeWidth="9" strokeLinecap="round" opacity=".48" />
      <path d="M-129 -332 Q-112 -344 -96 -335 M37 -321 Q62 -338 80 -319" fill="none" stroke="#398574" strokeWidth="6" strokeLinecap="round" />
    </>}
  </g>;
}

function Fern({ x, y, scale = 1, flip = false, light = false }: { x: number; y: number; scale?: number; flip?: boolean; light?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`} fill={light ? '#71a879' : '#174f48'}>
    <path d="M0 0 Q6 -80 -48 -119 Q-16 -114 2 -74 Q15 -108 40 -125 Q16 -85 13 -59 Q50 -91 69 -87 Q29 -53 16 -31 Q58 -55 83 -43 Q41 -34 18 -8Z" />
    <path d="M5 -1 Q-10 -61 -65 -79 Q-42 -45 -9 -30 Q-50 -44 -74 -30 Q-41 -11 5 -1Z" />
    <path d="M9 -8 Q8 -57 -14 -87" fill="none" stroke={light ? '#aec089' : '#3b8065'} strokeWidth="2" strokeLinecap="round" />
  </g>;
}

function Lantern({ x, y, scale = 1, length = 115 }: { x: number; y: number; scale?: number; length?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d={`M0 ${-length} V-17`} fill="none" stroke="#b7bd87" strokeWidth="2" />
    <circle cy="14" r="63" fill="#ffdb78" opacity=".035" />
    <circle cy="14" r="40" fill="#ffdf87" opacity=".055" />
    <circle cy="14" r="25" fill="#ffe5a1" opacity=".1" />
    <path d="M-18 -7 Q0 -17 18 -7 L14 31 Q0 40 -14 31Z" fill="#ffd57d" stroke="#795f3d" strokeWidth="3" />
    <path d="M-18 -7 H18 L11 -16 H-11Z M-15 29 H15 L11 36 H-11Z" fill="#5b6545" stroke="#485a43" strokeWidth="2" />
    <path d="M-7 -7 L-5 28 M7 -7 L5 28" stroke="#b68949" strokeWidth="2" />
    <path d="M-3 24 Q-9 14 -2 4 Q-2 10 4 13 Q9 22 2 26Z" fill="#fff2b8" />
    <path d="M-6 -17 Q-7 -27 0 -27 Q7 -27 6 -17" fill="none" stroke="#69714d" strokeWidth="2" />
  </g>;
}

function MeadowFlower({ x, y, scale = 1, coral = false }: { x: number; y: number; scale?: number; coral?: boolean }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M0 5 L-1 28 M-1 20 Q-13 10 -13 17 Q-8 23 -1 23 M-1 13 Q8 3 9 12 Q7 17 -1 16" fill="#467a50" stroke="#467a50" strokeWidth="2" />
    <path d="M0 -5 C9 -17 17 -2 7 2 C19 9 7 20 1 9 C-6 20 -18 9 -7 3 C-19 -3 -7 -16 0 -5Z" fill={coral ? '#d68c6b' : '#f5cc76'} />
    <circle cx="0" cy="3" r="4.5" fill="#fff1b6" />
  </g>;
}

function WayfarerHouse({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-36 -61 H35 L32 0 Q0 8 -33 0Z" fill="#cfbd8a" />
    <path d="M-51 -58 Q-38 -113 -8 -115 Q17 -114 49 -61 Q-3 -45 -51 -58Z" fill="#b57759" />
    <path d="M-39 -73 Q-18 -106 0 -100" fill="none" stroke="#e3a67a" strokeWidth="7" strokeLinecap="round" />
    <path d="M-12 4 V-20 Q0 -38 13 -20 V4" fill="#577d65" />
    <circle cx="-22" cy="-40" r="8" fill="#ffe3a0" /><circle cx="21" cy="-40" r="8" fill="#ffe3a0" />
    <path d="M-22 -48 V-32 M13 -40 H29" stroke="#a88653" strokeWidth="2" />
    <path d="M-46 5 Q-25 -4 -21 7 Q-7 4 0 12 Q26 -1 42 9 L47 15 H-46Z" fill="#79a174" />
  </g>;
}

/** Decorative scenery only. Place in a positioned parent, behind its content. */
export function WorldScenery({ variant = 'title', className = '' }: WorldSceneryProps) {
  const id = `world-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const farTrees = [
    [85, 451, .55], [170, 450, .7], [277, 462, .68], [385, 451, .55],
    [1110, 453, .54], [1204, 473, .67], [1300, 463, .74], [1403, 472, .6], [1520, 479, .74],
  ];
  return <div className={`world-scenery world-scenery--${variant} ${className}`.trim()} aria-hidden="true">
    <svg className="world-scenery__painting" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" focusable="false">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="var(--world-sky-top)" /><stop offset=".56" stopColor="var(--world-sky-bottom)" /><stop offset="1" stopColor="#a9bc86" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx=".52" cy=".04" r=".68">
          <stop stopColor="#ffe6a6" stopOpacity=".68" /><stop offset=".4" stopColor="#f1d697" stopOpacity=".18" /><stop offset="1" stopColor="#e1d39a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-grass`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#819d70" /><stop offset=".5" stopColor="#6d956b" /><stop offset="1" stopColor="#386c56" />
        </linearGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#a3c6ad" /><stop offset=".42" stopColor="#82b7a5" /><stop offset="1" stopColor="#356f70" />
        </linearGradient>
        <linearGradient id={`${id}-path`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#d6c596" /><stop offset="1" stopColor="#b9ab77" />
        </linearGradient>
        <linearGradient id={`${id}-beams`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#fff4c5" stopOpacity=".3" /><stop offset="1" stopColor="#fff4c5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      <rect width="1600" height="740" fill={`url(#${id}-sun)`} />
      <path d="M-30 387 Q117 237 280 304 T585 290 Q726 267 865 322 T1224 276 T1650 289 V670 H-30Z" fill="#719b89" opacity=".48" />
      <path d="M-30 447 Q136 329 319 388 T643 375 T962 374 T1279 354 T1650 371 V650 H-30Z" fill="#82aa8b" opacity=".47" />
      <g opacity=".62">
        {farTrees.map(([x, y, scale], index) => <WoodlandTree key={x} x={x} y={y} scale={scale} distant flip={index % 2 === 0} />)}
      </g>
      <path d="M-10 498 Q190 397 346 464 Q527 477 652 461 Q850 405 997 461 Q1148 432 1339 466 T1610 459 V900 H-10Z" fill={`url(#${id}-grass)`} />
      <path d="M362 466 Q514 415 682 463 T994 452 Q820 442 685 486 T362 466Z" fill="#c5d0a0" opacity=".2" />
      <path d="M-23 561 Q149 478 331 525 T639 523 T989 517 T1637 537 V677 Q1369 584 1022 612 T417 608 T-23 653Z" fill="#8ba976" opacity=".46" />
      <path d="M784 455 C716 506 950 563 1051 617 C1220 707 875 797 664 923 H299 C473 779 942 698 902 636 C861 570 647 529 762 455Z" fill="#9c9f6b" opacity=".5" />
      <path d="M788 455 C733 516 955 568 1037 623 C1156 704 831 803 628 923 H336 C509 785 974 703 926 632 C881 563 668 526 773 455Z" fill={`url(#${id}-path)`} />
      <path d="M781 467 C757 516 959 580 992 621 C1045 688 711 799 543 900" fill="none" stroke="#e0cf99" strokeWidth="9" opacity=".27" />
      <path d="M1178 441 C1153 488 1231 512 1210 565 C1161 650 1307 703 1413 795 C1457 830 1459 865 1478 917 H1650 V886 C1541 783 1365 710 1312 644 C1253 570 1294 522 1238 477Z" fill="#597e62" opacity=".4" />
      <path d="M1203 446 C1169 490 1252 514 1235 565 C1194 650 1330 700 1440 792 C1491 837 1510 877 1531 917 H1641 C1544 805 1374 716 1326 648 C1278 579 1309 520 1251 479Z" fill={`url(#${id}-water)`} />
      <g fill="none" stroke="#c2ddbc" strokeLinecap="round" opacity=".55">
        <path d="M1220 498 L1240 506 M1245 557 L1264 564 M1270 621 L1292 633 M1373 723 L1424 752 M1510 839 L1569 882" strokeWidth="4" />
        <path d="M1223 517 L1243 524 M1255 601 L1274 611 M1392 757 L1419 773 M1444 798 L1472 819" strokeWidth="2" />
      </g>
      <g transform="translate(1296 645) rotate(28)">
        <path d="M-103 -24 Q0 -52 102 -24 V32 Q0 3 -103 32Z" fill="#775f44" />
        <path d="M-103 -34 Q0 -68 102 -34 V19 Q0 -8 -103 19Z" fill="#ba9561" />
        {[-86, -60, -34, -8, 18, 44, 70, 96].map((x) => <path key={x} d={`M${x} ${-59 + Math.abs(x) * .24} V${-9 + Math.abs(x) * .26}`} fill="none" stroke="#8a704c" strokeWidth="2.3" />)}
        <path d="M-106 -41 Q0 -84 108 -41 M-106 9 Q0 -19 108 9" fill="none" stroke="#665b40" strokeWidth="7" strokeLinecap="round" />
        <path d="M-100 -63 V-15 M102 -63 V-15 M-100 -11 V34 M102 -11 V34" stroke="#6f6247" strokeWidth="8" strokeLinecap="round" />
        <path d="M-97 -58 Q0 -103 101 -58" stroke="#b39b6a" strokeWidth="3" fill="none" />
      </g>
      <WayfarerHouse x={341} y={489} scale={.86} />
      <WayfarerHouse x={260} y={495} scale={.56} />
      <path d="M226 502 Q282 484 353 507" fill="none" stroke="#698d61" strokeWidth="13" strokeLinecap="round" />
      <g className="world-scenery__sunbeams" fill={`url(#${id}-beams)`}>
        <path d="M766 -60 L446 695 H602 L839 -60Z" /><path d="M867 -60 L949 594 H1016 L914 -60Z" /><path d="M1000 -60 L1370 720 H1450 L1040 -60Z" />
      </g>
      <g opacity=".8">
        <WoodlandTree x={144} y={637} scale={1.05} /><WoodlandTree x={1452} y={636} scale={1.05} flip />
      </g>
      {variant === 'camp' && <g transform="translate(315 640)">
        <ellipse cy="12" rx="98" ry="22" fill="#355e47" opacity=".26" />
        <path d="M-94 1 L-19 -111 76 -14 98 9Z" fill="#e0b466" />
        <path d="M-94 1 L-19 -111 24 3Z" fill="#eecb83" />
        <path d="M-71 3 L-22 -76 2 6Z" fill="#526d52" />
        <path d="M-23 -114 L-12 -130 M-95 5 L-110 18 M99 11 L111 24" stroke="#967c54" strokeWidth="4" strokeLinecap="round" />
        <path d="M-36 -74 L-24 -39 -56 5" stroke="#bba269" strokeWidth="3" fill="none" />
        <Lantern x={85} y={-27} scale={.54} length={80} />
      </g>}
      <path d="M-28 740 Q181 627 429 724 Q265 732 301 829 Q163 868 -28 855Z" fill="#477954" />
      <path d="M1320 814 Q1442 744 1630 749 V919 H1307Z" fill="#315f4e" />
      <g fill="#aec085" opacity=".28">
        <path d="M304 595 Q343 568 407 590 Q365 584 349 604Z M565 716 Q609 688 660 710 Q616 710 600 727Z M1057 501 Q1092 474 1138 493 Q1099 493 1080 510Z" />
      </g>
      <g transform="translate(1162 716)">
        <path d="M-40 25 Q-43 -9 -10 -16 Q16 -25 35 2 L43 24Z" fill="#87947c" />
        <path d="M-40 25 Q-43 0 -20 -9 Q-17 18 11 25Z" fill="#748771" />
        <path d="M-20 -8 Q0 -22 24 -3" stroke="#aebb94" strokeWidth="6" strokeLinecap="round" fill="none" />
        <Fern x={-26} y={28} scale={.36} light />
      </g>
      <g transform="translate(204 690)">
        <path d="M-4 27 L-3 -9 H13 L15 28Z" fill="#e3cca0" />
        <path d="M-35 -6 Q-32 -40 0 -49 Q30 -40 43 -6 Q8 8 -35 -6Z" fill="#c87f60" />
        <path d="M-24 -17 Q-17 -35 0 -38" fill="none" stroke="#e6a476" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="7" cy="-21" rx="8" ry="7" fill="#f8deb0" /><circle cx="25" cy="-10" r="4" fill="#f8deb0" />
        <path d="M33 31 V13 H41 V30Z" fill="#e3cca0" /><path d="M18 15 Q25 -8 37 -5 Q48 0 54 17Z" fill="#d4986d" />
      </g>
      <g transform="translate(1454 791) rotate(22)">
        <path d="M-24 0 L27 0 10 14 -12 11Z" fill="#e6cf94" /><path d="M-17 -2 L-1 -20 0 -2Z" fill="#fff1c0" /><path d="M3 -21 L25 -3 H3Z" fill="#ccbd8b" />
        <path d="M-28 20 H15 M-14 28 H23" stroke="#afd2b5" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <WoodlandTree x={-7} y={861} scale={1.81} /><WoodlandTree x={1632} y={866} scale={1.87} flip />
      <path d="M-50 -20 H606 Q588 23 548 22 Q530 65 485 46 Q462 83 418 62 Q377 90 340 69 Q315 117 262 90 Q221 135 161 100 Q94 126 49 95 Q-12 109 -50 77Z" fill="#184e48" />
      <path d="M1640 -20 H1139 Q1146 24 1173 25 Q1190 71 1234 57 Q1248 98 1297 75 Q1331 115 1380 91 Q1427 131 1469 100 Q1522 132 1573 103 Q1616 109 1640 91Z" fill="#194e47" />
      <path d="M91 62 Q157 54 178 80 M290 51 Q322 49 340 67 M1291 52 Q1329 45 1356 76 M1443 58 Q1499 54 1520 86" fill="none" stroke="#35765f" strokeWidth="10" strokeLinecap="round" opacity=".65" />
      <path d="M203 12 Q248 49 264 142 Q270 208 322 227" fill="none" stroke="#46795b" strokeWidth="4" />
      <path d="M1298 28 Q1268 73 1284 138 Q1300 192 1270 212" fill="none" stroke="#4a7a5b" strokeWidth="4" />
      <g fill="#79965f">
        <path d="M251 104 Q225 90 224 111 Q235 127 255 126Z M267 151 Q291 128 298 150 Q292 170 273 170Z M1279 109 Q1253 93 1250 115 Q1262 131 1281 130Z M1288 161 Q1317 143 1319 164 Q1307 181 1283 180Z" />
      </g>
      <Lantern x={253} y={292} length={170} /><Lantern x={1352} y={274} scale={.85} length={212} />
      <g className="world-scenery__fireflies" fill="#f8df93">
        {[{ x: 294, y: 319, r: 2.5 }, { x: 352, y: 351, r: 2 }, { x: 1120, y: 265, r: 2.2 }, { x: 1215, y: 346, r: 3 }, { x: 366, y: 603, r: 2.5 }, { x: 1095, y: 694, r: 3 }, { x: 1364, y: 444, r: 2 }, { x: 934, y: 89, r: 1.8 }].map((dot, i) => <g key={i} className={`world-scenery__mote world-scenery__mote--${i % 3}`}>
          <circle cx={dot.x} cy={dot.y} r={dot.r * 3.7} opacity=".06" /><circle cx={dot.x} cy={dot.y} r={dot.r} />
        </g>)}
      </g>
      <g className="world-scenery__foreground">
        <path d="M-30 894 Q11 846 71 868 Q97 814 149 848 Q177 802 226 839 Q276 818 299 856 Q343 839 358 899Z" fill="#205746" />
        <path d="M1280 910 Q1315 835 1383 861 Q1405 809 1455 836 Q1502 786 1542 829 Q1590 811 1630 850 V920Z" fill="#1e5146" />
        <Fern x={64} y={860} scale={1.45} /><Fern x={166} y={906} scale={1.35} light /><Fern x={290} y={924} scale={.9} flip />
        <Fern x={1574} y={865} scale={1.4} flip /><Fern x={1450} y={934} scale={1.18} flip light /><Fern x={1327} y={952} scale={1.18} />
        <MeadowFlower x={242} y={816} scale={1.12} /><MeadowFlower x={284} y={845} scale={.8} coral />
        <MeadowFlower x={1356} y={847} scale={.9} /><MeadowFlower x={1403} y={833} scale={.66} coral />
      </g>
      <g transform="translate(1053 149) rotate(13)" fill="none" stroke="#c4cd9e" strokeWidth="3" strokeLinecap="round" opacity=".7">
        <path d="M-20 1 Q-13 -9 -2 1 Q7 -10 15 -2 M12 22 Q19 11 29 19 Q35 11 43 17" />
      </g>
    </svg>
    <div className="world-scenery__shade" />
  </div>;
}

export type TitleCaravanProps = { className?: string; characters?: number[] };

/** Two companions ride, two wait beside the wagon; the same four cast members. */
export function TitleCaravan({ className = '', characters = [0, 1, 2, 3] }: TitleCaravanProps) {
  const party = characters.length ? characters.slice(0, 4) : [0, 1, 2, 3];
  return <div className={`title-caravan ${className}`.trim()} aria-hidden="true">
    <svg className="title-caravan__ground" viewBox="0 0 600 390" focusable="false">
      <ellipse cx="311" cy="327" rx="257" ry="33" fill="#284e3d" opacity=".23" />
      <path d="M68 337 Q30 312 50 291 Q64 286 82 310 Q76 268 96 269 Q117 274 113 321 Q137 292 155 308 L149 340Z" fill="#548256" />
      <path d="M493 340 Q479 306 494 294 Q510 293 513 318 Q521 278 539 287 Q551 300 532 325 Q558 310 567 327 L557 343Z" fill="#3d7653" />
      <path d="M106 344 Q165 359 223 349 M410 350 Q459 359 496 346" fill="none" stroke="#aac282" strokeWidth="4" strokeLinecap="round" opacity=".65" />
      <MeadowFlower x={79} y={334} scale={.6} /><MeadowFlower x={535} y={330} scale={.7} coral />
      <g transform="translate(484 142) rotate(12)">
        <path d="M-12 -3 Q-24 -16 -28 -8 Q-33 6 -15 10 Q-24 26 -13 28 Q-1 24 -6 9 Q13 18 17 6 Q17 -9 1 0Z" fill="#e9bc72" />
        <path d="M-8 0 L-5 15" stroke="#795e43" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
    <div className="title-caravan__wagon"><Caravan characters={party.slice(0, 2)} /></div>
    {party.slice(2).map((kind, index) => <div key={index} className={`title-caravan__companion title-caravan__companion--${index}`}><Animal kind={kind} size={145} /></div>)}
  </div>;
}
