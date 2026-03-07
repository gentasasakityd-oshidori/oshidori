"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { MOOD_TAGS } from "@/lib/constants";

interface MoodTagSelectorProps {
  onClose?: () => void;
}

export function MoodTagSelector({ onClose }: MoodTagSelectorProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadMoodTags() {
      try {
        const res = await fetch("/api/mood-preferences");
        if (res.ok) {
          const data = await res.json();
          setSelectedTags(data.mood_tags ?? []);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    loadMoodTags();
  }, []);

  const toggleTag = (value: string) => {
    setSelectedTags((prev) =>
      prev.includes(value)
        ? prev.filter((t) => t !== value)
        : [...prev, value],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/mood-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood_tags: selectedTags }),
      });

      if (res.ok) {
        if (onClose) onClose();
      }
    } catch {
      // ignore
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-[#2C3E50]">気分タグを選択</h3>
        <p className="text-[11px] text-muted-foreground mt-1">
          あなたの今の気分にぴったりのお店をおすすめします（複数選択可）
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MOOD_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag.value);
          return (
            <button
              key={tag.value}
              onClick={() => toggleTag(tag.value)}
              className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className="text-xl">{tag.icon}</span>
              <span className="text-[13px] font-medium text-[#2C3E50]">
                {tag.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            "保存"
          )}
        </Button>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        選択した気分タグはいつでも変更できます
      </p>
    </div>
  );
}
