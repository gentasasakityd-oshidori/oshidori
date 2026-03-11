"use client";

import { useState, useEffect } from "react";
import { BookOpen, ClipboardList, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TabKey = "stories" | "interviews";

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("stories");
  const [stories, setStories] = useState<{ id: string; title: string; status: string; shop_name: string; created_at: string }[]>([]);
  const [interviewerShops, setInterviewerShops] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [stRes, ivRes] = await Promise.all([
        fetch("/api/admin/interviews").then(r => r.ok ? r.json() : { stories: [] }).catch(() => ({ stories: [] })),
        fetch("/api/admin/interviewer/shops").then(r => r.ok ? r.json() : { shops: [] }).catch(() => ({ shops: [] })),
      ]);
      setStories(stRes.stories ?? []);
      setInterviewerShops(ivRes.shops ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const TABS: { key: TabKey; label: string; icon: typeof BookOpen }[] = [
    { key: "stories", label: "ストーリー管理", icon: BookOpen },
    { key: "interviews", label: "インタビュー管理", icon: ClipboardList },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">コンテンツ管理</h1>
      </div>

      {/* タブ */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "stories" && (
        <div className="space-y-3">
          {stories.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">ストーリーはまだありません</p>
          ) : (
            stories.map((story) => (
              <Card key={story.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{story.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {story.shop_name} · {new Date(story.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <Badge variant={story.status === "published" ? "default" : "secondary"} className="text-xs">
                    {story.status === "published" ? "公開" : story.status === "draft" ? "下書き" : story.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "interviews" && (
        <div className="space-y-3">
          {interviewerShops.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">インタビュー管理データはありません</p>
          ) : (
            interviewerShops.map((shop, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <pre className="text-xs overflow-auto">{JSON.stringify(shop, null, 2)}</pre>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
