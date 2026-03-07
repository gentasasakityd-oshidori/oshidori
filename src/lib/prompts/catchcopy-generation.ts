export function getCatchcopyPrompt(
  storyBody: string,
  keyQuotes: string,
  storyThemes: Record<string, number>
): string {
  const themesFormatted = JSON.stringify(storyThemes, null, 2);

  return `あなたは飲食店のストーリーから、一目で心を掴む1行コピーを作るコピーライターです。

## 入力
- ストーリー全文：${storyBody}
- 店主の印象的な引用：${keyQuotes}
- ストーリーテーマスコア：${themesFormatted}

## ルール
- 20文字以内（日本語）
- 店主の言葉をそのまま使うか、ストーリーの最もエモーショナルな一節を凝縮する
- 「美味しい」「絶品」等のグルメ形容詞は禁止
- 読んだ人が「え、どういうこと？」と興味を持つフックを作る
- 具体的な数字・固有名詞・五感が入ると強い

## 良い例
- 「毎朝4時、市場への片道切符」
- 「"火は嘘をつかない"」
- 「三代目が壊した、祖父の味」
- 「常連さんの"いつもの"は42通り」

## 悪い例
- 「こだわりの絶品料理」（グルメ形容詞・具体性ゼロ）
- 「心を込めて」（ありきたり）
- 「地元で愛される名店」（メディア的表現）

## 出力
JSON形式で3案出力。最もストーリーテーマの最高スコアテーマに合致するものを primary とする。
{"primary": "キャッチコピー本命", "alt_1": "代替案1", "alt_2": "代替案2"}`;
}
