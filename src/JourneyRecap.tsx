import type { GameState } from './engine';
import { Animal, RescueAnimal } from './Art';
import { chapters, routeChoices } from './adventure';
import './journey-recap.css';

const names = ['こむぎ', 'みみ', 'くるみ', 'そら'];
const thanks = ['はしを わたれたよ！', 'かごが もどったよ！', 'むらへ かえれたよ！'];
const placeName = (detail: string) => detail.replace(/へ$/, '');

/** Celebrate participation and shared choices, without comparing correctness or speed. */
export function JourneyRecap({ game }: { game: GameState }) {
  const chosen = game.routes.map((route, index) => routeChoices[index]?.find(choice => choice.route === route));
  const otherWay = routeChoices[0].find(choice => choice.route !== game.routes[0]);

  return <div className="journey-recap" data-testid="journey-recap">
    <section className="recap-friends" aria-label="たすけた なかまからの おれい">
      <p className="recap-title">3びきから「ありがとう！」</p>
      <div className="recap-friend-list">{chapters.map((chapter, index) => <div key={chapter.friend}>
        <RescueAnimal kind={index} size={42}/><strong>{chapter.friend}</strong><span>{thanks[index]}</span>
      </div>)}</div>
    </section>
    <div className="goal-route-memory">
      <span>みんなで えらんだ みち</span>
      <ol className="recap-routes">{chosen.map((choice, index) => choice && <li key={index}><span>{index + 2}話</span><strong>{placeName(choice.detail)}</strong></li>)}</ol>
    </div>
    <p className="recap-participation">ひとりずつの まなびが、みんなの ちからに。</p>
    <div className="goal-party" aria-label="みんなが とどけた まなび">{game.players.map((player, index) => <div key={player.id}>
      <small>{index + 1}人め</small><Animal kind={player.character} size={46}/><span className="recap-player-name">{names[player.character]}</span><strong>{game.completedByPlayer[index]}もんの まなび</strong>
    </div>)}</div>
    {otherWay && <p className="recap-next-trip">つぎは「{placeName(otherWay.detail)}」も<br/>のぞいてみよう。</p>}
  </div>;
}
