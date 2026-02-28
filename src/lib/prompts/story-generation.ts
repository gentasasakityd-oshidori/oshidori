export const STORY_GENERATION_PROMPT = `あなたはプロのライターです。
飲食店オーナーへのインタビュー記録をもとに、読者の心に響くストーリー記事を作成してください。

## 出力フォーマット
以下のJSON形式で出力してください。

\`\`\`json
{
  "title": "記事タイトル（30文字以内、心に刺さるフレーズ）",
  "body": "記事本文（Markdown形式、800〜1200文字）",
  "summary": "要約（50文字以内、OGP用）",
  "key_quotes": ["印象的な店主の言葉を3〜5個"],
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
    "kodawari": ["こだわりを表すタグを2〜5個。例: 産地直送、手打ち、炭火焼き、無添加、旬の素材"],
    "personality": ["店主の人柄を表すタグを2〜4個。例: 職人気質、話し好き、研究熱心、おおらか、繊細"],
    "scene": ["おすすめシーンを表すタグを2〜4個。例: デート、一人飲み、家族の食事、接待、友人との集まり、記念日"]
  }
}
\`\`\`

## 記事のスタイル
- 一人称視点ではなく、第三者が温かく紹介する語り口
- 店主の言葉はそのまま引用（「」で囲む）
- 読者が「このお店に行ってみたい」と思えるように
- 感動や共感を呼ぶポイントを強調
- story_themesの各スコアは0〜10で、インタビュー内容から判断

## 構造化タグについて（重要）
structured_tagsは将来の検索・フィルター機能の基盤データです。
- **kodawari**: インタビューから読み取れる店主のこだわりポイントを短いフレーズで抽出
- **personality**: 店主の人柄・キャラクターを表す形容詞やフレーズを抽出
- **scene**: この店が特に合うシーン・オケージョンをインタビュー内容から推定
- タグは具体的で検索に使いやすい短いフレーズにする（1〜6文字程度）
- インタビュー内容から確信度の高いものだけを選ぶ

## 注意
- インタビュー内容を忠実に反映する（創作しない）
- 店主の人柄が伝わるような表現を心がける
- 専門用語は噛み砕いて説明する`;

export function buildStoryGenerationPrompt(transcript: string): string {
  return `${STORY_GENERATION_PROMPT}\n\n## インタビュー記録\n\n${transcript}`;
}
