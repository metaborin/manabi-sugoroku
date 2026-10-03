import type { Question } from './types';
import { HintVisual } from './HintVisual';
import { hintForQuestion } from './hint-model';
import './learning-support.css';

interface LearningSupportProps {
  question: Question;
  attempts: number;
  hintUsed: boolean;
  helpUsed: boolean;
  exchangeNotice: string;
  onChoose: () => void;
}

/** Keep the opened support beside the question, with an explicit way back to its choices. */
export function LearningSupport({ question, attempts, hintUsed, helpUsed, exchangeNotice, onChoose }: LearningSupportProps) {
  if (attempts === 0 && !hintUsed && !helpUsed && !exchangeNotice) return null;

  return <section className="feedback-space learning-support" aria-label="かんがえる おてつだい" aria-live="polite">
    <h3 className="support-heading" tabIndex={-1} data-testid="learning-support">いっしょに かんがえよう</h3>
    {attempts > 0 && <p className="retry-note">もういちど かんがえてみよう。<br/>まちがえても もどらないよ。</p>}
    {hintUsed && <div className="hint-box"><strong>ひらめきの ヒント</strong><p>{question.hint}</p><HintVisual question={question}/></div>}
    {helpUsed && <div className="help-box">なかまや おうちの人と そうだんしよう。<br/>ひとりなら ヒントを つかってね。<br/><strong>さいごは じぶんで えらんでみよう！</strong></div>}
    {exchangeNotice && <p className="exchange-notice">{exchangeNotice}</p>}
    <button className="secondary full support-return" data-testid="choose-after-support" onClick={onChoose}>こたえを えらぶ ↓</button>
  </section>;
}

/** Reuse only the existing audited diagrams, after an answer has been confirmed. */
export function AnswerExplanation({ question }: { question: Question }) {
  const hasDiagram = hintForQuestion(question) !== null;
  return <div className="answer-explanation" data-testid="answer-explanation">
    <p className="answer-result"><span>こたえ</span><strong>{question.choices[question.answer]}</strong></p>
    <p className="answer-reason">{question.explanation}</p>
    {hasDiagram && <details className="answer-diagram" data-testid="answer-diagram"><summary>ずで たしかめる</summary><div className="answer-diagram-content"><HintVisual question={question}/></div></details>}
  </div>;
}
