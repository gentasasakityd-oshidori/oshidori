/**
 * AIコミュニティマネージャー提案ジェネレーター（v6.1 Phase 4）
 *
 * インタビュー完了時やマイルストーン到達時に、
 * 店主へのアクション提案を生成する。
 *
 * 提案生成のトリガー:
 * 1. interview_complete — インタビュー完了時
 * 2. visit_milestone — 来店マイルストーン到達時
 * 3. fan_letter_received — ファンレター受信時
 * 4. daily_batch — 日次バッチ（定期提案）
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createChatCompletion } from "@/lib/ai/client";
import { logApiUsage } from "@/lib/ai/usage-logger";
import type { DetectedMilestone } from "@/lib/milestones";
import { getMilestoneLabel } from "@/lib/milestones";

/** CM提案の型 */
export interface CMProposal {
  proposal_type: string;
  title: string;
  description: string;
  suggested_action: string;
  suggested_message?: string;
  priority: "high" | "normal" | "low";
  target_user_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  trigger_source: string;
  trigger_data?: Record<string, unknown>;
  expires_at?: string;
}

/**
 * インタビュー完了時のCM提案を生成する
 * ストーリーの内容に基づいて、フォローアップアクションを提案
 */
export async function generateInterviewCompletionProposals(
  supabase: SupabaseClient,
  shopId: string,
  interviewId: string,
  interviewType: string,
): Promise<CMProposal[]> {
  const proposals: CMProposal[] = [];

  // 店舗情報を取得
  const { data: shop } = await supabase
    .from("shops")
    .select("name, owner_name")
    .eq("id", shopId)
    .single();

  if (!shop) return proposals;
  const { name: shopName, owner_name: ownerName } = shop as { name: string; owner_name: string };

  // 初回インタビュー完了時の提案
  if (interviewType === "initial_interview") {
    // 1. ストーリー公開の促し
    proposals.push({
      proposal_type: "story_follow_up",
      title: "ストーリーを公開しましょう",
      description: `${ownerName}さんのインタビューからストーリーが完成しました。内容を確認して、お客さんに届けましょう。`,
      suggested_action: "ストーリーページで内容を確認し、「公開する」ボタンを押してください。",
      priority: "high",
      related_entity_type: "ai_interview",
      related_entity_id: interviewId,
      trigger_source: "interview_complete",
      trigger_data: { interview_type: interviewType },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7日後
    });

    // 2. 写真撮影リクエストのフォローアップ
    proposals.push({
      proposal_type: "story_follow_up",
      title: "お店の写真を撮影しましょう",
      description: "ストーリーをもっと魅力的にするために、撮影リクエストに沿った写真を追加しましょう。",
      suggested_action: "ダッシュボードの「写真」ページで撮影リクエストを確認し、写真をアップロードしてください。",
      priority: "normal",
      trigger_source: "interview_complete",
      trigger_data: { interview_type: interviewType },
      expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14日後
    });

    // 3. QRコード設置の促し
    proposals.push({
      proposal_type: "engagement_boost",
      title: "QRコードをお店に設置しましょう",
      description: `${shopName}のオシドリページへのQRコードを印刷して、レジ横やテーブルに設置しましょう。お客さんがスマホで簡単にアクセスできます。`,
      suggested_action: "ダッシュボードの「QRコード」ページからダウンロードして印刷してください。",
      priority: "normal",
      trigger_source: "interview_complete",
      trigger_data: { interview_type: interviewType },
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
    });
  }

  // メニュー追加インタビュー完了時
  if (interviewType === "menu_addition") {
    proposals.push({
      proposal_type: "menu_highlight",
      title: "新メニューをお客さんに伝えましょう",
      description: "追加されたメニューのストーリーが完成しました。SNSやお店の掲示でお知らせしましょう。",
      suggested_action: "メニューページで内容を確認し、「更新情報」として投稿することを検討してください。",
      priority: "normal",
      related_entity_type: "ai_interview",
      related_entity_id: interviewId,
      trigger_source: "interview_complete",
      trigger_data: { interview_type: interviewType },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return proposals;
}

/**
 * マイルストーン到達時のCM提案を生成する
 * 店主に、お客さんへのお祝いアクションを提案
 */
export async function generateMilestoneProposals(
  supabase: SupabaseClient,
  shopId: string,
  milestones: DetectedMilestone[],
): Promise<CMProposal[]> {
  const proposals: CMProposal[] = [];

  // 店舗・ユーザー情報を取得
  const { data: shop } = await supabase
    .from("shops")
    .select("name, owner_name")
    .eq("id", shopId)
    .single();

  if (!shop) return proposals;
  const { name: shopName, owner_name: ownerName } = shop as { name: string; owner_name: string };

  for (const milestone of milestones) {
    // ユーザー名を取得
    const { data: userData } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", milestone.userId)
      .single();

    const userName = (userData as { nickname: string | null } | null)?.nickname ?? "お客さん";
    const milestoneLabel = getMilestoneLabel(milestone.type);

    // マイルストーンタイプに応じた提案を生成
    const proposal = await generateMilestoneMessage(
      shopName,
      ownerName,
      userName,
      milestone,
      milestoneLabel,
    );

    proposals.push({
      proposal_type: "milestone_celebration",
      title: `${userName}さんが「${milestoneLabel}」を達成！`,
      description: proposal.description,
      suggested_action: `${userName}さんにお祝いメッセージを送りましょう。`,
      suggested_message: proposal.message,
      priority: getMilestonePriority(milestone.type),
      target_user_id: milestone.userId,
      related_entity_type: "visit_milestone",
      trigger_source: "visit_milestone",
      trigger_data: {
        milestone_type: milestone.type,
        visit_count: milestone.visitCount,
      },
      expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3日後
    });
  }

  return proposals;
}

/**
 * ファンレター受信時のCM提案を生成する
 */
export async function generateFanLetterReplyProposal(
  supabase: SupabaseClient,
  shopId: string,
  fanLetterId: string,
  letterContent: string,
  userName: string,
): Promise<CMProposal | null> {
  const { data: shop } = await supabase
    .from("shops")
    .select("name, owner_name")
    .eq("id", shopId)
    .single();

  if (!shop) return null;
  const { owner_name: ownerName } = shop as { owner_name: string };

  // AIで返信メッセージを生成
  try {
    const result = await createChatCompletion({
      messages: [
        {
          role: "system",
          content: `あなたは飲食店「${(shop as { name: string }).name}」の店主${ownerName}の代わりに、
ファンレターへの返信メッセージを提案するアシスタントです。
店主の温かい人柄が伝わる、自然な返信を提案してください。

ルール:
- 80-120文字程度の簡潔なメッセージ
- 店主らしい温かみのある言葉遣い
- ファンレターの内容に具体的に触れる
- 「また来てください」等の来店促進を自然に含める`,
        },
        {
          role: "user",
          content: `以下のファンレターへの返信メッセージを1つ提案してください。メッセージのみを返してください。

ファンレター（${userName}さんより）:
${letterContent}`,
        },
      ],
      purpose: "generation",
      temperature: 0.7,
    });

    // APIコスト記録
    logApiUsage({
      endpoint: "cm-proposals/fan-letter-reply",
      model: result.model,
      promptTokens: result.usage.prompt_tokens,
      completionTokens: result.usage.completion_tokens,
      totalTokens: result.usage.total_tokens,
      shopId,
    });

    return {
      proposal_type: "fan_letter_reply",
      title: `${userName}さんのファンレターに返信しましょう`,
      description: `${userName}さんからファンレターが届きました。温かいメッセージにお返事を送ってみませんか？`,
      suggested_action: "ファンレターページで返信メッセージを確認・編集して送信してください。",
      suggested_message: result.content.trim(),
      priority: "normal",
      target_user_id: undefined, // fan_lettersからuser_idを取得する必要がある場合は別途
      related_entity_type: "fan_letter",
      related_entity_id: fanLetterId,
      trigger_source: "fan_letter_received",
      trigger_data: { letter_preview: letterContent.slice(0, 50) },
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error("Failed to generate fan letter reply proposal:", error);
    return null;
  }
}

/**
 * CM提案をDBに保存する
 */
export async function saveProposals(
  supabase: SupabaseClient,
  shopId: string,
  proposals: CMProposal[],
): Promise<void> {
  if (proposals.length === 0) return;

  const records = proposals.map((p) => ({
    shop_id: shopId,
    proposal_type: p.proposal_type,
    title: p.title,
    description: p.description,
    suggested_action: p.suggested_action,
    suggested_message: p.suggested_message ?? null,
    target_user_id: p.target_user_id ?? null,
    related_entity_type: p.related_entity_type ?? null,
    related_entity_id: p.related_entity_id ?? null,
    status: "pending",
    priority: p.priority,
    trigger_source: p.trigger_source,
    trigger_data: p.trigger_data ?? {},
    expires_at: p.expires_at ?? null,
  }));

  const { error } = await supabase
    .from("ai_cm_proposals")
    .insert(records as never[]);

  if (error) {
    console.error("Failed to save CM proposals:", error);
  }
}

/**
 * マイルストーンに応じたお祝いメッセージを生成
 */
async function generateMilestoneMessage(
  shopName: string,
  ownerName: string,
  userName: string,
  milestone: DetectedMilestone,
  milestoneLabel: string,
): Promise<{ description: string; message: string }> {
  // 軽量なルールベースでメッセージを生成（AIコスト削減）
  switch (milestone.type) {
    case "first_visit":
      return {
        description: `${userName}さんが初めて${shopName}に来店されました。歓迎のメッセージを送りましょう。`,
        message: `${userName}さん、${shopName}へのご来店ありがとうございます！初めてのご来店、とても嬉しいです。${ownerName}より心を込めて。またいつでもお待ちしています。`,
      };

    case "visits_3":
      return {
        description: `${userName}さんが3回目の来店です。リピーターになってくれています！`,
        message: `${userName}さん、いつもありがとうございます！もう3回も来ていただけて、本当に嬉しいです。${userName}さんのお気に入りメニュー、覚えていますよ。`,
      };

    case "visits_5":
      return {
        description: `${userName}さんが5回目の来店！常連さんの仲間入りです。`,
        message: `${userName}さん、5回目のご来店ありがとうございます！もう${shopName}の常連さんですね。いつも本当に嬉しいです。`,
      };

    case "visits_10":
      return {
        description: `${userName}さんが10回目の来店を達成！大切な常連さんです。`,
        message: `${userName}さん、10回目のご来店おめでとうございます！${shopName}をこんなに愛していただけて、料理人冥利に尽きます。これからもよろしくお願いします。`,
      };

    case "visits_20":
    case "visits_50":
      return {
        description: `${userName}さんが${milestoneLabel}を達成！特別な常連さんです。`,
        message: `${userName}さん、${milestoneLabel}おめでとうございます！${shopName}にとって、${userName}さんは本当に特別な存在です。いつも支えていただき、ありがとうございます。`,
      };

    case "monthly_streak_3":
    case "monthly_streak_6":
    case "monthly_streak_12":
      return {
        description: `${userName}さんが${milestoneLabel}を達成！安定したリピーターです。`,
        message: `${userName}さん、${milestoneLabel}おめでとうございます！毎月来ていただけること、本当に心強いです。これからも${shopName}をよろしくお願いします。`,
      };

    case "anniversary_1":
      return {
        description: `${userName}さんの初来店から1周年！記念日です。`,
        message: `${userName}さん、${shopName}に初めて来ていただいてから1年が経ちました！この1年間、本当にありがとうございます。これからもよろしくお願いします。`,
      };

    case "oshi_registration":
      return {
        description: `${userName}さんが${shopName}を「推し」に登録してくれました！`,
        message: `${userName}さん、${shopName}を推しに登録してくれたんですね！とっても嬉しいです。期待に応えられるよう頑張ります！`,
      };

    default:
      return {
        description: `${userName}さんが${milestoneLabel}を達成しました。`,
        message: `${userName}さん、${milestoneLabel}おめでとうございます！いつもありがとうございます。`,
      };
  }
}

/**
 * マイルストーンの優先度を判定
 */
function getMilestonePriority(type: string): "high" | "normal" | "low" {
  switch (type) {
    case "first_visit":
    case "oshi_registration":
      return "high";
    case "visits_10":
    case "visits_20":
    case "visits_50":
    case "anniversary_1":
    case "monthly_streak_12":
      return "high";
    case "visits_3":
    case "visits_5":
    case "monthly_streak_3":
    case "monthly_streak_6":
      return "normal";
    default:
      return "low";
  }
}
