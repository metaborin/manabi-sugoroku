# アプリとして使う・オフラインで遊ぶ

公開URLをオンラインで開き、「せってい」の「アプリと オフライン」で準備完了を確認します。全360問、説明、ゲームの絵、画面と操作に必要なJavaScript・CSSを端末に保存してから完了を表示します。読み上げは端末内の日本語音声がある場合だけ使います。

ChromebookのChrome、PCのChrome/Edgeでは、表示された「アプリを いれる」ボタン、またはブラウザメニューのインストール項目を使えます。iPhone/iPadはSafariの「共有」→「ホーム画面に追加」を使います。インストールUIの有無や文言はブラウザによって異なります。インストールしなくてもブラウザで遊べます。

ゲームは従来どおり明示保存です。「ひとやすみ」→「ここまでを ほぞん」で残してください。保存キー `manabi-sugoroku-save-v1` と旧版からの復帰処理は変更していません。ブラウザのデータ削除や端末の容量不足でキャッシュ・保存が失われた場合は、オンラインで準備し直してください。

## 更新で冒険を中断しない

新しいゲームを裏で準備しても、自動で読み直しません。更新の案内が出たら区切りで保存し、このゲームのすべてのタブとアプリのウィンドウを閉じ、もう一度開きます。新しいService Workerはそれまでwaitingのままです。`skipWaiting()`、強制的な`clients.claim()`、`controllerchange`によるreloadは使いません。

## 実装と検証

- Manifestの`id`・`start_url`・`scope`: `/manabi-sugoroku/`。
- Worker: `/manabi-sugoroku/sw.js`。キャッシュ名は`metaborin/manabi-sugoroku/`＋全資産とworker実装のSHA-256。
- `npm run build`の最後に`scripts/build-pwa.mjs`がdist全体を走査し、整合性情報付きの`precache-manifest.json`とworkerを生成します。出力manifestに資産一覧と合計バイト数があります。
- 全資産を一括保存して整合性を検査します。部分的な新規インストールは失敗扱いで新規キャッシュを破棄し、既存の使用中キャッシュは消しません。
- オフライン準備状態はactive workerへMessagePortで問い合わせ、全対象の存在を確認します。waiting workerの通知だけでは完了扱いにしません。
- 取得は同originかつ当該scope内のGETだけ。自分のキャッシュのみ参照します。現在の完全なキャッシュが準備できたactivate時だけ、当該アプリの厳密な接頭辞を持つ旧キャッシュを削除します。他アプリのキャッシュは触りません。
- アイコンは既存のオリジナルSVGの狐を使用。`node scripts/generate-pwa-icons.mjs`でPNGを再生成できます。maskableの主要図柄は中央80%の安全領域内に収めています。

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:pwa
npm run test:e2e
```

PWAテストは本番ビルド用の独立ブラウザコンテキストを使います。通常の開発サーバーではService Workerを登録しません。HTTPSまたはlocalhostが必要です。

## ローカル確認（2026-10-04）

Windowsのheadless Edgeで、CDPによるmanifest確認、全資産の到達・保存、オフラインでの1人/4人プレイと明示保存・再開を確認しました。2タブで新workerを待機させ、手番・誤答・ヒントと未保存状態が保たれること、1タブ閉鎖では待機が続き、全タブ閉鎖後に更新して同じ保存からオフライン再開できることを確認しています。他アプリのキャッシュの内容も保持しました。

PWAの4ケースは合格し、初回の準備を更新と誤認しない修正後に初回表示と更新の2ケースを再確認しました。`Vary: Origin`を返す配信下でmodule/CSSのキャッシュ照合がずれる問題を検出し、既知の整合性確認済み資産はcanonical URLで参照する修正と回帰テストを追加しました。

lint、typecheck、unit 56件、本番buildを確認済み。既存ゲームのE2E 48件は46件が初回合格し、PWA小見出し追加に伴うテストの見出し指定修正1件と、短時間の演出段階を取り逃した1件も単独再実行で合格しました。ゲームの演出ロジックは変更していません。

実機Chromebook、ネイティブアプリの実インストール、Safari実機は未確認です。ブラウザと端末ごとのインストール表示・音声提供・ストレージ保持には差があります。
