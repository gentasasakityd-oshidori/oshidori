"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Navigation } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);

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
    if (!navigator.geolocation) {
      alert("お使いのブラウザでは位置情報を利用できません");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        router.push(
          `/explore?sort=distance&lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
        );
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert("位置情報の使用が拒否されました。ブラウザの設定から位置情報の許可をオンにしてください。");
        } else if (error.code === error.TIMEOUT) {
          alert("位置情報の取得がタイムアウトしました。もう一度お試しください。");
        } else {
          alert("位置情報の取得に失敗しました。設定から位置情報の許可をご確認ください。");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 300000,
      },
    );
  }

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
        disabled={locating}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/30 disabled:opacity-50"
      >
        <Navigation className="h-3 w-3" />
        {locating ? "取得中..." : "現在地から探す"}
      </button>
    </div>
  );
}
