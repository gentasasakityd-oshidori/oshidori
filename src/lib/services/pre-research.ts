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
    .select("name, category, area, tabelog_url, gmb_url, website_url, facebook_url, owner_name, phone, address_prefecture, address_city, address_street, address_building")
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
    facebook_url: string | null;
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
      facebookUrl: shopData.facebook_url ?? undefined,
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

  // AI呼び出し（事前調査は品質最重要のためgpt-4oを明示指定）
  const result = await createChatCompletion({
    messages: [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `${shopData.name}（${shopData.area}の${shopData.category}）の事前調査を実施してください。

以下を必ず含めてください：
- personality_hypothesis: 最低3件、各件に具体的な根拠（投稿日・口コミ原文引用等）とinterview_verification
- kodawari_hypothesis: 最低3件、各件にstory_potentialとinterview_angle
- episode_hypothesis: 最低3件、各件に具体的な質問案3つ
- customer_voice_analysis: 口コミの定量分析（件数・テーマ別頻度・代表的引用）
- menu_analysis: 看板メニュー最低2品の詳細分析
- interview_strategy: 推奨アングル3つ以上、店主のコミュニケーションスタイル推測、caution_topics
- phase_hypotheses: インタビュー7フェーズ（icebreak/origin/kodawari/signature_dish/regulars/community/future）それぞれに具体的な仮説・話題・質問案を準備

「薄い」「一般的」な仮説は禁止。この店にしかない具体的な事実に基づく仮説を生成してください。`,
      },
    ],
    model: "gpt-4o",
    temperature: 0.4,
    maxTokens: 12288,
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

  // レポートを更新（verification_reportカラムが存在しない環境にも対応）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {
    personality_hypothesis: researchData.personality_hypothesis ?? [],
    kodawari_hypothesis: researchData.kodawari_hypothesis ?? [],
    episode_hypothesis: researchData.episode_hypothesis ?? [],
    research_status: "completed",
    completed_at: new Date().toISOString(),
  };

  // v2フィールドをDBに保存（カラム未追加でもエラーにならないよう後から別途更新）
  const v2Fields: Record<string, unknown> = {};
  if (researchData.shop_profile) v2Fields.shop_profile = researchData.shop_profile;
  if (researchData.customer_voice_analysis) v2Fields.customer_voice_analysis = researchData.customer_voice_analysis;
  if (researchData.menu_analysis) v2Fields.menu_analysis = researchData.menu_analysis;
  if (researchData.competitive_context) v2Fields.competitive_context = researchData.competitive_context;
  if (researchData.interview_strategy) v2Fields.interview_strategy = researchData.interview_strategy;
  if (researchData.phase_hypotheses) v2Fields.phase_hypotheses = researchData.phase_hypotheses;

  // verification_reportは別途更新を試みる（カラム未追加の場合に本体更新が失敗しないよう分離）
  const { error: updateError } = await supabase
    .from("pre_research_reports")
    .update(updatePayload)
    .eq("id", reportId);

  if (updateError) {
    console.error(`[PreResearch] Report update error:`, updateError);
    throw new Error(`Failed to update report: ${updateError.message}`);
  }

  // verification_reportカラムの更新（失敗しても続行）
  if (verificationReport) {
    const { error: vrError } = await supabase
      .from("pre_research_reports")
      .update({ verification_report: verificationReport })
      .eq("id", reportId);
    if (vrError) {
      console.warn(`[PreResearch] verification_report update skipped:`, vrError.message);
    }
  }

  // v2フィールドの更新（カラム未追加でも続行）
  if (Object.keys(v2Fields).length > 0) {
    const { error: v2Error } = await supabase
      .from("pre_research_reports")
      .update(v2Fields)
      .eq("id", reportId);
    if (v2Error) {
      console.warn(`[PreResearch] v2 fields update skipped:`, v2Error.message);
    }
  }

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
