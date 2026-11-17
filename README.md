# GR-M02U Console

ブラウザの Web Serial API で GR-M02U（NaviSys Technology / Airoha AG3335 ベースの USB GNSS レシーバー）を制御するコンソール。NMEA0183 のライブ表示、PAIR コマンドの発行、設定値の取得・変更、生シリアル出力の閲覧をブラウザだけで完結させる。

## 主な機能

- **接続管理**: ボーレート選択（4800–921600 bps）、Connect/Disconnect、接続状態バッジ
- **Status**: 位置 / Fix 品質 / 移動カードと、コンステレーション別の衛星 SNR バー
- **Settings**: 主要 PAIR 設定値を一括取得して表で確認。各行から変更ダイアログを起動でき、`PAIR513` で NVRAM へ保存
- **PAIR Console**: 代表コマンドのフォーム入力 / 自由入力（チェックサム自動付与）/ 送受信履歴
- **Raw Log**: 受信生センテンスの仮想スクロール表示。フィルタ・自動スクロール・5000 行リングバッファ

## 起動して接続する

必要なもの:

- Chrome や Edge など Web Serial API 対応ブラウザ
- GR-M02U と、対応する USB シリアルドライバ
- mise（開発ツールのバージョン管理）

リポジトリのルートで実行する。Node などのバージョンは [mise.toml](mise.toml)、pnpm は [package.json](package.json) の `packageManager` に従う。

```sh
mise install
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm dev
```

1. ターミナルに表示されたローカル URL をブラウザで開く。
2. GR-M02U を USB で接続する。
3. 上部のボーレートをデバイスの設定に合わせ、Connect からシリアルポートを選ぶ。
4. Status で測位情報、Raw Log で受信センテンスを確認する。切断するときは Disconnect を使う。

### 実機の設定を変更するとき

- 実機への PAIR コマンド送信は副作用がある（再起動・NVRAM 書き換え・ボーレート変更等）。意図せず実行しないよう注意する
- `PAIR864`（ボーレート変更）はコマンド ack 後にデバイス側のボーレートが切り替わる。アプリは UI 側のボーレートを自動切替しないため、上部のセレクタで合わせて再接続する

## 開発と検証

以下は mise のツールを利用できるシェルで実行する。必要に応じて `mise exec --` を前置する。パッケージ操作には pnpm を使う。

```sh
hk fix                  # lint・format などの自動修正
hk check --all          # lint・format・型などの検証
pnpm test               # ユニットテスト
pnpm build              # 型チェックとビルド
pnpm exec playwright install chromium
pnpm test:e2e           # ビルド済みのアプリで E2E テスト
```

ユニットテストは `hk` に含まれない。E2E は `pnpm preview` で `dist` を配信するため、UI を変更したら `pnpm build` を先に実行する。自動テストにはモックを使い、実機へ PAIR コマンドを送らない。

個別のテストを実行する場合:

```sh
pnpm test src/pair/queue.test.ts
pnpm exec playwright test e2e/smoke.spec.ts -g "tab name"
```

スクリプトは [package.json](package.json)、検証項目は [hk.pkl](hk.pkl)、E2E のサーバー設定は [playwright.config.ts](playwright.config.ts) を参照する。CI は `hk check --all` → ユニットテスト → ビルド → E2E の順で実行する（[ci.yml](.github/workflows/ci.yml)）。

コードを変更するときの制約とデータフローは [AGENTS.md](AGENTS.md) に記載している。
