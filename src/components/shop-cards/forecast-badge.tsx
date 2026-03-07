"use client";

/**
 * オシドリ予報バッジ — 店舗との「相性」を言語化して表示
 *
 * score: 0-10 スケール（story_themes のスコア）
 * 数値スコアは表示せず、相性レベルをテキスト + アイコンで表現。
 * v6.1「推しスコア排除」の思想に準拠し、店舗の評点ではなく
 * 「あなたとの相性予測」という文脈で表現する。
 */
export function ForecastBadge({ score, maxScore = 10 }: { score: number; maxScore?: number }) {
  const pct = Math.round(Math.min(Math.max(score, 0), maxScore) / maxScore * 100);

  const { emoji, label, colorClass, bgClass } = getCompatibilityStyle(pct);

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${colorClass} ${bgClass}`}>
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

function getCompatibilityStyle(pct: number): { emoji: string; label: string; colorClass: string; bgClass: string } {
  if (pct >= 80) return { emoji: "💫", label: "相性ぴったり", colorClass: "text-rose-700", bgClass: "bg-rose-50" };
  if (pct >= 60) return { emoji: "✨", label: "相性◎", colorClass: "text-orange-700", bgClass: "bg-orange-50" };
  if (pct >= 40) return { emoji: "🌟", label: "合うかも", colorClass: "text-amber-700", bgClass: "bg-amber-50" };
  return { emoji: "🌤", label: "気になる", colorClass: "text-gray-500", bgClass: "bg-gray-50" };
}
