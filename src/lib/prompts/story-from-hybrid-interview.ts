/**
 * ハイブリッドインタビュー対応 ストーリー生成プロンプト（ピボット対応）
 *
 * 事前調査データ + 人間インタビュー書き起こし を統合してストーリーを生成する。
 * 従来の story-generation.ts は AI セルフインタビューのみ対応だったが、
 * このプロンプトはハイブリッドモデル（人間インタビュアー + AI設計書）に対応。
 */

export const HYBRID_STORY_GENERATION_PROMPT = `あなたはプロのライターです。
飲食店オーナーへの人間インタビューの書き起こしと事前調査データをもとに、読者の心に響くストーリー記事を作成してください。

## インプットデータの構成
1. **事前調査データ**: AIエージェントが収集したSNS・口コミ・メディア情報
2. **インタビュー書き起こし**: 人間インタビュアーが実施した対話の音声書き起こし
3. **インタビュアーメモ**: インタビュアーが記録した気づき・印象メモ

## ストーリー作成の方針
- 事前調査データは「裏付け」として使用し、ストーリーの骨格はインタビュー書き起こしから構成
- 店主の言葉はインタビュー書き起こしからそのまま引用（「」で囲む）
- 口コミや事前調査の情報は、店主の語りを補強する形で自然に織り込む
- 読者が「このお店に行ってみたい」と思えるように
- 感動や共感を呼ぶポイントを強調

## 出力フォーマット
以下のJSON形式で出力してください。

\`\`\`json
{
  "title": "記事タイトル（30文字以内、心に刺さるフレーズ）",
  "body": "記事本文（Markdown形式、800〜1200文字）",
  "summary": "要約（50文字以内、OGP用）",
  "key_quotes": ["印象的な店主の言葉を3〜5個（インタビュー書き起こしから抽出）"],
  "emotion_tags": ["craftsman", "ingredient", "hospitality", "passion", "kodawari", "story から該当するものを選択"],
  "story_themes": {
    "origin": 0,
    "food_craft": 0,
    "hospitality": 0,
    "community": 0,
    "personality": 0,
    "local_connection": 0,
    "vision": 0
  },
  "structured_tags": {
    "kodawari": ["こだわりを表すタグを2〜5個"],
    "personality": ["店主の人柄を表すタグを2〜4個"],
    "scene": ["おすすめシーンを表すタグを2〜4個"],
    "atmosphere": ["お店の雰囲気を表すタグを2〜3個"]
  },
  "quality_indicators": {
    "transcript_coverage": 0.0,
    "unique_quotes_count": 0,
    "emotional_depth_score": 0,
    "factual_accuracy_notes": "事前調査データとの整合性に関する注記"
  }
}
\`\`\`

## 記事のスタイル
- 一人称視点ではなく、第三者が温かく紹介する語り口
- 店主の言葉はインタビュー書き起こしからそのまま引用（「」で囲む）
- 事前調査で見つかった情報は、店主の語りを補強する形で自然に織り込む
- story_themesの各スコアは0〜10で、インタビュー内容から判断

## 品質指標（quality_indicators）
- **transcript_coverage**: インタビュー書き起こしの内容をどれだけカバーしたか（0.0-1.0）
- **unique_quotes_count**: ストーリーに使用した固有の引用数
- **emotional_depth_score**: 感情的な深みのスコア（1-10）
- **factual_accuracy_notes**: 事前調査データとインタビュー内容の整合性に関する注記

## 注意
- インタビュー書き起こしの内容を忠実に反映する（創作しない）
- 事前調査データにあってもインタビューで語られなかった話題は控えめに
- 店主の人柄が伝わるような表現を心がける
- 専門用語は噛み砕いて説明する`;

export function buildHybridStoryGenerationPrompt(params: {
  transcript: string;
  preResearchData?: string;
  interviewerNotes?: string;
  designDocQuestions?: string;
}): string {
  let prompt = HYBRID_STORY_GENERATION_PROMPT;

  if (params.preResearchData) {
    prompt += `\n\n## 事前調査データ\n${params.preResearchData}`;
  }

  prompt += `\n\n## インタビュー書き起こし\n${params.transcript}`;

  if (params.interviewerNotes) {
    prompt += `\n\n## インタビュアーメモ\n${params.interviewerNotes}`;
  }

  if (params.designDocQuestions) {
    prompt += `\n\n## 使用したインタビュー設計書の質問リスト\n${params.designDocQuestions}`;
  }

  return prompt;
}
