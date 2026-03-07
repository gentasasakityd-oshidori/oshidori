"use client";

import Link from "next/link";
import Image from "next/image";
import { ForecastBadge } from "./forecast-badge";
import { BUDGET_LABELS } from "@/lib/constants";

interface SmallCardProps {
  shopSlug: string;
  shopName: string;
  area?: string | null;
  imageUrl?: string | null;
  catchcopy?: string | null;
  hookSentence?: string | null;
  displayTags?: Array<{ icon: string; label: string }>;
  forecastScore?: number | null;
  forecastReasonText?: string | null;
  /** 相性マッチ理由タグ（カード/タグ形式で表示） */
  forecastReasonTags?: Array<{ icon: string; label: string }>;
  budgetLabel?: string | null;
}

export function SmallCard({
  shopSlug,
  shopName,
  area,
  imageUrl,
  catchcopy,
  hookSentence,
  displayTags,
  forecastScore,
  forecastReasonText,
  forecastReasonTags,
  budgetLabel,
}: SmallCardProps) {
  const budget = budgetLabel
    ? BUDGET_LABELS.find((b) => b.id === budgetLabel)
    : null;

  return (
    <Link
      href={`/shops/${shopSlug}`}
      className="group block overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
    >
      {/* Photo area with gradient overlay for readability */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={shopName}
              fill
              sizes="(max-width: 768px) 50vw, 300px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Dark gradient at bottom for text contrast */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/50 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#E06A4E]/80 to-[#B8533D]/60 flex items-center justify-center">
            {displayTags && displayTags.length > 0 ? (
              <span className="text-4xl">{displayTags[0].icon}</span>
            ) : (
              <span className="text-4xl text-white/40">🍽</span>
            )}
          </div>
        )}

        {/* Shop name + catchcopy overlay on image */}
        <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2">
          {catchcopy && (
            <p className="text-[13px] font-bold text-white leading-tight drop-shadow-sm line-clamp-2">
              {catchcopy}
            </p>
          )}
          <p className="text-[13px] font-semibold text-white leading-tight drop-shadow-sm line-clamp-2 mt-0.5">
            {shopName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {area && (
              <span className="text-[11px] text-white/70 drop-shadow-sm">
                {area}
              </span>
            )}
            {budget && (
              <span className="text-[11px] text-white/80 drop-shadow-sm">
                💰 {budget.range}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Text area */}
      <div className="p-2.5 flex flex-col gap-1">
        {/* Hook sentence — ストーリーの引き込み文 */}
        {hookSentence && (
          <p className="border-l-2 border-[#E06A4E]/30 pl-2 bg-orange-50/50 rounded-r text-[12px] italic text-gray-700 leading-[1.4] line-clamp-3">
            {hookSentence}
          </p>
        )}

        {/* Display tags */}
        {displayTags && displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {displayTags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-[11px] text-gray-500"
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Forecast score and reason tags */}
        {forecastScore != null && forecastScore > 0 && (
          <div className="mt-0.5 space-y-1">
            <ForecastBadge score={forecastScore} />
            {forecastReasonTags && forecastReasonTags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {forecastReasonTags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 rounded-md bg-orange-50 border border-orange-100 px-1.5 py-0.5 text-[10px] text-orange-700"
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </span>
                ))}
              </div>
            ) : forecastReasonText ? (
              <span className="text-[10px] text-orange-600 leading-snug line-clamp-1">
                {forecastReasonText}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </Link>
  );
}
