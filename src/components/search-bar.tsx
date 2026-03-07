"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Navigation, Settings } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const geo = useGeolocation();
  const [showGuide, setShowGuide] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/explore");
    }
  }

  function handleNearMe() {
    // 拒否済みの場合はガイドを表示
    if (geo.isDenied) {
      setShowGuide(true);
      geo.requestLocation(); // エラー状態を更新
      return;
    }

    // 既に取得済みなら即遷移
    if (geo.location) {
      router.push(
        `/explore?sort=distance&lat=${geo.location.lat}&lng=${geo.location.lng}`,
      );
      return;
    }

    // 未取得: ブラウザに許可を求める → 取得後に遷移
    geo.requestLocation();
  }

  // location 取得成功時に自動遷移
  useEffect(() => {
    if (geo.location) {
      setShowGuide(false);
      router.push(
        `/explore?sort=distance&lat=${geo.location.lat}&lng=${geo.location.lng}`,
      );
    }
  }, [geo.location]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm transition-colors hover:border-primary focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="店名、駅名、キーワードで探す..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button type="submit" className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
      <button
        type="button"
        onClick={handleNearMe}
        disabled={geo.loading}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50 ${
          geo.isDenied
            ? "border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100"
            : "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/30"
        }`}
      >
        {geo.loading ? (
          <>
            <Navigation className="h-3 w-3 animate-pulse" />
            取得中...
          </>
        ) : geo.isDenied ? (
          <>
            <Settings className="h-3 w-3" />
            位置情報の設定を確認
          </>
        ) : (
          <>
            <Navigation className="h-3 w-3" />
            現在地から探す
          </>
        )}
      </button>

      {/* 位置情報拒否時の設定変更ガイド */}
      {showGuide && geo.settingsGuide && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-orange-600 mb-1">
                位置情報の利用が拒否されています
              </p>
              <p className="text-[11px] leading-relaxed text-gray-700">
                <Settings className="inline h-3 w-3 mr-1 text-orange-500 -mt-0.5" />
                {geo.settingsGuide}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="shrink-0 text-gray-400 hover:text-gray-600 text-xs"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* エラー表示（拒否以外: タイムアウトなど） */}
      {geo.error && !geo.isDenied && (
        <p className="text-[11px] text-orange-600 ml-1">{geo.error}</p>
      )}
    </div>
  );
}
