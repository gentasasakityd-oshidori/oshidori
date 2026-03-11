/**
 * 事前調査サービス
 * API route から独立して呼び出し可能な事前調査ロジック
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createChatCompletion } from "@/lib/ai/client";
import { buildPreResearchPrompt } from "@/lib/prompts/pre-research";
import { logApiUsage } from "@/lib/ai/usage-logger";

export interface PreResearchResult {
  reportId: string;
  data: Record<string, unknown>;
}

/**
 * 事前調査を実行する
 * - 店舗情報を取得
 * - AIで公開情報分析を実施
 * - 結果をDBに保存
 */
export async function runPreResearch(
  supabase: SupabaseClient,
  shopId: string
): Promise<PreResearchResult> {
  // 店舗情報取得（申請情報との照合用に追加フィールドも取得）
  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select("name, category, area, tabelog_url, gmb_url, website_url, instagram_url, owner_name, phone, address_prefecture, address_city, address_street, address_building")
    .eq("id", shopId)
    .single();

  if (shopError || !shop) {
    throw new Error(`Shop not found: ${shopId}`);
  }

  const shopData = shop as {
    name: string;
    category: string;
    area: string;
    tabelog_url: string | null;
    gmb_url: string | null;
    website_url: string | null;
    instagram_url: string | null;
    owner_name: string | null;
    phone: string | null;
    address_prefecture: string | null;
    address_city: string | null;
    address_street: string | null;
    address_building: string | null;
  };

  // 事前調査レポートを作成（ステータス: in_progress）
  const { data: report, error: insertError } = await supabase
    .from("pre_research_reports")
    .insert({
      shop_id: shopId,
      research_status: "in_progress",
    })
    .select("id")
    .single();

  if (insertError || !report) {
    throw new Error(`Failed to create report: ${insertError?.message}`);
  }

  const reportId = (report as { id: string }).id;

  // プロンプト構築
  const prompt = buildPreResearchPrompt({
    shopName: shopData.name,
    category: shopData.category,
    area: shopData.area,
    existingData: {
      instagramUrl: shopData.instagram_url ?? undefined,
      tabelogUrl: shopData.tabelog_url ?? undefined,
      gmbUrl: shopData.gmb_url ?? undefined,
      websiteUrl: shopData.website_url ?? undefined,
    },
    registrationData: {
      ownerName: shopData.owner_name ?? undefined,
      phone: shopData.phone ?? undefined,
      address: [
        shopData.address_prefecture,
        shopData.address_city,
        shopData.address_street,
        shopData.address_building,
      ].filter(Boolean).join("") || undefined,
    },
  });

  // AI呼び出し
  const result = await createChatCompletion({
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `${shopData.name}（${shopData.area}の${shopData.category}）の事前調査を実施してください。
公開情報から得られる範囲で、店主の人柄・こだわり・エピソードの仮説を生成してください。`,
      },
    ],
    purpose: "generation",
    temperature: 0.5,
  });

  logApiUsage({
    endpoint: "pre-research",
    model: result.model,
    promptTokens: result.usage.prompt_tokens,
    completionTokens: result.usage.completion_tokens,
    totalTokens: result.usage.total_tokens,
    shopId,
  });

  // レスポンスをパース
  let researchData: Record<string, unknown>;
  try {
    const jsonMatch = result.content.match(/```json\n?([\s\S]*?)\n?```/);
    researchData = JSON.parse(jsonMatch ? jsonMatch[1] : result.content);
  } catch {
    researchData = { raw_response: result.content };
  }

  // 検証レポートの取得
  const verificationReport = researchData.verification_report as Record<string, unknown> | undefined;

  // レポートを更新
  await supabase
    .from("pre_research_reports")
    .update({
      personality_hypothesis: researchData.personality_hypothesis ?? [],
      kodawari_hypothesis: researchData.kodawari_hypothesis ?? [],
      episode_hypothesis: researchData.episode_hypothesis ?? [],
      verification_report: verificationReport ?? null,
      research_status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  // 検証結果が「要確認」または「却下推奨」の場合、運営にメール通知
  if (verificationReport) {
    const recommendation = verificationReport.recommendation as string | undefined;
    if (recommendation === "review_needed" || recommendation === "reject_recommended") {
      const { notifyAdmin } = await import("@/lib/email");
      const riskLevel = (verificationReport.overall_risk as string) || "unknown";
      const redFlags = (verificationReport.red_flags as Array<{ type: string; detail: string; severity: string }>) || [];
      const flagsSummary = redFlags.map((f) => `  - [${f.severity}] ${f.type}: ${f.detail}`).join("\n");
      const notes = (verificationReport.notes as string) || "";

      notifyAdmin("店舗登録情報の検証警告", [
        `店舗「${shopData.name}」の事前調査で検証上の懸念が検出されました。`,
        "",
        `総合リスク: ${riskLevel}`,
        `判定: ${recommendation}`,
        "",
        "検出されたレッドフラグ:",
        flagsSummary || "  （なし）",
        "",
        notes ? `補足: ${notes}` : "",
        "",
        "管理画面で確認してください:",
        `${process.env.NEXT_PUBLIC_APP_URL || "https://oshidori.vercel.app"}/admin/shops`,
      ].filter(Boolean).join("\n")).catch((e) => console.error("検証警告通知エラー:", e));
    }
  }

  return { reportId, data: researchData };
}
