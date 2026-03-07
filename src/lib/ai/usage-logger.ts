import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Model pricing (USD per 1M tokens) */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  // Anthropic
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
  "claude-haiku-3-5-20241022": { input: 0.8, output: 4.0 },
};

/**
 * OpenAI APIコールの利用量をDBに記録する
 */
export async function logApiUsage(params: {
  endpoint: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  shopId?: string;
  interviewId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const pricing = MODEL_PRICING[params.model] ?? MODEL_PRICING["gpt-4o"];
    const costUsd =
      (params.promptTokens / 1_000_000) * pricing.input +
      (params.completionTokens / 1_000_000) * pricing.output;

    const supabase = await createServerSupabaseClient();
    await supabase.from("api_usage_logs").insert({
      endpoint: params.endpoint,
      model: params.model,
      prompt_tokens: params.promptTokens,
      completion_tokens: params.completionTokens,
      total_tokens: params.totalTokens,
      estimated_cost_usd: costUsd,
      shop_id: params.shopId ?? null,
      interview_id: params.interviewId ?? null,
      metadata: params.metadata ?? null,
    } as never);
  } catch (error) {
    // コスト記録の失敗はメイン処理に影響させない
    console.error("Failed to log API usage:", error);
  }
}

/**
 * OpenAI completion のusageからログパラメータを抽出する
 */
export function extractUsage(completion: {
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
}): {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  return {
    model: completion.model ?? "gpt-4o",
    promptTokens: completion.usage?.prompt_tokens ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
    totalTokens: completion.usage?.total_tokens ?? 0,
  };
}
