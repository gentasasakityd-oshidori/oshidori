"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Mic,
  Bot,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

type CMProposalData = {
  id: string;
  proposal_type: string;
  title: string;
  description: string;
  suggested_action: string;
  suggested_message?: string;
  priority: "high" | "normal" | "low";
  status: string;
  created_at: string;
};

export default function AIPage() {
  const [proposals, setProposals] = useState<CMProposalData[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: shops } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", user.id)
          .limit(1);
        if (!shops || shops.length === 0) return;
        const shopId = (shops[0] as { id: string }).id;

        const cmRes = await fetch(`/api/cm-proposals?shop_id=${shopId}&limit=20`);
        if (cmRes.ok) {
          const cmData = await cmRes.json();
          setProposals(cmData.proposals ?? []);
          setPendingCount(cmData.pending_count ?? 0);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleProposalAction = async (proposalId: string, action: "accept" | "dismiss") => {
    try {
      const res = await fetch("/api/cm-proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal_id: proposalId, action }),
      });
      if (res.ok) {
        setProposals((prev) => prev.filter((p) => p.id !== proposalId));
        setPendingCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    }
  };

  const pendingProposals = proposals.filter((p) => p.status === "pending");
  const processedProposals = proposals.filter((p) => p.status !== "pending");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          🤖 AI機能
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AIインタビューと、AIコミュニティマネージャーの提案を管理
        </p>
      </div>

      {/* AIインタビューへのリンク */}
      <Link href="/dashboard/interview" className="group block">
        <Card className="transition-all hover:shadow-md hover:border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                🎤
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[#2C3E50] group-hover:text-primary transition-colors">
                  AIインタビュー
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  AIインタビュアー「ナオ」があなたのお店の魅力を引き出します
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* AI提案（ペンディング） */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bot className="h-4 w-4 text-purple-600" />
          <h2 className="text-base font-semibold">AI提案</h2>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700">
              {pendingCount}件
            </Badge>
          )}
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              読み込み中...
            </CardContent>
          </Card>
        ) : pendingProposals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                現在、新しい提案はありません。
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                データが蓄積されるとAIが最適なアクションを提案します。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingProposals.map((proposal) => (
              <Card key={proposal.id} className="border-purple-100">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {proposal.priority === "high" && (
                          <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700">
                            優先
                          </Badge>
                        )}
                        <p className="text-sm font-medium">{proposal.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {proposal.description}
                      </p>
                      {proposal.suggested_message && (
                        <div className="mt-2 rounded bg-purple-50/50 p-2">
                          <p className="text-xs text-purple-800 line-clamp-2">
                            &quot;{proposal.suggested_message}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => handleProposalAction(proposal.id, "accept")}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors hover:bg-green-200"
                        title="採用する"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleProposalAction(proposal.id, "dismiss")}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
                        title="却下する"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 処理済み提案の履歴 */}
      {processedProposals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">📊 提案履歴</h2>
          <div className="space-y-1.5">
            {processedProposals.slice(0, 10).map((proposal) => (
              <div
                key={proposal.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-sm"
              >
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  proposal.status === "accepted"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {proposal.status === "accepted" ? "承認" : "却下"}
                </span>
                <span className="text-[#2C3E50] truncate flex-1">{proposal.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(proposal.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
