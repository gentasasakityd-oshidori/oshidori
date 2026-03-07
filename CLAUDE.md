# オシドリ プロジェクト指示書

## 言語ルール
- **全出力を日本語で行うこと。英語禁止。一切の例外なし。**
- コード内のコメントも日本語を優先する（変数名・関数名は英語OK）

## 行動原則
- **即実行**: 指示を受けたら確認を求めず即座に作業に取り掛かる
- **質問禁止**: 「どうしますか？」「どれにしますか？」と聞かない。自分で最適解を判断して実行する
- **報告は結果のみ**: 途中経過や選択肢の提示は不要。作業結果を簡潔に報告する
- **ファイル読み込み**: 指示されたファイルは即座に読み込む。権限確認は不要

## プロジェクト概要
オシドリ = 個人経営飲食店の共感ベース常連づくりCRMプラットフォーム
- 創業者: 佐々木彦太（味の素14年→Ridgelinez→Schmatz、中小企業診断士）
- 技術スタック: Next.js 16 + Supabase + OpenAI GPT-4o + Vercel
- 本番URL: https://oshidori.vercel.app

## ディレクトリ構成
```
C:\Claude作業用\オシドリ\
├── oshidori/                    ← このプロジェクト（Next.jsアプリ本体）
│   ├── src/app/                 ← ページルーティング
│   ├── src/components/          ← UIコンポーネント
│   ├── src/lib/                 ← ユーティリティ・API
│   ├── supabase/migrations/     ← DBマイグレーション（最新: 021）
│   └── .claude/agents/          ← AIエージェント定義
├── oshidori-agents/             ← Slack Botシステム（PM2で稼働中）
├── 開発/仕様書/                 ← 仕様書・仕様変更書
├── 事業計画/                    ← 事業計画書
├── デザイン/                    ← デザイン資料
└── リサーチ資料/                ← リサーチ資料
```

## 主要ドキュメント
- 事業計画書v6.1: `C:\Claude作業用\オシドリ\事業計画\オシドリ_事業計画書_v6_1.md`
- 仕様変更書v6.1: `C:\Claude作業用\オシドリ\開発\仕様書\オシドリ_プロダクト仕様変更書_v6_1対応.md`
- 開発計画: `開発ログ/開発記録/オシドリ_今後の開発計画_v2.md`

## AIエージェントチーム
| エージェント | 担当 | 定義ファイル |
|---|---|---|
| COO あおい | 事業統括・実行管理 | `.claude/agents/coo.md` |
| CFO りく | 財務・資金調達 | `.claude/agents/cfo.md` |
| CMO ひなた | マーケティング・ブランド | `.claude/agents/cmo.md` |
| CCO みずき | コンテンツ品質管理 | `.claude/agents/cco.md` |
| Sales はると | 営業自動化・飲食店獲得 | `.claude/agents/sales.md` |

## エージェントメモリ
各エージェントは作業前に自分のメモリファイルを読み、作業後に更新する：
- `docs/agent-memory/coo-notes.md`
- `docs/agent-memory/cfo-notes.md`
- `docs/agent-memory/cmo-notes.md`
- `docs/agent-memory/cco-notes.md`
- `docs/agent-memory/sales-notes.md`

## 開発ルール
- DBスキーマ変更時は `supabase/migrations/` に連番でSQLファイルを追加
- コンポーネントは `src/components/` に配置、shadcn/uiベース
- APIルートは `src/app/api/` に配置
- 環境変数は `.env.local` で管理（Supabase URL/Key, OpenAI Key等）

## 現在のステータス（v6.1対応）
- 事業計画v6.1: 収益構造をSaaS単層に一本化、AIコミュニティマネージャー昇格
- 仕様変更v6.1: 課金機能削除、チェックイン=推し登録統合、気分タグ等の新機能追加
- 実装状況: Phase 1完了（MVP全実装）、v6.1対応改修中
