export function getHighlightPrompt(
  storyBody: string,
  storyThemes: Record<string, number>,
  catchcopyPrimary: string
): string {
  const themesFormatted = JSON.stringify(storyThemes, null, 2);

  return `あなたはストーリーのダイジェストを作るエディターです。
2,000〜3,000字のストーリーから、30秒で読める3行のハイライトを作成してください。

## 入力
- ストーリー全文：${storyBody}
- ストーリーテーマスコア：${themesFormatted}
- キャッチコピー：${catchcopyPrimary}

## ルール
- 3文、合計100〜150文字
- 構成：[フック] → [こだわりの核心] → [未来への想い or 読者への問いかけ]
- キャッチコピーと内容が重複しないこと
- 読んだ人が「もっと知りたい」と思う余白を残す（全部説明しない）
- 「です・ます」調は使わない。体言止め or 「〜だ」調でリズムを出す

## 出力
{"highlight": "3行ハイライトテキスト", "hook_sentence": "1文目（フック）のみ"}`;
}
