import type { GameState } from './engine';

export const chapters = [
  { title: 'りすの はしわたし', friend: 'りす', tool: 'はしの いた', mission: 'こわれた はしの むこうに、りすさんが まっているよ。' },
  { title: 'ふくろうの おとしもの', friend: 'ふくろう', tool: 'おたすけセット', mission: 'ふくろうさんの たいせつな かごを さがそう。' },
  { title: 'はりねずみの かえりみち', friend: 'はりねずみ', tool: 'ランタン', mission: 'まいごの はりねずみさんに、むらへの みちを おしえよう。' },
] as const;

export function chapterIndex(game: GameState): number {
  const completing = game.phase === 'event' || game.phase === 'goal';
  return Math.min(2, Math.floor(Math.max(0, game.turnsCompleted - (completing ? 1 : 0)) / 4));
}

export function encounter(game: GameState): { title: string; story: string; symbol: string } {
  const stage = chapterIndex(game);
  const slot = (game.turnsCompleted - 1) % 4;
  const river = game.routes[stage - 1] === 'river';
  const stories = stage === 0 ? [
    { title: 'りすさんからの おてがみ', story: '「はしが こわれて、むらへ かえれないの」 みんなで たすけに いこう！', symbol: '✉' },
    { title: 'きつつきの おてつだい', story: 'トントン！ きつつきが はしの いたを けずってくれたよ。おてつだいの じゅんびが すすんだね。', symbol: '♧' },
    { title: 'はしが みえてきた！', story: 'むこうぎしで りすさんが てを ふっているよ。あと ひとつの まなびで、はしを なおす じゅんびが できる！', symbol: '⚑' },
  ] : stage === 1 ? river ? [
    { title: 'すいれんの きのみち', story: 'かわの きのみちを コトコト。みずに うかぶ はっぱの あいだを、さかなが あんないしてくれるよ。', symbol: '≈' },
    { title: 'みずべの おとしもの', story: 'ふくろうさんの かごが、みずべに ひっかかっているよ。ながい ロープを よういしよう。', symbol: '⌁' },
    { title: 'ロープを わすれずに', story: 'かごまで あとすこし。あわてず、みんなで ちからを あわせて ひきあげよう。', symbol: '♡' },
  ] : [
    { title: 'どんぐりの こみち', story: 'みんなで えらんだ もりの みち。どんぐりを ふまないように、ワゴンは ゆっくり すすむよ。', symbol: '♧' },
    { title: 'はっぱの したに…？', story: 'ふくろうさんの かごが、はっぱに かくれているみたい。はっぱを どかす じゅんびを しよう。', symbol: '❧' },
    { title: 'かごを みつけよう', story: 'ふくろうさんの こえが きこえるよ。「あの きの そばを さがしてみて！」', symbol: '♫' },
  ] : river ? [
    { title: 'ゆうやけの かわぞい', story: 'きらきら ひかる かわに そって、むらへ。はりねずみさんが かえりみちを さがしているよ。', symbol: '☀' },
    { title: 'きしべの ランタン', story: 'くらくなる まえに、きしべへ ランタンを ならべよう。あかりが あれば、むらまで まよわないね。', symbol: '✦' },
    { title: 'むらの あかり', story: 'むこうに むらの あかりが みえる！ さいごの まなびを みつけて、はりねずみさんを むかえよう。', symbol: '⌂' },
  ] : [
    { title: 'おおきな きの トンネル', story: 'もりの トンネルは はっぱが いっぱい。はりねずみさんが「どっちへ いけばいいの？」と こまっているよ。', symbol: '♧' },
    { title: 'ランタンの じゅんび', story: 'きの かげでも みえるように、ランタンを ならべよう。まなびの ちからが、やさしい あかりになるよ。', symbol: '✦' },
    { title: 'もうすぐ おかえり', story: 'むらから「おかえり！」の こえが きこえる。さいごの まなびを みつけて、みんなで かえろう。', symbol: '⌂' },
  ];
  return stories[Math.min(2, Math.max(0, slot))];
}

export const routeChoices = [
  [
    { route: 'forest', title: 'もりの みち', detail: 'どんぐりの こみちへ', action: 'はっぱの なかから かごを さがす', symbol: '♧' },
    { route: 'river', title: 'かわの みち', detail: 'すいれんの きのみちへ', action: 'ロープで かごを ひきあげる', symbol: '≈' },
  ],
  [
    { route: 'forest', title: 'もりの みち', detail: 'おおきな きの トンネルへ', action: 'きの かげに あかりを ともす', symbol: '♧' },
    { route: 'river', title: 'かわの みち', detail: 'ゆうやけの かわぞいへ', action: 'きしべに あかりを ならべる', symbol: '≈' },
  ],
] as const;
