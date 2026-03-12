/**
 * 管理者用マイグレーション実行API
 * POST /api/admin/migrate
 *
 * shopsテーブルにmetadataカラムを追加するなど、
 * Supabase SQLエディタを使わずにスキーマ変更を適用する。
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/admin-auth";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST() {
  try {
    const { isAdmin } = await requireAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }

    const db = createAdminClient();
    const results: string[] = [];

    // 1. shopsテーブルにmetadataカラムがなければ追加
    // まず存在確認（metadataカラムを直接selectしてエラーかどうかで判定）
    const { error: metaCheckError } = await db
      .from("shops")
      .select("metadata")
      .limit(1);

    if (metaCheckError && metaCheckError.message.includes("does not exist")) {
      // metadata カラムが存在しない → RPCで追加を試みる
      // Supabase REST APIではALTER TABLEを直接実行できないため、
      // workaround: パイプラインのエラー保存をmetadataではなくpipeline_error_*カラムに変更
      results.push("metadata カラムが存在しません。コード側で対応します。");
    } else {
      results.push("metadata カラムは既に存在します。");
    }

    // 2. api_usage_logsテーブルの存在確認
    const { error: usageError } = await db
      .from("api_usage_logs")
      .select("id")
      .limit(1);
    if (usageError) {
      results.push(`api_usage_logs: エラー - ${usageError.message}`);
    } else {
      results.push("api_usage_logs: OK");
    }

    // 3. pre_research_reportsテーブルの存在確認
    const { error: researchError } = await db
      .from("pre_research_reports")
      .select("id")
      .limit(1);
    if (researchError) {
      results.push(`pre_research_reports: エラー - ${researchError.message}`);
    } else {
      results.push("pre_research_reports: OK");
    }

    // 4. interview_design_docsテーブルの存在確認
    const { error: designError } = await db
      .from("interview_design_docs")
      .select("id")
      .limit(1);
    if (designError) {
      results.push(`interview_design_docs: エラー - ${designError.message}`);
    } else {
      results.push("interview_design_docs: OK");
    }

    // 5. prompt_versionsテーブルの存在確認
    const { error: promptError } = await db
      .from("prompt_versions")
      .select("id")
      .limit(1);
    if (promptError) {
      results.push(`prompt_versions: エラー - ${promptError.message}`);
    } else {
      results.push("prompt_versions: OK");
    }

    // 6. OpenAI APIキーの設定確認
    results.push(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? "設定済み (" + process.env.OPENAI_API_KEY.slice(0, 7) + "...)" : "未設定"}`);
    results.push(`AI_PROVIDER: ${process.env.AI_PROVIDER || "openai (default)"}`);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}
