import { useId } from 'react';
import type { Question } from './types';
import { describeHint, hintForQuestion } from './hint-model';
import type { VisualHint } from './hint-model';

const ink = '#42594a';
const green = '#46785b';
const amber = '#a96329';

function TenFrame({ x, amount, removed = 0, square = false }: { x: number; amount: number; removed?: number; square?: boolean }) {
  return <g transform={`translate(${x} 29)`}>
    {Array.from({ length: 10 }, (_, index) => {
      const cx = (index % 5) * 25 + 12.5;
      const cy = Math.floor(index / 5) * 25 + 12.5;
      const crossed = index >= amount - removed && index < amount;
      return <g key={index}>
        <rect x={cx - 12.5} y={cy - 12.5} width="25" height="25" fill="#fffdf5" stroke="#8e9d85" />
        {index < amount && (square
          ? <rect x={cx - 7} y={cy - 7} width="14" height="14" rx="2" fill={amber} />
          : <circle cx={cx} cy={cy} r="8" fill={crossed ? '#ebe3d3' : green} stroke={green} strokeWidth="1.5" />)}
        {crossed && <path d={`M${cx - 8} ${cy + 8} L${cx + 8} ${cy - 8}`} stroke="#6e4033" strokeWidth="3" strokeLinecap="round" />}
      </g>;
    })}
  </g>;
}

function Counters({ hint }: { hint: Extract<VisualHint, { kind: 'counters' }> }) {
  if (hint.operation === 'subtract') return <>
    <text x="180" y="19" textAnchor="middle">{hint.first}こから {hint.second}こ とるよ</text>
    <TenFrame x={117.5} amount={hint.first} removed={hint.second} />
  </>;
  return <>
    <text x="90" y="19" textAnchor="middle">{hint.first}こ</text>
    <TenFrame x={27.5} amount={hint.first} />
    <text x="180" y="62" textAnchor="middle" fontSize="28">+</text>
    <text x="270" y="19" textAnchor="middle">{hint.second}こ</text>
    <TenFrame x={207.5} amount={hint.second} square />
  </>;
}

function GroupBoxes({ each, groups }: { each: number; groups: number }) {
  const columns = Math.min(4, groups);
  const rows = Math.ceil(groups / columns);
  const boxWidth = 72;
  const boxHeight = 37;
  const gap = 12;
  const left = (360 - columns * boxWidth - (columns - 1) * gap) / 2;
  const top = (94 - rows * boxHeight - (rows - 1) * 8) / 2;
  return <>
    {Array.from({ length: groups }, (_, index) => <g key={index} transform={`translate(${left + (index % columns) * (boxWidth + gap)} ${top + Math.floor(index / columns) * (boxHeight + 8)})`}>
      <rect width={boxWidth} height={boxHeight} rx="8" fill="#fffdf5" stroke={ink} strokeWidth="1.6" />
      {Array.from({ length: each }, (_, n) => <circle
        key={n}
        cx={12 + (n % 4) * 16}
        cy={each <= 4 ? 18.5 : 11 + Math.floor(n / 4) * 15}
        r="4.8"
        fill={green}
      />)}
    </g>)}
  </>;
}

function Sharing({ total, people }: { total: number; people: number }) {
  const columns = 9;
  return <>
    {Array.from({ length: total }, (_, index) => <circle key={index} cx={84 + (index % columns) * 24} cy={13 + Math.floor(index / columns) * 17} r="5.5" fill={green} />)}
    <path d="M174 47 L180 54 186 47" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    {Array.from({ length: people }, (_, index) => <g key={index} transform={`translate(${75 + index * 105} 73)`}>
      <ellipse rx="41" ry="15" fill="#fffdf5" stroke={ink} strokeWidth="1.8" />
      <ellipse rx="32" ry="9" fill="none" stroke="#aab49e" />
      <text textAnchor="middle" y="5" fontSize="15">？</text>
    </g>)}
  </>;
}

function FractionBars({ hint }: { hint: Extract<VisualHint, { kind: 'fraction' }> }) {
  const width = 240 / hint.denominator;
  return <>
    {[hint.first, hint.second].map((filled, row) => <g key={row} transform={`translate(0 ${row * 47})`}>
      <text x="10" y="29">{row === 1 ? (hint.operation === 'add' ? '+ ' : '− ') : ''}{filled}/{hint.denominator}</text>
      {Array.from({ length: hint.denominator }, (_, cell) => <g key={cell}>
        <rect x={90 + cell * width} y="9" width={width} height="28" fill={cell < filled ? (row === 0 ? green : '#f1d0a5') : '#fffdf5'} stroke={ink} strokeWidth="1.2" />
        {row === 1 && cell < filled && <circle cx={90 + (cell + 0.5) * width} cy="23" r="3" fill={amber} />}
      </g>)}
      <text x="341" y="30" fontSize="14">1</text>
    </g>)}
  </>;
}

/** Mount inside the opened text hint only; no new controls or animations. */
export function HintVisual({ question }: { question: Question }) {
  const id = useId();
  const hint = hintForQuestion(question);
  if (!hint) return null;
  const { caption, description } = describeHint(hint);
  return <figure className="hint-visual" data-hint-kind={hint.kind} style={{ margin: '8px 0 0', maxWidth: 380, color: ink }}>
    <svg viewBox="0 0 360 96" width="100%" height="96" role="img" aria-labelledby={`${id}-caption ${id}-description`} style={{ display: 'block', fontFamily: 'inherit', fontSize: 17, fontWeight: 700 }}>
      <desc id={`${id}-description`}>{description}</desc>
      <g aria-hidden="true" fill={ink}>
        {hint.kind === 'counters' && <Counters hint={hint} />}
        {hint.kind === 'groups' && <GroupBoxes each={hint.each} groups={hint.groups} />}
        {hint.kind === 'division' && (hint.mode === 'share'
          ? <Sharing total={hint.total} people={hint.divisor} />
          : <GroupBoxes each={hint.divisor} groups={hint.total / hint.divisor} />)}
        {hint.kind === 'fraction' && <FractionBars hint={hint} />}
      </g>
    </svg>
    <figcaption id={`${id}-caption`} style={{ marginTop: 2, fontSize: 14, lineHeight: '20px', textAlign: 'center', fontWeight: 700 }}>{caption}</figcaption>
  </figure>;
}
