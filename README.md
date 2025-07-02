# MetaPoker 🌐

A-FrameとWebSocketを使ったメタバース空間でのプランニングポーカーアプリケーション

## 🚀 特徴

- **3D仮想空間**: A-Frameベースのメタバース環境
- **リアルタイム同期**: WebSocketによる即座の状態共有
- **アバターシステム**: プレイヤーが3D空間内でアバターとして参加
- **プランニングポーカー**: スクラム開発用の見積もりゲーム (1, 2, 3, 5, 8, 13, 21, ?)
- **マルチプレイヤー**: 複数人が同時に参加可能
- **VR対応**: WebXR対応でVRデバイスからもアクセス可能

## 🛠 技術スタック

- **フロントエンド**: A-Frame, Three.js, HTML/CSS/JavaScript
- **バックエンド**: Node.js, Express
- **リアルタイム通信**: Socket.io (WebSocket)
- **3D環境**: WebXR

## 📦 インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd pelanning-porker

# 依存関係をインストール
npm install
```

## 🎮 使用方法

### サーバー起動

```bash
npm start
```

サーバーが起動すると、以下のメッセージが表示されます：
```
MetaPoker server running on port 3000
Visit http://localhost:3000 to start playing
```

### アクセス方法

1. ブラウザで `http://localhost:3000` にアクセス
2. ニックネームを入力してルームに参加
3. 3D空間内でプランニングポーカーを開始

### 操作方法

- **カード選択**: カードをクリックして投票
- **移動**: WASDキーまたはVRコントローラーで移動
- **視点操作**: マウスまたはVRヘッドセットで視点変更

## 🎯 ゲームフロー

1. **参加**: プレイヤーがニックネームを入力してルームに参加
2. **投票**: 各プレイヤーがストーリーポイントを選択
3. **公開**: 全員が投票完了すると結果が一斉公開
4. **議論**: チームで見積もりについて議論
5. **リセット**: 次のストーリーのために投票をリセット

## 📁 プロジェクト構造

```
pelanning-porker/
├── index.html              # メインのHTMLファイル
├── server.js               # WebSocketサーバー
├── package.json            # プロジェクト設定
├── public/
│   ├── css/
│   │   └── style.css       # スタイルシート
│   └── js/
│       └── metapoker.js    # クライアントサイドJavaScript
└── README.md
```

## 🌐 API エンドポイント

- `GET /` - メインページ
- `GET /health` - サーバー状態確認

### WebSocket イベント

#### クライアント → サーバー
- `join-room` - ルーム参加
- `cast-vote` - 投票
- `reset-game` - ゲームリセット
- `update-story` - ストーリー更新
- `start-timer` - タイマー開始

#### サーバー → クライアント
- `player-joined` - プレイヤー参加通知
- `player-left` - プレイヤー離脱通知
- `vote-cast` - 投票通知
- `votes-revealed` - 投票結果公開
- `game-reset` - ゲームリセット通知
- `story-updated` - ストーリー更新通知
- `timer-update` - タイマー更新

## 🔧 カスタマイズ

### ポート変更
環境変数でポートを変更できます：
```bash
PORT=8080 npm start
```

### ストーリー設定
`server.js`の`currentStory`を変更することで初期ストーリーを設定できます。

### タイマー設定
`server.js`の`timerDuration`を変更することでタイマー時間を調整できます。

## 🚀 デプロイ

### Vercel
```bash
vercel --prod
```

### Heroku
```bash
git add .
git commit -m "Initial commit"
heroku create your-app-name
git push heroku main
```

## 🤝 コントリビューション

1. フォークしてください
2. フィーチャーブランチを作成してください (`git checkout -b feature/AmazingFeature`)
3. 変更をコミットしてください (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュしてください (`git push origin feature/AmazingFeature`)
5. プルリクエストを開いてください

## 📝 ライセンス

MIT License

## 🎉 今後の拡張予定

- [ ] ボイスチャット機能
- [ ] Firebase認証連携
- [ ] Jira/Notion連携
- [ ] VRデバイス最適化
- [ ] モバイル対応
- [ ] ゲーム履歴保存
- [ ] カスタムカードセット# pelanning-porker
# pelanning-porker
