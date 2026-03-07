"use client";

/**
 * オシドリ予報バッジ — 店舗との相性をパーセント + テキストラベルで直感的に表示
 *
 * score: 0-10 スケール（story_themes のスコア）
 */
export function ForecastBadge({ score, maxScore = 10 }: { score: number; maxScore?: number }) {
  const pct = Math.round(Math.min(Math.max(score, 0), maxScore) / maxScore * 100);

  const { label, colorClass } = getForecastStyle(pct);

  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${colorClass}`}>
      <span className="opacity-80">🌤</span>
      <span className="font-bold">{pct}%</span>
      <span className="text-[11px] opacity-80">{label}</span>
    </span>
  );
}

function getForecastStyle(pct: number): { label: string; colorClass: string } {
  if (pct >= 80) return { label: "ぴったり!", colorClass: "text-red-500" };
  if (pct >= 60) return { label: "おすすめ", colorClass: "text-orange-500" };
  if (pct >= 40) return { label: "合うかも", colorClass: "text-amber-500" };
  return { label: "チェック", colorClass: "text-gray-400" };
}
