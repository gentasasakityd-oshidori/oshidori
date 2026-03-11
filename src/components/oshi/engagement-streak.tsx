"use client";

import { Flame } from "lucide-react";

type Props = {
  current: number;
  longest: number;
};

export function EngagementStreak({ current, longest }: Props) {
  const isHot = current >= 3;
  const isBurning = current >= 7;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
          isBurning
            ? "bg-red-100 text-red-700"
            : isHot
              ? "bg-orange-100 text-orange-700"
              : "bg-gray-100 text-gray-700"
        }`}
      >
        <Flame
          className={`h-4 w-4 ${
            isBurning ? "text-red-500" : isHot ? "text-orange-500" : "text-gray-400"
          }`}
        />
        <span>{current}日連続</span>
      </div>
      {longest > current && (
        <span className="text-xs text-muted-foreground">
          最長 {longest}日
        </span>
      )}
    </div>
  );
}
