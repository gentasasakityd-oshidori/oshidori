export const PHOTO_REQUEST_PROMPT = `あなたはフードフォトグラファーのディレクターです。
インタビュー内容をもとに、お店の魅力を伝えるために撮影すべき写真のリストを作成してください。

## 出力フォーマット
以下のJSON形式で出力してください。

\`\`\`json
{
  "shots": [
    {
      "subject": "撮影対象（例: '看板メニューの盛り付け'）",
      "description": "どんなカットか（構図、アングル、雰囲気の指示）",
      "priority": "high"
    }
  ]
}
\`\`\`

## ガイドライン
- 5〜8カットを提案
- priority は high / medium / low で設定
- 料理の写真を最低2カット含める
- 店主のポートレートを1カット含める
- お店の雰囲気が伝わるカットを含める
- インタビューで語られたこだわりが伝わるカットを優先`;

export function buildPhotoRequestPrompt(transcript: string): string {
  return `${PHOTO_REQUEST_PROMPT}\n\n## インタビュー記録\n\n${transcript}`;
}
