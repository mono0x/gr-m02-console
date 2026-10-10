# GR-M02U Console

ブラウザの Web Serial API で GR-M02U（NaviSys Technology / Airoha AG3335 ベースの USB GNSS レシーバー）を制御するコンソール。NMEA0183 のライブ表示、PAIR コマンドの発行、設定値の取得・変更、生シリアル出力の閲覧をブラウザだけで完結させる。

## 必要環境

- Chrome や Edge など Web Serial API 対応ブラウザ
- GR-M02U に対応する USB シリアルドライバ

## 主な機能

- **接続管理**: ボーレート選択（4800–921600 bps）、Connect/Disconnect、接続状態バッジ
- **Status**: 位置 / Fix 品質 / 移動カードと、コンステレーション別の衛星 SNR バー
- **Settings**: 主要 PAIR 設定値を一括取得して表で確認。各行から変更ダイアログを起動でき、`PAIR513` で NVRAM へ保存
- **PAIR Console**: 代表コマンドのフォーム入力 / 自由入力（チェックサム自動付与）/ 送受信履歴
- **Raw Log**: 受信生センテンスの仮想スクロール表示。フィルタ・自動スクロール・5000 行リングバッファ

## 開発時のチェック

`mise install` で固定バージョンのツールをインストールし、`mise exec -- pnpm install --frozen-lockfile` の後に `mise exec -- hk check --all` を実行する。CI も同じ mise 設定と hk のチェックを使う。

GitHub Actions は jactionlint の既定のセキュリティチェックを含めて workflow と composite action を検査し、ShellCheck で `run` 内のシェルスクリプトも検査する。workflow、action、`mise.toml`、`hk.pkl` を変更すると、hk の `jactionlint` step がリポジトリ全体を検査する。単独実行は `mise exec -- hk check --all --step jactionlint`。

## 注意

- 実機への PAIR コマンド送信は副作用がある（再起動・NVRAM 書き換え・ボーレート変更等）。意図せず実行しないよう注意する
- `PAIR864`（ボーレート変更）はコマンド ack 後にデバイス側のボーレートが切り替わる。アプリは UI 側のボーレートを自動切替しないため、上部のセレクタで合わせて再接続する
