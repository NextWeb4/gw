<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/English-0969da?style=flat-square" alt="English"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-c8102e?style=flat-square" alt="简体中文"></a>
  <a href="README.ja.md"><img src="https://img.shields.io/badge/%E6%97%A5%E6%9C%AC%E8%AA%9E-8250df?style=flat-square" alt="日本語"></a>
</p>

<p align="center">
  <img src="assets/brand/app-icon.svg" alt="HxHwang Gw アプリケーションアイコン" width="96">
</p>

# HxHwang Gw

公文事務、タスクとファイルの追跡、文書作成、週報、文書出力、制御されたプライベート同期のためのローカルファーストシステムです。

![バージョン](https://img.shields.io/badge/version-0.6.4-0969da?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11.9.0-f69220?style=flat-square&logo=pnpm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript&logoColor=white)
![ライセンス](https://img.shields.io/badge/license-All_rights_reserved-555?style=flat-square)

## 概要

HxHwang Gw は、公開 GitHub Pages デモ、インターネット/イントラネット Web ビルド、インターネット/イントラネット Electron クライアントで同一のドメインモデルを共有する pnpm monorepo です。業務データをまずローカルに保存し、ネットワーク機能をビルド時に分離し、同期と AI リクエストを明示的なアダプターで提供します。

現在のリリースは `0.6.4` です。ローカル中継は OpenAI 型の `/v1/models` と、設定済み基点 URL に resource を直接追加する `/api/models` 型の両方に対応しました。管理者は自動互換または一方の path を固定でき、認証は引き続き auto、Bearer、`x-api-key` に対応します。上流 URL、Key、path 設定は Pages に返さず、マスキング、都度確認、セッション限定秘密、明示的な通信条件も変更していません。詳細は [`RELEASE_NOTES.md`](RELEASE_NOTES.md) を参照してください。

公開 Pages はプライベート同期を表示しませんが、ローカル台帳、添付、旧 JSON/スナップショット、ユーザー自身の Key を使う AI、明示的に解除した `127.0.0.1` 中継を利用できます。ページ読込やパスワード入力だけでは中継へ接続しません。業務データは現在のブラウザーの IndexedDB に保存されます。[GitHub Pages](https://nextweb4.github.io/gw/) では公開、架空、または許可済みの非機密資料だけを扱ってください。

## 主な機能

| 分野 | 実装内容 |
| --- | --- |
| 業務管理 | タスク、会議、文書、外出、押印、物資の編集可能な6台帳、再利用可能な担当者/組織、段階、要約、添付、検索 |
| 文書作成 | リッチテキスト下書き、サニタイズ済み DOCX/HTML/TXT 取込、ローカルカスタム書式、決定的な週報、編集可能な版 |
| 文書 | DOCX/PDF 共通の A4 指向エンジン。Web はブラウザー印刷、デスクトップは Electron 印刷を使用 |
| 移行 | 2 種類の旧プロトタイプ書き出し形式と JSON/スナップショットのドラッグ＆ドロップに対応し、出所を特定できない場合は警告 |
| ローカルデータ | IndexedDB ベースのリポジトリ、スナップショット、添付参照、検索可能な AI 履歴、明示的な復元/書き出し |
| エディション別サービス | 公開 Pages/インターネット版はセッション内 API Key と OpenAI 互換 URL、イントラネット版は認証済み同期と内部 AI ゲートウェイのみを使用 |

旧 Skill、設定、週報、未マッピングの元フィールドは読み取り専用のプレーンテキストで保持され、取り込んだ HTML やスクリプト文字列は実行されません。

## 実行形態

| 形態 | プライベート操作 | 用途 | 重要な境界 |
| --- | --- | --- | --- |
| 公開 Pages | ユーザー Key の直接 AI | ローカル台帳と公開/非機密資料 | プライベート同期なし、ブラウザー内保存、AI は provider CORS に依存 |
| インターネット Web / デスクトップ | 直接 AI のみ | OpenAI 互換 HTTPS を使う非機密作業 | API Key はセッションメモリのみ。ブラウザーは provider CORS も必要 |
| イントラネット Web / デスクトップ | 内部同期と AI | 管理された内部ネットワーク | provider key はサーバーだけに置き、イントラネット版は公開 AI 直結を拒否 |

すべての形態がローカルファーストです。ユーザーがサーバーアドレスとアクセスコードを入力するまでプライベート同期は開始されません。

## 必要環境

- GitHub Actions と同じ Node.js `24`。
- ルートの `packageManager` で宣言された pnpm `11.9.0`。
- エンドツーエンドテストとブランド資産生成には Playwright Chromium。
- NSIS インストーラーには Windows、AppImage/DEB のパッケージ化と最終 Linux 互換性確認には Linux。
- Web ビルドには Chromium 系ブラウザー。

リポジトリのバージョンは `0.6.4` です。依存関係は `pnpm-lock.yaml` で固定され、再現可能なインストールには frozen lockfile を使用します。

## インストールと実行

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev:web
```

既定の開発サーバーはローカルインターフェースだけを使用します。プライベート操作を確認する場合はイントラネットモードを使用します。

```bash
pnpm dev:web:intranet
```

OpenAI 互換のインターネット版を確認する場合：

```bash
pnpm dev:web:internet
```

公開 Pages ビルドをプライベート API に接続しないでください。添付とスナップショットは現在のブラウザーにだけ保存され、管理されたイントラネット保存ではありません。内部・機密資料は承認済みの管理環境だけで扱います。

## 基本的な利用手順

1. タスク、会議、文書、外出、押印、物資の記録を作成または取り込み、移行レポートと読み取り専用履歴を確認します。
2. 公文内容を下書きし、関連するローカル知識を整備します。
3. 選択した期間から週報を生成し、編集、版保存、書き出し後に確認します。
4. ブラウザーデータ削除、端末変更、デスクトップクライアント削除の前にローカルスナップショットを書き出します。
5. プライベートビルドでは明示的にサーバーへ接続し、現在のマスターを取得してからローカルで新しい記録だけを送信します。
6. AI リクエスト前に匿名化プレビューを確認・編集し、送信可能な内容か判断します。

生成文書は作業出力であり、文章、規程、フォント、改ページ、機密性の確認を代替しません。

## ローカルデータ、プライバシー、復元

- 公開/イントラネット Web ビルドは現在のブラウザープロファイルの IndexedDB に記録を保存します。
- デスクトップビルドは同じローカルモデルを使い、制限された Electron bridge でネイティブ PDF 出力を追加します。
- サイトデータやブラウザープロファイルの削除、バックアップなしのアンインストールにより、ローカル記録を失う可能性があります。
- ローカル匿名化は一般的な電話番号、メールアドレス、身分証番号、ラベル付き氏名を認識しますが、匿名性を保証しません。
- 機密、秘密、その他処理禁止の資料を本アプリや公開モデルに入力してはいけません。
- 公開 Pages/インターネット版のユーザー API Key はセッションメモリだけに置き、イントラネットのモデルキー、DB 資格情報、provider 設定はプライベートサーバーだけに置きます。

実際の内部資料で移行、同期、添付、AI を使う前に [`docs/HELP.md`](docs/HELP.md) を読んでください。

## コンテンツと通信の境界

同梱知識パックは、許諾済み資料と明示的な HTTPS ソース許可リストだけから生成されます。`pnpm content:sync` は明示的なネットワーク操作であり、リダイレクトと応答サイズの方針に従って出典メタデータを記録し、商用参考製品をスクレイピングしたり手動テンプレートを上書きしたりしません。

公開 Pages は厳格な CSP を使い、プライベート API 接続先を持ちません。モデル取得またはリクエストごとの確認後だけ、指定した HTTPS/ループバック AI に接続します。イントラネット/デスクトップ CSP は各エディションで必要な明示的接続先だけを許可します。HTML の CSP meta では `frame-ancestors` を強制できないため、埋め込み防止が必要な本番ホスティングでは HTTP 応答ヘッダーに `Content-Security-Policy: frame-ancestors 'none'` を設定してください。

## テストと検証

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm content:verify
pnpm assets:verify
pnpm exec playwright install chromium
pnpm test:e2e
pnpm test:e2e:internet
pnpm test:e2e:intranet
```

`pnpm test` は各 package のテストに加え、コンテンツ方針、workflow contract、UI contract を検証します。Playwright はデスクトップ/狭幅表示、公開/プライベート機能分離、移行、ローカル処理、文書出力、添付、CSP、明示的な接続前にイントラネットクライアントが外部通信しないことを対象とします。

`lint` と `format:check` は現在、各 workspace の TypeScript または JavaScript の構文/型検証に委譲されています。独立したソース formatter は設定されていません。

## ビルドとリリース

```bash
pnpm build
pnpm build:web:internet
pnpm build:web:intranet
pnpm build:desktop
pnpm build:desktop:win:x64:internet
pnpm build:desktop:win:x64:intranet
pnpm build:desktop:linux:x64:internet
pnpm build:desktop:linux:x64:intranet
```

公開 Web は `apps/web/dist/`、インターネット/イントラネットビルドは `dist-internet/` と `dist-intranet/` に分離されます。`x64` を `arm64` に替えると ARM を構築できます。デスクトップパッケージは `file://` 対応 Web bundle を先に構築します。

`v*` タグは Windows/Linux、x64/arm64、インターネット/イントラネットの行列を開始します。全パッケージと Debian 10/12 起動ゲート成功時だけ、12 個の分版パッケージと `SHA256SUMS.txt` を公開します。

## アーキテクチャとモジュール境界

```text
apps/web          React/Vite UI とビルド時の公開/プライベート機能分離
apps/desktop      Electron メインプロセス、preload bridge、セキュリティ方針、パッケージ化
packages/domain   共有エンティティ、検証、週報、履歴アーカイブの意味論
packages/local-data  IndexedDB リポジトリ、スナップショット、添付、ローカル永続化
packages/documents   DOCX/PDF 向け文書モデルと出力ヘルパー
packages/migration   旧形式の識別、マッピング、警告、アーカイブ保持
packages/sync-client 明示的なプライベート同期、添付、匿名化、AI クライアント
content           許諾済み出典、許可リスト、生成知識パック、帰属情報
scripts           コンテンツ方針、資産生成、ビルド/workflow contract 検証
e2e               公開/インターネット/イントラネット Playwright シナリオ
```

UI は永続化内部へ直接アクセスせず package API を使用します。ネットワーク処理は `packages/sync-client` に限定し、ローカルストレージに暗黙通信を追加しません。Electron は context isolation と sandbox を維持し、狭い preload contract だけを公開します。

## 状態と既知の制約

- 公開デモの対象 URL は `https://nextweb4.github.io/gw/` です。配備とパッケージ検証は、共有コード認証が本番向けであることを意味しません。
- 本アプリは公開または内部の非機密業務向けで、秘密記録には適しません。
- ブラウザーデータの耐久性はプロファイルとユーザーのスナップショット運用に依存します。
- DOCX/PDF はフォントと最終エディター/ビューアーに依存し、正式文書には手動確認が必要です。
- 旧プロトタイプは同じバージョン識別子を使い、標準エクスポーターは Skill コレクションを一つ省略していました。曖昧な取り込みは出所を推測せず警告します。
- Windows/Linux パッケージは Authenticode/コード署名されていません。CI のビルドとエミュレーション導入ゲートはありますが、実 ARM 端末は外部検証項目です。

維持されている検証証拠は [`docs/VERIFICATION_MATRIX.md`](docs/VERIFICATION_MATRIX.md)、リリース履歴は [`RELEASE_NOTES.md`](RELEASE_NOTES.md) を参照してください。

## 保守ガイド

- 公開/イントラネット/デスクトップの機能境界と個別出力ディレクトリを維持します。
- ドメイン不変条件、永続化、移行、匿名化、同期、Electron IPC、出力動作、workflow を変更するときは対象テストを追加します。
- 許諾資料や生成知識ファイルを変更する前にコンテンツ検証を行い、許諾メタデータと帰属情報を一致させます。
- `assets/brand/app-icon.svg` の変更後は PNG/ICO 資産を再生成して検証します。
- package バージョン、リリースノート、デスクトップ成果物名、3 言語 README、workflow 断言を同期します。

依存関係の選定、ライセンス、不採用案、ロールバック境界は [`OPEN_SOURCE_AUDIT.md`](OPEN_SOURCE_AUDIT.md)、視覚/操作規則は [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) に記録されています。

## 作者と連絡先

- **HaoXiangHwang**
- [Rays688888@Gmail.com](mailto:Rays688888@Gmail.com)
- <https://nextweb4.github.io/>
- <https://github.com/NextWeb4>

## 著作権とライセンス

Copyright (c) 2026 HaoXiangHwang. All rights reserved.

本リポジトリは `UNLICENSED` と宣言されており、書面による許可なしに独自コードやコンテンツを複製、変更、再配布する権利は付与されません。第三者依存関係には各ライセンスが適用され、許諾済み参考資料の範囲は `content/licensed/` に記録されています。再利用または配布前に [`COPYRIGHT.md`](COPYRIGHT.md) と [`content/ATTRIBUTION.md`](content/ATTRIBUTION.md) を確認してください。
