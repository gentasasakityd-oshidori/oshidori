"use client";

import Link from "next/link";
import Image from "next/image";
import { BUDGET_LABELS } from "@/lib/constants";

interface FullWideCardProps {
  shopSlug: string;
  shopName: string;
  imageUrl?: string | null;
  catchcopy?: string | null;
  displayTags?: Array<{ icon: string; label: string }>;
  forecastReasonText?: string | null;
  budgetLabel?: string | null;
}

export function FullWideCard({
  shopSlug,
  shopName,
  imageUrl,
  catchcopy,
  displayTags,
  forecastReasonText,
  budgetLabel,
}: FullWideCardProps) {
  const budget = budgetLabel
    ? BUDGET_LABELS.find((b) => b.id === budgetLabel)
    : null;

  return (
    <Link
      href={`/shops/${shopSlug}`}
      className="group block overflow-hidden rounded-xl shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
    >
      <div className="relative aspect-[16/9] w-full">
        {/* Background: photo or gradient fallback */}
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={shopName}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 960px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Dark gradient overlay at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </>
        ) : (
          /* Gradient fallback with catchcopy centered */
          <div className="absolute inset-0 bg-gradient-to-br from-[#E06A4E] to-[#B8533D] flex items-center justify-center px-8">
            {catchcopy && (
              <p className="text-center text-xl font-bold text-white/90 leading-relaxed" style={{ fontFamily: "'Noto Serif JP', serif" }}>
                {catchcopy}
              </p>
            )}
          </div>
        )}

        {/* Overlay text content - always at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-1.5">
          {/* Catchcopy (shown only when image exists; otherwise already centered above) */}
          {imageUrl && catchcopy && (
            <p
              className="text-base font-bold text-white leading-snug"
              style={{ fontFamily: "'Noto Serif JP', serif" }}
            >
              {catchcopy}
            </p>
          )}

          {/* Shop name + budget */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/80">{shopName}</span>
            {budget && (
              <span className="text-[11px] text-white/70 bg-white/15 px-1.5 py-0.5 rounded-full">
                💰 {budget.range}
              </span>
            )}
          </div>

          {/* Display tags */}
          {displayTags && displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {displayTags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 text-xs text-white/70"
                >
                  <span>{tag.icon}</span>
                  <span>{tag.label}</span>
                </span>
              ))}
            </div>
          )}

          {/* Forecast reason text */}
          {forecastReasonText && (
            <p className="text-[11px] italic text-white/60 mt-0.5 line-clamp-1">
              {forecastReasonText}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
