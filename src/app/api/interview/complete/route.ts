import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createChatCompletion } from "@/lib/ai/client";
import {
  buildStoryGenerationPrompt,
  buildMenuGenerationPrompt,
  buildPhotoRequestPrompt,
  buildInterviewSummaryPrompt,
  getCatchcopyPrompt,
  getHighlightPrompt,
  buildMenuStoryGenerationPrompt,
} from "@/lib/prompts";
import type { StoryOutput, MenuOutput, PhotoRequestOutput, MenuStoryOutput } from "@/types/ai";
import { saveStructuredTags } from "@/lib/queries/tags";
import { generateDisplayTags } from "@/lib/display-tags";
import { logApiUsage } from "@/lib/ai/usage-logger";
import {
  generateInterviewCompletionProposals,
  saveProposals,
} from "@/lib/ai/cm-proposals";
import { triggerPostInterviewPipeline, markStoryGenerated } from "@/lib/onboarding-pipeline";
import {
  analyzeInterviewQuality,
  analyzeInterviewQualityWithAI,
} from "@/lib/ai/interview-learning";

export async function POST(request: Request) {
  try {
    const { interview_id } = await request.json();
    if (!interview_id) {
      return NextResponse.json(
        { error: "interview_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // インタビュー情報を取得
    const { data: interview } = await supabase
      .from("ai_interviews")
      .select("*")
      .eq("id", interview_id)
      .single();

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const interviewData = interview as {
      id: string;
      shop_id: string;
      status?: string;
      interview_type?: string;
    };

    // 重複完了防止
    if (interviewData.status === "completed") {
      return NextResponse.json({ error: "Interview already completed" }, { status: 400 });
    }

    // 全メッセージを取得してtranscript作成
    const { data: messages } = await supabase
      .from("interview_messages")
      .select("role, content, phase, metadata")
      .eq("interview_id", interview_id)
      .order("created_at", { ascending: true });

    const allMessages = (messages as { role: string; content: string; phase: number | null; metadata?: Record<string, unknown> }[] | null) ?? [];
    const transcript = allMessages
      .map((m) => `${m.role === "user" ? "店主" : "AI"}: ${m.content}`)
      .join("\n\n");

    // interview_type に応じた分岐
    const interviewType = interviewData.interview_type ?? "initial_interview";

    if (interviewType === "menu_addition" || interviewType === "seasonal_menu") {
      // ─── メニュー追加 / 季節限定メニュー用の完了処理 ───
      return await completeMenuInterview(supabase, interviewData, allMessages, transcript, interview_id);
    }

    // ─── 初回インタビュー / 月次アップデート用の完了処理（既存ロジック） ───
    return await completeFullInterview(supabase, interviewData, allMessages, transcript, interview_id);
  } catch (error) {
    console.error("Interview complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── メニュー追加用完了処理 ───
async function completeMenuInterview(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  interviewData: { id: string; shop_id: string },
  allMessages: { role: string; content: string; phase: number | null; metadata?: Record<string, unknown> }[],
  transcript: string,
  interview_id: string,
) {
  // メニューストーリー生成（軽量モデルを使用）
  const menuStoryResult = await createChatCompletion({
    messages: [
      {
        role: "user",
        content: buildMenuStoryGenerationPrompt(transcript),
      },
    ],
    purpose: "generation",
    temperature: 0.7,
  });

  // APIコスト記録
  logApiUsage({
    endpoint: "interview/complete/menu_story",
    model: menuStoryResult.model,
    promptTokens: menuStoryResult.usage.prompt_tokens,
    completionTokens: menuStoryResult.usage.completion_tokens,
    totalTokens: menuStoryResult.usage.total_tokens,
    shopId: interviewData.shop_id,
    interviewId: interview_id,
  });

  // レスポンスをパース
  const menuStory = parseJsonResponse<MenuStoryOutput>(menuStoryResult.content);

  // メッセージのメタデータからメニュー名・価格を補完
  const lastMetadata = getLatestMenuMetadata(allMessages);

  const finalMenuName = menuStory?.menu_name ?? lastMetadata.menu_name ?? "未設定";
  const finalPrice = menuStory?.price ?? lastMetadata.price ?? null;

  // menus テーブルに保存
  let savedMenu = null;
  if (menuStory) {
    const { data } = await supabase
      .from("menus")
      .insert({
        shop_id: interviewData.shop_id,
        name: finalMenuName,
        description: menuStory.story_text,
        owner_message: menuStory.owner_message,
        kodawari_text: menuStory.kodawari_text,
        eating_tip: menuStory.eating_tip,
        kodawari_tags: menuStory.kodawari_tags,
        is_ai_generated: true,
        menu_story: menuStory.story_text,
        interview_id,
        price: finalPrice,
        key_ingredients: menuStory.key_ingredients,
      } as never)
      .select()
      .single();
    savedMenu = data;
  }

  // transcript を保存してインタビュー完了
  await supabase
    .from("ai_interviews")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      transcript: allMessages,
    } as never)
    .eq("id", interview_id);

  // AI CM提案生成（非同期・エラーは握りつぶす）
  try {
    const interviewType = (interviewData as { interview_type?: string }).interview_type ?? "menu_addition";
    const proposals = await generateInterviewCompletionProposals(
      supabase,
      interviewData.shop_id,
      interview_id,
      interviewType,
    );
    await saveProposals(supabase, interviewData.shop_id, proposals);
  } catch (cmError) {
    console.error("Failed to generate CM proposals:", cmError);
  }

  // v7.0: インタビュー品質分析（ナオの学習ループ、非同期）
  analyzeInterviewQuality(supabase, interview_id, interviewData.shop_id).catch((err) => {
    console.error("[学習ループ] インタビュー品質分析エラー:", err);
  });

  return NextResponse.json({
    menu: savedMenu,
    menuStory: menuStory ?? null,
    story: null,
    photoRequest: null,
    structuredTags: null,
    interviewSummary: null,
    storyThemes: null,
  });
}

// ─── 初回インタビュー / 月次アップデート用完了処理 ───
async function completeFullInterview(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  interviewData: { id: string; shop_id: string },
  allMessages: { role: string; content: string; phase: number | null; metadata?: Record<string, unknown> }[],
  transcript: string,
  interview_id: string,
) {
  // オンボーディングフェーズ: ストーリー生成中に更新
  triggerPostInterviewPipeline(supabase, interviewData.shop_id).catch((err) => {
    console.error("[Pipeline] Post-interview phase update error:", err);
  });

  // 食べてほしい一品パートのメッセージを抽出
  const menuMessages = allMessages
    .filter((m) => m.phase === 4)
    .map((m) => `${m.role === "user" ? "店主" : "AI"}: ${m.content}`)
    .join("\n\n");

  // 並列で4つの生成を実行（生成タスクは軽量モデルを使用）
  const [storyResult, menuResult, photoResult, summaryResult] = await Promise.all([
    createChatCompletion({
      messages: [{ role: "user", content: buildStoryGenerationPrompt(transcript) }],
      purpose: "generation",
      temperature: 0.7,
    }),
    createChatCompletion({
      messages: [{ role: "user", content: buildMenuGenerationPrompt(menuMessages || transcript) }],
      purpose: "generation",
      temperature: 0.7,
    }),
    createChatCompletion({
      messages: [{ role: "user", content: buildPhotoRequestPrompt(transcript) }],
      purpose: "generation",
      temperature: 0.7,
    }),
    createChatCompletion({
      messages: [{ role: "user", content: buildInterviewSummaryPrompt(transcript) }],
      purpose: "generation",
      temperature: 0.7,
    }),
  ]);

  // APIコスト記録
  const logEntries = [
    { result: storyResult, endpoint: "interview/complete/story" },
    { result: menuResult, endpoint: "interview/complete/menu" },
    { result: photoResult, endpoint: "interview/complete/photo" },
    { result: summaryResult, endpoint: "interview/complete/summary" },
  ];
  for (const entry of logEntries) {
    logApiUsage({
      endpoint: entry.endpoint,
      model: entry.result.model,
      promptTokens: entry.result.usage.prompt_tokens,
      completionTokens: entry.result.usage.completion_tokens,
      totalTokens: entry.result.usage.total_tokens,
      shopId: interviewData.shop_id,
      interviewId: interview_id,
    });
  }

  const story = parseJsonResponse<StoryOutput>(storyResult.content);
  const menu = parseJsonResponse<MenuOutput>(menuResult.content);
  const photoRequest = parseJsonResponse<PhotoRequestOutput>(photoResult.content);
  const interviewSummary = parseJsonResponse<{
    summary: string;
    strengths: string[];
    unique_value: string;
  }>(summaryResult.content);

  // stories テーブルに保存
  let savedStory = null;
  if (story) {
    const { data } = await supabase
      .from("stories")
      .insert({
        shop_id: interviewData.shop_id,
        title: story.title,
        body: story.body,
        summary: story.summary,
        key_quotes: story.key_quotes,
        emotion_tags: story.emotion_tags,
        story_themes: story.story_themes,
        interview_summary: interviewSummary?.summary ?? null,
        status: "draft",
      } as never)
      .select()
      .single();
    savedStory = data;

    // story_themes を別テーブルにも保存
    if (story.story_themes && data) {
      const storyId = (data as { id: string }).id;
      try {
        await (supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<unknown> } }).from("story_themes").insert({
          story_id: storyId,
          origin_score: story.story_themes.origin ?? 0,
          food_craft_score: story.story_themes.food_craft ?? 0,
          hospitality_score: story.story_themes.hospitality ?? 0,
          community_score: story.story_themes.community ?? 0,
          personality_score: story.story_themes.personality ?? 0,
          local_connection_score: story.story_themes.local_connection ?? 0,
          vision_score: story.story_themes.vision ?? 0,
        });
      } catch (themeError) {
        console.error("Failed to save story themes:", themeError);
      }
    }

    // structured_tags をストーリー単位でも保存
    if (story.structured_tags && data) {
      const storyId = (data as { id: string }).id;
      const db = supabase as unknown as { from: (t: string) => { insert: (r: unknown[]) => Promise<unknown> } };
      const tagRows = [
        ...(story.structured_tags.kodawari ?? []).map((v: string) => ({
          shop_id: interviewData.shop_id,
          story_id: storyId,
          tag_type: "kodawari",
          tag_value: v,
          source: "ai_generated",
        })),
        ...(story.structured_tags.personality ?? []).map((v: string) => ({
          shop_id: interviewData.shop_id,
          story_id: storyId,
          tag_type: "personality",
          tag_value: v,
          source: "ai_generated",
        })),
        ...(story.structured_tags.scene ?? []).map((v: string) => ({
          shop_id: interviewData.shop_id,
          story_id: storyId,
          tag_type: "scene",
          tag_value: v,
          source: "ai_generated",
        })),
        ...(story.structured_tags.atmosphere ?? []).map((v: string) => ({
          shop_id: interviewData.shop_id,
          story_id: storyId,
          tag_type: "atmosphere",
          tag_value: v,
          source: "ai_generated",
        })),
      ];
      if (tagRows.length > 0) {
        try {
          await db.from("structured_tags").insert(tagRows);
        } catch (tagError) {
          console.error("Failed to save structured tags to new table:", tagError);
        }
      }
    }
  }

  // L1キャッチコピー + L2ハイライト生成
  if (story && savedStory) {
    const storyId = (savedStory as { id: string }).id;
    const keyQuotesStr = Array.isArray(story.key_quotes) ? story.key_quotes.join("\n") : "";
    const themes = (story.story_themes ?? {}) as Record<string, number>;

    try {
      const [catchcopyResult, highlightResult] = await Promise.all([
        createChatCompletion({
          messages: [{ role: "user", content: getCatchcopyPrompt(story.body, keyQuotesStr, themes) }],
          purpose: "generation",
          temperature: 0.7,
        }),
        createChatCompletion({
          messages: [{ role: "user", content: getHighlightPrompt(story.body, themes, story.title) }],
          purpose: "generation",
          temperature: 0.7,
        }),
      ]);

      // APIコスト記録
      for (const entry of [
        { result: catchcopyResult, endpoint: "interview/complete/catchcopy" },
        { result: highlightResult, endpoint: "interview/complete/highlight" },
      ]) {
        logApiUsage({
          endpoint: entry.endpoint,
          model: entry.result.model,
          promptTokens: entry.result.usage.prompt_tokens,
          completionTokens: entry.result.usage.completion_tokens,
          totalTokens: entry.result.usage.total_tokens,
          shopId: interviewData.shop_id,
          interviewId: interview_id,
        });
      }

      const catchcopyData = parseJsonResponse<{
        primary: string;
        alt_1: string;
        alt_2: string;
      }>(catchcopyResult.content);

      const highlightData = parseJsonResponse<{
        highlight: string;
        hook_sentence: string;
      }>(highlightResult.content);

      if (catchcopyData || highlightData) {
        await supabase
          .from("stories")
          .update({
            ...(catchcopyData ? {
              catchcopy_primary: catchcopyData.primary,
              catchcopy_alt_1: catchcopyData.alt_1,
              catchcopy_alt_2: catchcopyData.alt_2,
            } : {}),
            ...(highlightData ? {
              highlight: highlightData.highlight,
              hook_sentence: highlightData.hook_sentence,
            } : {}),
          } as never)
          .eq("id", storyId);
      }
    } catch (l1l2Error) {
      console.error("Failed to generate L1/L2:", l1l2Error);
    }
  }

  // display_tags 自動生成
  if (story?.structured_tags && story?.story_themes) {
    try {
      const themes = (story.story_themes ?? {}) as Record<string, number>;
      const allTagEntries: Array<{ id: string; tag_type: string; tag_value: string }> = [];
      for (const [tagType, values] of Object.entries(story.structured_tags)) {
        if (Array.isArray(values)) {
          for (const val of values) {
            allTagEntries.push({ id: `${tagType}-${val}`, tag_type: tagType, tag_value: val as string });
          }
        }
      }

      const displayTags = generateDisplayTags(allTagEntries, themes);
      if (displayTags.length > 0) {
        const db = supabase as unknown as { from: (t: string) => { insert: (r: unknown[]) => Promise<unknown> } };
        const tagRows = displayTags.map((dt) => ({
          shop_id: interviewData.shop_id,
          icon: dt.icon,
          label: dt.label,
          priority: dt.priority,
        }));
        await db.from("display_tags").insert(tagRows);
      }
    } catch (displayTagError) {
      console.error("Failed to generate display tags:", displayTagError);
    }
  }

  // menus テーブルに保存
  let savedMenu = null;
  if (menu) {
    const { data } = await supabase
      .from("menus")
      .insert({
        shop_id: interviewData.shop_id,
        name: menu.name,
        description: menu.description,
        owner_message: menu.owner_message,
        kodawari_text: menu.kodawari_text,
        eating_tip: menu.eating_tip,
        kodawari_tags: menu.kodawari_tags,
        is_ai_generated: true,
      } as never)
      .select()
      .single();
    savedMenu = data;
  }

  // photo_requests テーブルに保存
  let savedPhotoRequest = null;
  if (photoRequest) {
    const { data } = await supabase
      .from("photo_requests")
      .insert({
        shop_id: interviewData.shop_id,
        interview_id,
        shots: photoRequest.shots,
        status: "pending",
      } as never)
      .select()
      .single();
    savedPhotoRequest = data;
  }

  // 構造化タグをDB保存
  if (story?.structured_tags) {
    try {
      await saveStructuredTags(
        interviewData.shop_id,
        {
          kodawari: story.structured_tags.kodawari ?? [],
          personality: story.structured_tags.personality ?? [],
          scene: story.structured_tags.scene ?? [],
          atmosphere: story.structured_tags.atmosphere ?? [],
        },
        "ai_interview"
      );
    } catch (tagError) {
      console.error("Failed to save structured tags:", tagError);
    }
  }

  // transcript を保存してインタビュー完了
  await supabase
    .from("ai_interviews")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      transcript: allMessages,
    } as never)
    .eq("id", interview_id);

  // AI CM提案生成（非同期・エラーは握りつぶす）
  try {
    const interviewType = (interviewData as { interview_type?: string }).interview_type ?? "initial_interview";
    const proposals = await generateInterviewCompletionProposals(
      supabase,
      interviewData.shop_id,
      interview_id,
      interviewType,
    );
    await saveProposals(supabase, interviewData.shop_id, proposals);
  } catch (cmError) {
    console.error("Failed to generate CM proposals:", cmError);
  }

  // オンボーディングフェーズ: ストーリー生成完了 → レビュー待ちへ
  if (savedStory) {
    markStoryGenerated(supabase, interviewData.shop_id).catch((err) => {
      console.error("[Pipeline] Story generated phase update error:", err);
    });
  }

  // v7.0: インタビュー品質分析（ナオの学習ループ）
  // ルールベース分析 + AI深層分析を非同期で実行
  Promise.all([
    analyzeInterviewQuality(supabase, interview_id, interviewData.shop_id),
    analyzeInterviewQualityWithAI(supabase, interview_id, interviewData.shop_id, transcript),
  ]).catch((err) => {
    console.error("[学習ループ] インタビュー品質分析エラー:", err);
  });

  return NextResponse.json({
    story: savedStory,
    menu: savedMenu,
    photoRequest: savedPhotoRequest,
    structuredTags: story?.structured_tags ?? null,
    interviewSummary: interviewSummary ?? null,
    storyThemes: story?.story_themes ?? null,
  });
}

// ─── ユーティリティ ───

function parseJsonResponse<T>(content: string): T | null {
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonStr.trim()) as T;
  } catch {
    return null;
  }
}

/** メッセージのメタデータからメニュー名・価格を取得 */
function getLatestMenuMetadata(
  messages: { metadata?: Record<string, unknown> }[]
): { menu_name?: string; price?: number } {
  let menuName: string | undefined;
  let price: number | undefined;

  for (const msg of messages) {
    if (msg.metadata) {
      if (msg.metadata.menu_name && typeof msg.metadata.menu_name === "string") {
        menuName = msg.metadata.menu_name;
      }
      if (msg.metadata.price && typeof msg.metadata.price === "number") {
        price = msg.metadata.price;
      }
    }
  }

  return { menu_name: menuName, price };
}
