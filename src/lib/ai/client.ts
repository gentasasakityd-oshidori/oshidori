import OpenAI from "openai";

// ─── Types ───

export type AIProvider = "openai" | "anthropic";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

/** モデル用途別の選択 */
export type ModelPurpose = "dialogue" | "generation";

// ─── OpenAI Client (backward compatible) ───

let _openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    _openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 120_000, // 120秒タイムアウト
      maxRetries: 2,    // 最大2回リトライ
    });
  }
  return _openaiClient;
}

// ─── Provider Configuration ───

/** 現在のAIプロバイダーを取得 */
export function getAIProvider(): AIProvider {
  return (process.env.AI_PROVIDER as AIProvider) ?? "openai";
}

/** 用途に応じた推奨モデル名を取得 */
export function getModelForPurpose(purpose: ModelPurpose, provider?: AIProvider): string {
  const p = provider ?? getAIProvider();

  if (p === "anthropic") {
    switch (purpose) {
      case "dialogue":
        return "claude-sonnet-4-20250514";
      case "generation":
        return "claude-haiku-3-5-20241022";
    }
  }

  // OpenAI (default)
  switch (purpose) {
    case "dialogue":
      return "gpt-4o";
    case "generation":
      return "gpt-4o-mini";
  }
}

// ─── Unified Chat Completion ───

/**
 * プロバイダーを抽象化したチャット補完 API
 *
 * - provider 未指定時は環境変数 AI_PROVIDER を参照（デフォルト: openai）
 * - model 未指定時は purpose に応じて自動選択
 */
export async function createChatCompletion(params: {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: AIProvider;
  purpose?: ModelPurpose;
}): Promise<ChatCompletionResult> {
  const provider = params.provider ?? getAIProvider();
  const model = params.model ?? getModelForPurpose(params.purpose ?? "dialogue", provider);
  const temperature = params.temperature ?? 0.8;
  const maxTokens = params.maxTokens ?? 4096;

  if (provider === "anthropic") {
    return createAnthropicCompletion(params.messages, model, temperature, maxTokens);
  }

  return createOpenAICompletion(params.messages, model, temperature);
}

// ─── OpenAI Implementation ───

async function createOpenAICompletion(
  messages: ChatMessage[],
  model: string,
  temperature: number,
): Promise<ChatCompletionResult> {
  const openai = getOpenAIClient();

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY が設定されていません。Vercelの環境変数を確認してください。");
  }

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model,
      temperature,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AI] OpenAI API error (model=${model}):`, msg);
    throw new Error(`OpenAI API呼び出し失敗 (${model}): ${msg}`);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    console.warn(`[AI] OpenAI returned empty content (model=${model})`);
  }

  return {
    content: content ?? "",
    usage: {
      prompt_tokens: completion.usage?.prompt_tokens ?? 0,
      completion_tokens: completion.usage?.completion_tokens ?? 0,
      total_tokens: completion.usage?.total_tokens ?? 0,
    },
    model: completion.model ?? model,
  };
}

// ─── Anthropic Implementation ───

async function createAnthropicCompletion(
  messages: ChatMessage[],
  model: string,
  temperature: number,
  maxTokens: number,
): Promise<ChatCompletionResult> {
  // Dynamic import to avoid requiring the package when using OpenAI
  const { default: Anthropic } = await import("@anthropic-ai/sdk");

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Anthropic API ではシステムメッセージを別パラメータで渡す
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY が設定されていません。Vercelの環境変数を確認してください。");
  }

  let response;
  try {
    response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage?.content ?? undefined,
      messages: conversationMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AI] Anthropic API error (model=${model}):`, msg);
    throw new Error(`Anthropic API呼び出し失敗 (${model}): ${msg}`);
  }

  const textBlock = response.content.find(
    (block) => block.type === "text",
  );

  return {
    content: textBlock && "text" in textBlock ? textBlock.text : "",
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
    model: response.model,
  };
}
