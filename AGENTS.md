# AGENTS.md

このリポジトリで作業するエージェント向けの指示。概要・起動方法・検証コマンドは [README.md](README.md) を参照する。

## 作業の基本

- パッケージ操作には `pnpm` のみを使う。`npm` / `yarn` は使わない。
- lint・format・型チェックは `hk` で実行する。変更後は `hk check`、ユニットテストは `pnpm test` で別途検証する。
- UI を変更したら `pnpm build` の後に `pnpm test:e2e` を実行する。Playwright はビルド済みの `dist` を配信する。
- 自動テストでは実機へ PAIR コマンドを送らない。`src/test/mocks/mock-serial-port.ts` と、`e2e/smoke.spec.ts` のブラウザ内 fake serial を使う。
- `PAIR864` 成功後もホスト側のボーレートは自動変更せず、toast で手動の再接続を案内する。この挙動を変える場合は、ホスト側の切替に失敗したときの復旧方法も再検討する。

## 設定の参照先

設定値や規約は、次のファイルを正とする。

| 確認する内容                            | ファイル                                        |
| --------------------------------------- | ----------------------------------------------- |
| 開発ツールのバージョン                  | `mise.toml`、`package.json` の `packageManager` |
| スクリプト・依存関係                    | `package.json`                                  |
| TypeScript の strictness・`@/*` alias   | `tsconfig.app.json`                             |
| ツール側の path alias                   | `vite.config.ts`、`vitest.config.ts`            |
| pnpm の依存関係ポリシー                 | `pnpm-workspace.yaml`、`.npmrc`                 |
| shadcn/ui のスタイル・`cn` の import 先 | `components.json`                               |
| lint・format の設定                     | `.oxlintrc.json`、`.oxfmtrc.json`               |
| `hk` の検証・自動修正項目               | `hk.pkl`                                        |
| E2E の webServer・base URL              | `playwright.config.ts`                          |
| CI の検証順序                           | `.github/workflows/ci.yml`                      |

エディタでの保存時の format 設定は `.vscode/settings.json` を参照する。

## データフローと変更箇所

React の SPA。シリアル入出力を stores に接続する処理は `src/store/pipeline.ts` に集約する。

```text
Web Serial API
  → src/serial/serial-manager.ts       接続・切断、行の結合、reader のキャンセル
  → src/store/connection-store.ts     シリアルイベントの公開
  → src/store/pipeline.ts
      → src/store/log-store.ts        送受信行の記録
      → src/nmea/parser.ts            受信行のチェックサム検証・種別判定
          → src/nmea/aggregator.ts    GSV の集約
          → src/store/nmea-store.ts   NMEA データの反映（GSV は集約後）
          → src/pair/queue.ts         ack・後続レスポンスの処理
```

NMEA センテンスを追加するときは、`src/nmea/parser.ts` の decoder、`src/store/nmea-store.ts` の ingest、`src/store/pipeline.ts` の分岐を確認する。関連する型は `src/nmea/types.ts` にある。

### PAIR コマンド

- `src/pair/queue.ts` は厳密な FIFO とし、応答待ちのコマンドは同時に一つに保つ。複数を並行送信すると、GR-M02U の応答をコマンドに対応付けられない。
- ack と後続レスポンス、`result=1` によるタイマーの再設定、`PairErrorKind` の対応は `queue.ts` と `queue.test.ts` を読んでから変更する。切断・接続エラー時の `cancelAll` は `pipeline.ts` が呼び出す。
- `src/pair/catalog.ts` に Set/Get の対応を定義する。`SettingsView` は Setter 成功後に Getter で設定値を再取得する。
- 代表コマンドを追加するときは、`resultKind` と `followUpCid` を設定し、マニュアルの該当節を引用して引数の範囲と応答形式を確認する。

デバイスの仕様書はローカルの `docs/GR-M02Manual.md` を参照する。Markdown と PDF は `docs/.gitignore` の対象で、このリポジトリには同梱されていない。仕様を確認する作業では、ファイルが手元にあるかを先に確認する。

### Store の更新

- `nmea-store.ts` の ingest は `shallowDiff` で変更を判定し、同じ値なら以前の参照を再利用する。NMEA の高頻度受信で不要な再描画が起きないよう、フィールド追加時もこの方式を保つ。
- `log-store.ts` は初期容量 5000 行のバッファ。配列をコピーして行を追加し、超過分を一度の `splice` で除く。行ごとに `Array.shift()` を繰り返す実装に変えない。

## 実装・テストの注意点

- `exactOptionalPropertyTypes` の対象では、省略可能なプロパティに `undefined` を代入せず、不要なキーを省く。例: `...(value ? { key: value } : {})`。
- `shadcn` CLI が `./@/components/ui/` を作成した場合は、生成物を `src/components/ui/` へ移動し、不要になった `@` ディレクトリを除く。
- shadcn のコンポーネントを再生成するときは、既存ファイルと比較してリポジトリ固有の調整を保つ。`sonner.tsx` の `ToasterProps` は `sonner` から import する。
- inline style は仮想リストの `transform` や SNR バーの `height` など、動的に計算する値に使う。それ以外は Tailwind のクラスと shadcn のプリミティブを使う。
- PAIR queue のテストは `vi.useFakeTimers()` を使う。reject を検証するときは、タイマーを進める前に pending promise へ `.catch(() => {})` を付け、未処理の rejection を防ぐ。
- NMEA テストの fixture は `attachChecksum(body)` で作成する。チェックサムを手書きしない。
