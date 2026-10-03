export function Dice({ face, settled, rolling = false }: { face: number; settled: boolean; rolling?: boolean }) {
  const dots = face === 1 ? [[50, 50]] : face === 2 ? [[31, 31], [69, 69]] : [[29, 29], [50, 50], [71, 71]];
  return <div className={`dice ${rolling ? 'dice-tumbling' : settled ? 'dice-settled' : ''}`} data-face={face} data-settled={settled} aria-hidden="true">
    <svg viewBox="0 0 100 100"><rect x="3" y="3" width="94" height="94" rx="21" fill="#fff9e8" stroke="#c99847" strokeWidth="3"/><path d="M15 74 Q16 87 30 87 H73" stroke="#ead29a" strokeWidth="5" fill="none" strokeLinecap="round"/>{dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8.5" fill="#7c562c"/>)}</svg>
  </div>;
}
