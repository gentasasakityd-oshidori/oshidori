"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/explore?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/explore");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm transition-colors hover:border-primary focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="店名、エリア、ジャンルで探す..."
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button type="submit" className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
