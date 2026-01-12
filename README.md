# Stock Alert - Google Apps Script

Google Apps Script (GAS) による在庫アラート通知システムです。clasp を使用してコードを管理し、GitHub Actions で自動デプロイします。

## 機能

- 在庫月数が閾値以下の商品をメールで通知
- 輸入対象商品と非輸入商品で異なる閾値を設定
- HTMLメールでわかりやすく通知
- TSV形式でコピー可能なデータも提供

## プロジェクト構造

```
.
├── src/
│   ├── utils.js           # ユーティリティ関数
│   └── notifications.js   # 通知機能
├── .github/
│   └── workflows/
│       └── deploy-gas.yml # GitHub Actions ワークフロー
├── .clasp.json            # clasp 設定（要編集）
├── appsscript.json        # GAS マニフェスト
├── package.json           # npm 設定
└── README.md
```

## セットアップ手順

### 1. 前提条件

- Node.js (v18 以上) がインストールされていること
- Google アカウントを持っていること
- GitHub リポジトリへのアクセス権限

### 2. ローカル環境のセットアップ

#### 2.1 依存関係のインストール

```bash
npm install
```

#### 2.2 clasp のログイン

```bash
npm run login
```

ブラウザが開くので、Google アカウントでログインします。

#### 2.3 GAS プロジェクトの作成または既存プロジェクトへのリンク

新規プロジェクトを作成する場合：

```bash
clasp create --type standalone --title "Stock Alert"
```

既存プロジェクトにリンクする場合：

1. Google Apps Script のエディタでプロジェクトを開く
2. プロジェクト設定から「スクリプトID」をコピー
3. `.clasp.json` ファイルの `scriptId` を更新

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "./src"
}
```

#### 2.4 初回プッシュ

```bash
npm run push
```

### 3. GitHub Actions のセットアップ

#### 3.1 clasp 認証情報の取得

ローカル環境で `clasp login` を実行後、以下のファイルが作成されます：

```bash
cat ~/.clasprc.json
```

このファイルの内容をコピーします。

#### 3.2 GitHub Secrets の設定

GitHub リポジトリの Settings > Secrets and variables > Actions で以下の Secret を追加：

1. `CLASPRC_JSON`: 上記でコピーした `.clasprc.json` の内容全体を貼り付け
2. `SCRIPT_ID`: GAS プロジェクトのスクリプト ID

#### 3.3 ワークフローの動作確認

PR を作成すると、自動的に GitHub Actions が実行され、GAS にデプロイされます。

### 4. GAS プロジェクトでの設定

#### 4.1 スプレッドシートとの連携

1. GAS エディタを開く：`npm run open`
2. 「プロジェクトの設定」から、スプレッドシートをコンテナバインド型に変更するか、スクリプトプロパティでスプレッドシート ID を設定

#### 4.2 トリガーの設定

GAS エディタで以下の関数にトリガーを設定：

- `notifyLowStockMonths`: 輸入対象商品の低在庫アラート
- `notifyAvgStockNonImport`: 非輸入商品の低在庫アラート

推奨設定：
- イベントのソース: 時間主導型
- 時間ベースのトリガー: 日タイマー
- 時刻: 午前 8〜9 時

## 使い方

### ローカルでの開発

1. `src/` ディレクトリ内のファイルを編集
2. 変更をプッシュ：`npm run push`
3. GAS エディタで動作確認

### GitHub Actions でのデプロイ

1. 機能ブランチで開発
2. main/master ブランチへの PR を作成
3. 自動的に GAS にデプロイされる
4. PR マージ後も自動デプロイが実行される

## 必要なスプレッドシート列

スプレッドシートには以下の列が必要です：

- 商品名
- 入荷後の直近1年在庫月数
- 入荷後の直近3年度在庫月数
- 4年以内に出荷があったか
- 輸入対象外

## カスタマイズ

### 閾値の変更

`src/notifications.js` 内の各関数で閾値を変更できます：

```javascript
const AVG_THRESHOLD = 4; // 平均在庫月数の閾値
const DIGEST_MAX = 100;  // メールに含める最大件数
```

### シート名の変更

```javascript
const SHEET_NAME = '在庫管理'; // 対象シート名
```

## トラブルシューティング

### clasp push が失敗する

- `.clasp.json` の `scriptId` が正しいか確認
- `clasp login` で再ログイン

### GitHub Actions が失敗する

- GitHub Secrets が正しく設定されているか確認
- `CLASPRC_JSON` の形式が JSON として有効か確認

### メールが送信されない

- GAS のトリガーが正しく設定されているか確認
- スクリプトの実行履歴でエラーを確認
- スプレッドシートの列名が正しいか確認

## ライセンス

MIT
