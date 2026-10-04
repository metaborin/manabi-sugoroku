import type { Pwa } from './usePwa';

export function PwaPanel({ pwa }: { pwa: Pwa }) {
  return <section className="pwa-panel" aria-label="アプリとオフライン" data-testid="pwa-panel">
    <h3>アプリと オフライン</h3>
    <p className="pwa-readiness" role="status" data-testid="offline-status" data-state={pwa.offline}>
      {pwa.offline === 'ready' ? '✓ インターネットなしで あそぶ じゅんびが できたよ。' : pwa.offline === 'preparing' ? 'ゲームを たんまつに じゅんびしているよ…' : pwa.offline === 'error' ? 'まだ オフラインの じゅんびが できていないよ。ネットに つないで ためしてね。' : 'この ブラウザでは オフラインの じゅんびが できないよ。ネットに つないで あそんでね。'}
    </p>
    {!pwa.online && <p>いまは ネットワークに つながっていないよ。</p>}
    {pwa.offline === 'error' && <button className="secondary full" onClick={pwa.retry}>じゅんびを やりなおす</button>}
    {pwa.canInstall && !pwa.installed && <button className="secondary full" onClick={() => void pwa.install()}>アプリを いれる</button>}
    {pwa.installed && <p>アプリで ひらいているよ。</p>}
    {pwa.installNotice && <p role="status">{pwa.installNotice}</p>}
    <details><summary>アプリの いれかた・つかいかた</summary><p>Chromebook・Chrome・Edgeは、ブラウザの メニューの「アプリをインストール」や「このページをアプリとしてインストール」から ついかできます。表示されない場合も、ブラウザで遊べます。</p><p>iPhone・iPadは Safariの「共有」→「ホーム画面に追加」を使います。</p><p>はじめは ネットに つないで「じゅんびが できたよ」を まってね。全360問とゲームの絵を端末に用意します。読み上げは端末内の日本語音声がある場合だけ使えます。</p><p>つづきは「ひとやすみ」→「ここまでを ほぞん」で残してね。アプリを入れても自動保存にはなりません。端末の空き容量やブラウザのデータ削除により、オフライン用データや保存が消えることがあります。</p></details>
    {pwa.updateReady && <div className="pwa-update-help" role="status" data-testid="pwa-update-help"><strong>あたらしい ゲームの じゅんびが できたよ。</strong><p>いまの ぼうけんは そのまま つづけられるよ。区切りで「ここまでを ほぞん」して、このゲームのすべてのタブとアプリを閉じ、もう一度開くと更新されます。自動では読み直しません。</p></div>}
  </section>;
}
