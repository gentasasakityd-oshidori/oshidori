/**
 * AI均質化スコア計算
 *
 * ストーリー間の類似度をn-gram + Jaccard係数で簡易算出し、
 * 均質化リスクを0-100スコアで表現する。
 */

/** テキストからn-gramセットを生成 */
function getNgrams(text: string, n: number = 3): Set<string> {
  const normalized = text
    .replace(/\s+/g, "")
    .replace(/[。、！？「」『』（）\n\r]/g, "");
  const ngrams = new Set<string>();
  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.add(normalized.substring(i, i + n));
  }
  return ngrams;
}

/** Jaccard係数（0-1） */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * ストーリー間の均質化スコアを計算（0-100）
 *
 * - 0-20: 健全（ストーリーが十分に多様）
 * - 20-40: 注意（やや類似性が高い）
 * - 40+: 警告（均質化リスク）
 *
 * @param stories ストーリー本文の配列
 * @returns スコア（0-100）
 */
export function calculateHomogeneityScore(stories: string[]): number {
  if (stories.length < 2) return 0;

  const ngramSets = stories.map((s) => getNgrams(s));
  let totalSimilarity = 0;
  let pairCount = 0;

  for (let i = 0; i < ngramSets.length; i++) {
    for (let j = i + 1; j < ngramSets.length; j++) {
      totalSimilarity += jaccardSimilarity(ngramSets[i], ngramSets[j]);
      pairCount++;
    }
  }

  const avgSimilarity = pairCount > 0 ? totalSimilarity / pairCount : 0;
  // Jaccard 0-1 を 0-100 スケールに変換
  // 飲食店ストーリーの場合、0.15-0.25程度の類似度が正常範囲
  return Math.round(avgSimilarity * 300); // 0.33で約100になるスケーリング
}

/**
 * 個別ストーリーの他ストーリーとの平均類似度
 */
export function calculateStorySimilarity(
  targetStory: string,
  otherStories: string[]
): number {
  if (otherStories.length === 0) return 0;

  const targetNgrams = getNgrams(targetStory);
  let totalSimilarity = 0;

  for (const other of otherStories) {
    const otherNgrams = getNgrams(other);
    totalSimilarity += jaccardSimilarity(targetNgrams, otherNgrams);
  }

  const avgSimilarity = totalSimilarity / otherStories.length;
  return Math.round(avgSimilarity * 300);
}

/**
 * 均質化スコアのリスクレベル判定
 */
export function getHomogeneityLevel(score: number): {
  level: "healthy" | "caution" | "warning";
  label: string;
  color: string;
} {
  if (score < 20) {
    return { level: "healthy", label: "健全", color: "text-green-600" };
  }
  if (score < 40) {
    return { level: "caution", label: "注意", color: "text-amber-600" };
  }
  return { level: "warning", label: "均質化リスク", color: "text-red-600" };
}
