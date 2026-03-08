"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Store,
  FileText,
  Mic,
  BookOpen,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Save,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  PHASE_METADATA,
  ONBOARDING_PHASES,
  type OnboardingPhase,
} from "@/lib/onboarding";
import type { Json } from "@/types/database";

type ShopDetail = {
  shop: {
    id: string;
    name: string;
    owner_name: string;
    category: string;
    area: string;
    onboarding_phase: string;
    created_at: string;
  };
  preResearch: {
    id: string;
    personality_hypothesis: Json;
    kodawari_hypothesis: Json;
    episode_hypothesis: Json;
    research_status: string;
    completed_at: string | null;
  } | null;
  designDoc: {
    id: string;
    questions: Json;
    interview_strategy: string | null;
    focus_areas: string[];
    estimated_duration_minutes: number;
    status: string;
    interviewer_notes: string | null;
    created_at: string;
  } | null;
  interviews: Array<{
    id: string;
    status: string;
    interview_mode: string;
    transcript: Json;
    created_at: string;
    completed_at: string | null;
  }>;
  stories: Array<{
    id: string;
    title: string;
    body: string;
    summary: string | null;
    created_at: string;
  }>;
  assignment: {
    id: string;
    status: string;
    scheduled_date: string | null;
    scheduled_time: string | null;
    notes: string | null;
  } | null;
};

type TabType = "overview" | "preparation" | "interview" | "post";

export default function InterviewerShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shopId = params.shopId as string;

  const [data, setData] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [notes, setNotes] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/interviewer/shops/${shopId}`);
      const json = await res.json();
      setData(json);
      if (json.assignment?.notes) setNotes(json.assignment.notes);
      if (json.assignment?.scheduled_date) setScheduledDate(json.assignment.scheduled_date);
      if (json.assignment?.scheduled_time) setScheduledTime(json.assignment.scheduled_time);
    } catch {
      console.error("Failed to fetch shop detail");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (action: string, extraData?: Record<string, unknown>) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/interviewer/shops/${shopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extraData }),
      });
      await fetchData();
    } catch {
      console.error("Action failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground">読み込み中...</div>
    );
  }

  if (!data?.shop) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        店舗が見つかりません
      </div>
    );
  }

  const { shop, preResearch, designDoc, interviews, stories } = data;
  const phaseInfo = PHASE_METADATA[shop.onboarding_phase as OnboardingPhase];
  const phaseIndex = ONBOARDING_PHASES.indexOf(shop.onboarding_phase as OnboardingPhase);

  const TABS: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "概要", icon: Store },
    { key: "preparation", label: "インタビュー準備", icon: FileText },
    { key: "interview", label: "インタビュー実施", icon: Mic },
    { key: "post", label: "インタビュー後", icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/interviewer")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{shop.name}</h1>
          <p className="text-sm text-muted-foreground">
            {shop.owner_name} · {shop.area} · {shop.category}
          </p>
        </div>
        <Badge className={`${phaseInfo?.color ?? "bg-gray-100"} ${phaseInfo?.textColor ?? "text-gray-700"} border-0`}>
          {phaseInfo?.label ?? shop.onboarding_phase}
        </Badge>
      </div>

      {/* 進捗バー */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-1">
            {ONBOARDING_PHASES.map((phase, idx) => (
              <div
                key={phase}
                className={`h-2 flex-1 rounded-full ${
                  idx <= phaseIndex ? "bg-primary" : "bg-gray-200"
                }`}
                title={PHASE_METADATA[phase].label}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground text-center">
            {phaseInfo?.description}
          </p>
        </CardContent>
      </Card>

      {/* タブ */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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

      {/* タブコンテンツ */}
      {activeTab === "overview" && (
        <OverviewTab
          shop={shop}
          preResearch={preResearch}
          designDoc={designDoc}
          interviews={interviews}
          stories={stories}
        />
      )}

      {activeTab === "preparation" && (
        <PreparationTab
          preResearch={preResearch}
          designDoc={designDoc}
          scheduledDate={scheduledDate}
          scheduledTime={scheduledTime}
          onScheduledDateChange={setScheduledDate}
          onScheduledTimeChange={setScheduledTime}
          onSchedule={() =>
            handleAction("schedule", {
              scheduled_date: scheduledDate,
              scheduled_time: scheduledTime,
            })
          }
          saving={saving}
        />
      )}

      {activeTab === "interview" && (
        <InterviewTab
          designDoc={designDoc}
          notes={notes}
          onNotesChange={setNotes}
          onSaveNotes={() => handleAction("update_notes", { notes })}
          onMarkCompleted={() => handleAction("mark_interview_completed")}
          saving={saving}
          currentPhase={shop.onboarding_phase}
        />
      )}

      {activeTab === "post" && (
        <PostInterviewTab
          interviews={interviews}
          stories={stories}
          currentPhase={shop.onboarding_phase}
        />
      )}
    </div>
  );
}

// ─── 概要タブ ───
function OverviewTab({
  shop,
  preResearch,
  designDoc,
  interviews,
  stories,
}: {
  shop: ShopDetail["shop"];
  preResearch: ShopDetail["preResearch"];
  designDoc: ShopDetail["designDoc"];
  interviews: ShopDetail["interviews"];
  stories: ShopDetail["stories"];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">店舗情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">店名</span>
            <span>{shop.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">オーナー</span>
            <span>{shop.owner_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">エリア</span>
            <span>{shop.area}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">カテゴリ</span>
            <span>{shop.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">登録日</span>
            <span>{new Date(shop.created_at).toLocaleDateString("ja-JP")}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">進捗状況</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">事前調査</span>
            {preResearch ? (
              <Badge variant="outline" className="bg-green-50 text-green-700">完了</Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-500">未実施</Badge>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">設計書</span>
            {designDoc ? (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {designDoc.status}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-500">未作成</Badge>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">インタビュー</span>
            {interviews.length > 0 ? (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {interviews[0].status}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-500">未実施</Badge>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">ストーリー</span>
            {stories.length > 0 ? (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {stories.length}件
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-500">未作成</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── インタビュー準備タブ ───
function PreparationTab({
  preResearch,
  designDoc,
  scheduledDate,
  scheduledTime,
  onScheduledDateChange,
  onScheduledTimeChange,
  onSchedule,
  saving,
}: {
  preResearch: ShopDetail["preResearch"];
  designDoc: ShopDetail["designDoc"];
  scheduledDate: string;
  scheduledTime: string;
  onScheduledDateChange: (v: string) => void;
  onScheduledTimeChange: (v: string) => void;
  onSchedule: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* 事前調査サマリー */}
      {preResearch && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              事前調査レポート
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 人柄仮説 */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">人柄の仮説</h4>
              <div className="space-y-1">
                {Array.isArray(preResearch.personality_hypothesis)
                  ? (preResearch.personality_hypothesis as Array<{ trait: string; confidence: string }>).map(
                      (h, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">{h.confidence}</Badge>
                          <span>{h.trait}</span>
                        </div>
                      )
                    )
                  : <p className="text-sm text-muted-foreground">データなし</p>}
              </div>
            </div>

            {/* こだわり仮説 */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">こだわりの仮説</h4>
              <div className="space-y-1">
                {Array.isArray(preResearch.kodawari_hypothesis)
                  ? (preResearch.kodawari_hypothesis as Array<{ axis: string; confidence: string }>).map(
                      (h, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">{h.confidence}</Badge>
                          <span>{h.axis}</span>
                        </div>
                      )
                    )
                  : <p className="text-sm text-muted-foreground">データなし</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* インタビュー設計書 */}
      {designDoc && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              インタビュー設計書（{designDoc.estimated_duration_minutes}分）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {designDoc.interview_strategy && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1">戦略</h4>
                <p className="text-sm">{designDoc.interview_strategy}</p>
              </div>
            )}

            {designDoc.focus_areas?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-1">重点エリア</h4>
                <div className="flex flex-wrap gap-1">
                  {designDoc.focus_areas.map((area, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{area}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 質問リスト */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">質問リスト</h4>
              <div className="space-y-3">
                {Array.isArray(designDoc.questions)
                  ? (designDoc.questions as Array<{
                      order: number;
                      phase: string;
                      question: string;
                      intent: string;
                      priority: string;
                    }>).map((q, i) => (
                      <div key={i} className="rounded-lg border p-3">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 h-6 w-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                            {q.order || i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{q.question}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{q.phase}</Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] ${
                                  q.priority === "must_ask"
                                    ? "bg-red-50 text-red-700"
                                    : q.priority === "nice_to_have"
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-gray-50 text-gray-500"
                                }`}
                              >
                                {q.priority}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{q.intent}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  : <p className="text-sm text-muted-foreground">質問データなし</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 日程設定 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            インタビュー日程
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">日付</label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => onScheduledDateChange(e.target.value)}
              />
            </div>
            <div className="w-32">
              <label className="text-xs text-muted-foreground">時間</label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => onScheduledTimeChange(e.target.value)}
              />
            </div>
            <Button onClick={onSchedule} disabled={saving || !scheduledDate} size="sm">
              <Save className="h-3 w-3 mr-1" />
              保存
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── インタビュー実施タブ ───
function InterviewTab({
  designDoc,
  notes,
  onNotesChange,
  onSaveNotes,
  onMarkCompleted,
  saving,
  currentPhase,
}: {
  designDoc: ShopDetail["designDoc"];
  notes: string;
  onNotesChange: (v: string) => void;
  onSaveNotes: () => void;
  onMarkCompleted: () => void;
  saving: boolean;
  currentPhase: string;
}) {
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(new Set());

  const toggleQuestion = (idx: number) => {
    setCheckedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const questions = Array.isArray(designDoc?.questions)
    ? (designDoc.questions as Array<{
        order: number;
        question: string;
        follow_up_hints?: string[];
      }>)
    : [];

  return (
    <div className="space-y-6">
      {/* チェックリスト形式の質問リスト */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            質問チェックリスト（{checkedQuestions.size}/{questions.length}）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  checkedQuestions.has(i) ? "bg-green-50 border-green-200" : "hover:bg-gray-50"
                }`}
                onClick={() => toggleQuestion(i)}
              >
                <div className={`mt-0.5 shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center ${
                  checkedQuestions.has(i) ? "bg-green-500 border-green-500" : "border-gray-300"
                }`}>
                  {checkedQuestions.has(i) && <CheckCircle2 className="h-4 w-4 text-white" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${checkedQuestions.has(i) ? "line-through text-muted-foreground" : ""}`}>
                    {q.question}
                  </p>
                  {q.follow_up_hints && q.follow_up_hints.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      深掘り: {q.follow_up_hints.join(" / ")}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* メモ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">インタビューメモ</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="インタビュー中のメモを記入..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={6}
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={onSaveNotes} disabled={saving}>
              <Save className="h-3 w-3 mr-1" />
              メモ保存
            </Button>
            {["interviewer_assigned", "interview_scheduled"].includes(currentPhase) && (
              <Button size="sm" onClick={onMarkCompleted} disabled={saving}>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                インタビュー完了
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── インタビュー後処理タブ ───
function PostInterviewTab({
  interviews,
  stories,
  currentPhase,
}: {
  interviews: ShopDetail["interviews"];
  stories: ShopDetail["stories"];
  currentPhase: string;
}) {
  return (
    <div className="space-y-6">
      {/* インタビュー一覧 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mic className="h-4 w-4" />
            インタビュー履歴
          </CardTitle>
        </CardHeader>
        <CardContent>
          {interviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">インタビューはまだ実施されていません</p>
          ) : (
            <div className="space-y-2">
              {interviews.map((interview) => (
                <div key={interview.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {interview.interview_mode === "hybrid" ? "ハイブリッド" : interview.interview_mode}
                      インタビュー
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(interview.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <Badge variant="outline" className={
                    interview.status === "completed" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                  }>
                    {interview.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ストーリー */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            生成ストーリー
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stories.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">ストーリーはまだ生成されていません</p>
              {currentPhase === "interview_completed" && (
                <Button size="sm">
                  <Play className="h-3 w-3 mr-1" />
                  ストーリー生成
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {stories.map((story) => (
                <div key={story.id} className="rounded-lg border p-4">
                  <h4 className="font-medium mb-1">{story.title}</h4>
                  {story.summary && (
                    <p className="text-sm text-muted-foreground">{story.summary}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(story.created_at).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
