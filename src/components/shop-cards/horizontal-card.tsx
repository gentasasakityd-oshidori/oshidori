"use client";

import Link from "next/link";
import Image from "next/image";
import { ForecastBadge } from "./forecast-badge";
import { BUDGET_LABELS } from "@/lib/constants";

interface HorizontalCardProps {
  shopSlug: string;
  shopName: string;
  area?: string | null;
  imageUrl?: string | null;
  hookSentence?: string | null;
  displayTags?: Array<{ icon: string; label: string }>;
  walkingMinutes?: number | null;
  forecastScore?: number | null;
  forecastReasonText?: string | null;
  budgetLabel?: string | null;
}

export function HorizontalCard({
  shopSlug,
  shopName,
  area,
  imageUrl,
  hookSentence,
  displayTags,
  walkingMinutes,
  forecastScore,
  forecastReasonText,
  budgetLabel,
}: HorizontalCardProps) {
  const budget = budgetLabel
    ? BUDGET_LABELS.find((b) => b.id === budgetLabel)
    : null;

  return (
    <Link
      href={`/shops/${shopSlug}`}
      className="group flex items-stretch gap-3 py-3 border-b border-gray-100 last:border-b-0 transition-colors hover:bg-gray-50/50 rounded-lg"
    >
      {/* Left: photo thumbnail — slightly larger */}
      <div className="relative h-[100px] w-[100px] flex-shrink-0 overflow-hidden rounded-xl">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={shopName}
            fill
            sizes="100px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E06A4E]/20 to-orange-50">
            {displayTags && displayTags.length > 0 ? (
              <span className="text-3xl">{displayTags[0].icon}</span>
            ) : (
              <span className="text-2xl text-gray-300">🍽</span>
            )}
          </div>
        )}
      </div>

      {/* Right: text area */}
      <div className="flex flex-1 flex-col justify-center gap-0.5 min-w-0 py-0.5">
        {/* Shop name (BOLD, clearly readable) */}
        <p className="text-[15px] font-bold text-[#2C3E50] leading-tight group-hover:text-[#E06A4E] transition-colors">
          {shopName}
        </p>

        {/* Area + Budget label */}
        <div className="flex items-center gap-1.5">
          {area && (
            <span className="text-[12px] text-gray-400">
              {area}
            </span>
          )}
          {budget && (
            <span className="text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              {budget.range}
            </span>
          )}
        </div>

        {/* Hook sentence — wrapping allowed, 2 lines max */}
        {hookSentence && (
          <p className="text-[13px] text-gray-600 leading-[1.4] line-clamp-2 mt-0.5">
            {hookSentence}
          </p>
        )}

        {/* Tags + walking time */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
          {displayTags &&
            displayTags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-[11px] text-gray-500"
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </span>
            ))}
          {walkingMinutes != null && (
            <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400">
              <span>📍</span>
              <span>徒歩{walkingMinutes}分</span>
            </span>
          )}
        </div>

        {/* Forecast score */}
        {forecastScore != null && forecastScore > 0 && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <ForecastBadge score={forecastScore} />
            {forecastReasonText && (
              <span className="text-[11px] text-orange-600 line-clamp-1 flex-1 min-w-0">
                {forecastReasonText}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
