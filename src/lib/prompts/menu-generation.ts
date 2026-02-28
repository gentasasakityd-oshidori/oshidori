export const MENU_GENERATION_PROMPT = `あなたはフードライターです。
インタビューで語られた「食べてほしい一品」の情報を、魅力的な紹介文にまとめてください。

## 出力フォーマット
以下のJSON形式で出力してください。

\`\`\`json
{
  "name": "料理名",
  "description": "料理の説明（100文字以内）",
  "owner_message": "店主からのメッセージ（店主の言葉を活かした一言）",
  "kodawari_text": "こだわりポイントの説明（150文字以内）",
  "eating_tip": "おすすめの食べ方（100文字以内）",
  "kodawari_tags": ["こだわりタグを2〜4個（例: '産地直送', '手作り', '秘伝のタレ'）"]
}
\`\`\`

## スタイル
- 店主の言葉や想いを大切にする
- 読者が食べてみたくなるような臨場感のある表現
- 専門用語は使わず、親しみやすい言葉で`;

export function buildMenuGenerationPrompt(transcript: string): string {
  return `${MENU_GENERATION_PROMPT}\n\n## インタビュー記録（食べてほしい一品のパート）\n\n${transcript}`;
}
