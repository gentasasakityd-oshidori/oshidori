import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/ai/client";
import {
  buildStoryGenerationPrompt,
  buildMenuGenerationPrompt,
  buildPhotoRequestPrompt,
} from "@/lib/prompts";
import type { StoryOutput, MenuOutput, PhotoRequestOutput } from "@/types/ai";

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

    // インタビュー情報を取得
    const { data: interview } = await supabase
      .from("ai_interviews")
      .select("*")
      .eq("id", interview_id)
      .single();

    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    const interviewData = interview as { id: string; shop_id: string };

    // 全メッセージを取得してtranscript作成
    const { data: messages } = await supabase
      .from("interview_messages")
      .select("role, content, phase")
      .eq("interview_id", interview_id)
      .order("created_at", { ascending: true });

    const allMessages = (messages as { role: string; content: string; phase: number | null }[] | null) ?? [];
    const transcript = allMessages
      .map((m) => `${m.role === "user" ? "店主" : "AI"}: ${m.content}`)
      .join("\n\n");

    // 食べてほしい一品パートのメッセージを抽出
    const menuMessages = allMessages
      .filter((m) => m.phase === 4)
      .map((m) => `${m.role === "user" ? "店主" : "AI"}: ${m.content}`)
      .join("\n\n");

    const openai = getOpenAIClient();

    // 並列で3つの生成を実行
    const [storyResult, menuResult, photoResult] = await Promise.all([
      // ストーリー生成
      openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: buildStoryGenerationPrompt(transcript),
          },
        ],
      }),
      // メニュー生成
      openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: buildMenuGenerationPrompt(menuMessages || transcript),
          },
        ],
      }),
      // 撮影リクエスト生成
      openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: buildPhotoRequestPrompt(transcript),
          },
        ],
      }),
    ]);

    // レスポンスをパース
    function parseJsonResponse<T>(content: string): T | null {
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        return JSON.parse(jsonStr.trim()) as T;
      } catch {
        return null;
      }
    }

    const story = parseJsonResponse<StoryOutput>(
      storyResult.choices[0]?.message?.content ?? ""
    );
    const menu = parseJsonResponse<MenuOutput>(
      menuResult.choices[0]?.message?.content ?? ""
    );
    const photoRequest = parseJsonResponse<PhotoRequestOutput>(
      photoResult.choices[0]?.message?.content ?? ""
    );

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
          status: "draft",
        } as never)
        .select()
        .single();
      savedStory = data;
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

    // transcript を保存
    await supabase
      .from("ai_interviews")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        transcript: allMessages,
      } as never)
      .eq("id", interview_id);

    return NextResponse.json({
      story: savedStory,
      menu: savedMenu,
      photoRequest: savedPhotoRequest,
    });
  } catch (error) {
    console.error("Interview complete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
