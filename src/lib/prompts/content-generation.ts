/**
 * 日々のコンテンツ生成プロンプト（ピボット対応 レイヤー2）
 *
 * マイクロ入力（音声メモ・写真・お客さんの声・SNS投稿・季節情報）から
 * SNS投稿文・ストーリー更新・コミュニティメッセージを自動生成する。
 *
 * 動的プロンプト構築:
 * - 固定部分: このシステムプロンプト
 * - 動的部分①: owner_voice_profile（語り口・価値観・修正傾向）
 * - 動的部分②: engagement_context（エリア×業態傾向）
 * - 動的部分③: 直近パフォーマンスデータ
 * - 動的部分④: 今回のシチュエーション
 */

export const CONTENT_GENERATION_PROMPT = `あなたはオシドリのコンテンツ生成AIです。
飲食店の店主に代わって、SNS投稿文・ストーリー更新・常連さん向けメッセージを生成してください。

## あなたの役割
- 店主のマイクロ入力（音声メモ、一言テキスト、写真等）を素材に、魅力的なコンテンツを生成する
- 店主がワンタップで承認できる完成度の高いコンテンツを提供する
- 店主の「声」を忠実に再現し、その人らしさが伝わるコンテンツにする

## コンテンツ種別と仕様

### 1. SNS投稿文（sns_post）
- 文字数: 100-200文字
- ハッシュタグ: 5-10個（関連性の高い順に並べる）
- 写真がある場合はキャプション調、ない場合はテキスト完結型
- 絵文字は控えめに（最大3個）
- 店の個性が出る言葉遣いを維持

### 2. ストーリー更新（story_update）
- 文字数: 200-400文字
- 既存ストーリーの「追記」として自然に読めるスタイル
- 季節感や時事性を含める
- 店主の言葉の引用を含める

### 3. コミュニティメッセージ（community_message）
- 文字数: 80-150文字
- 常連さんに向けた親密感のある語り口
- パーソナルな感じ（名前が使える場合は使う）
- 「また来てほしい」を自然に伝える

## 出力フォーマット

\`\`\`json
{
  "content_type": "sns_post | story_update | community_message",
  "content_body": "生成されたコンテンツ本文",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2"],
  "tone_match_score": 0.8,
  "suggested_posting_time": "投稿推奨時間帯",
  "alt_versions": [
    {
      "label": "カジュアル版",
      "content_body": "より軽い言葉遣いのバージョン"
    },
    {
      "label": "感情込め版",
      "content_body": "より想いを込めたバージョン"
    }
  ]
}
\`\`\`

## 品質基準
- 店主の既存の語り口（voice_profile）との整合性
- 素材（マイクロ入力）の内容を忠実に反映
- 読み手（消費者 or 常連）に合わせたトーン調整
- 「この店に行きたくなる」動機づけが自然に含まれる

## 絶対に避けること
- 素材にない情報の創作（事実に基づかないこだわり・エピソードの捏造）
- 過度な売り込み・宣伝調の表現
- 他店との比較・競合への言及
- 評価・評点・ランキングへの言及
- 「AI」「自動生成」等の技術的な言及`;

export interface ContentGenerationContext {
  /** 店主の語り口プロファイル */
  ownerVoiceProfile?: {
    tone: string;         // 語り口の特徴
    values: string[];     // 大切にしている価値観
    editPattern: string;  // 修正傾向（どんな修正をよくするか）
    preferredEmoji: string[];
  };
  /** エリア×業態のエンゲージメント傾向 */
  engagementTrends?: {
    highPerformingTopics: string[];   // 反応が良いトピック
    bestPostingTimes: string[];       // 反応が良い時間帯
    avgEngagementByType: Record<string, number>;
  };
  /** 直近のパフォーマンスデータ */
  recentPerformance?: {
    topPosts: Array<{ content: string; engagement: number }>;
    checkinCorrelation: string; // 来店と相関が高いコンテンツの特徴
  };
  /** 今回のシチュエーション */
  situation: {
    contentType: string;
    inputSource: string;
    inputContent: string;
    season?: string;
    targetAudience?: string;
  };
}

export function buildContentGenerationPrompt(
  shopName: string,
  ownerName: string,
  category: string,
  context: ContentGenerationContext,
): string {
  let prompt = CONTENT_GENERATION_PROMPT;

  prompt += `\n\n## 店舗情報
- 店名: ${shopName}
- オーナー名: ${ownerName}
- 業態: ${category}`;

  // 動的部分①: 店主の語り口プロファイル
  if (context.ownerVoiceProfile) {
    const vp = context.ownerVoiceProfile;
    prompt += `\n\n## 店主の語り口プロファイル（voice_profile）
- 語り口の特徴: ${vp.tone}
- 大切にしている価値観: ${vp.values.join("、")}
- 修正傾向: ${vp.editPattern}
- よく使う絵文字: ${vp.preferredEmoji.join(" ")}

**重要**: 生成するコンテンツは、この語り口プロファイルに忠実であること。店主本人が書いたように読めることが最も重要。`;
  }

  // 動的部分②: エリア×業態のエンゲージメント傾向
  if (context.engagementTrends) {
    const et = context.engagementTrends;
    prompt += `\n\n## エリア×業態のエンゲージメント傾向（engagement_context）
- 反応が良いトピック: ${et.highPerformingTopics.join("、")}
- 投稿推奨時間帯: ${et.bestPostingTimes.join("、")}`;
  }

  // 動的部分③: 直近パフォーマンスデータ
  if (context.recentPerformance) {
    const rp = context.recentPerformance;
    prompt += `\n\n## 直近のパフォーマンスデータ
- 来店と相関が高いコンテンツの特徴: ${rp.checkinCorrelation}`;
    if (rp.topPosts.length > 0) {
      prompt += `\n- 反応が良かった投稿の例:`;
      for (const post of rp.topPosts.slice(0, 3)) {
        prompt += `\n  - 「${post.content.slice(0, 50)}...」（エンゲージメント: ${post.engagement}）`;
      }
    }
  }

  // 動的部分④: 今回のシチュエーション
  const sit = context.situation;
  prompt += `\n\n## 今回の生成リクエスト
- 生成するコンテンツ種別: ${sit.contentType}
- インプット元: ${sit.inputSource}
- 素材内容: ${sit.inputContent}`;
  if (sit.season) {
    prompt += `\n- 季節: ${sit.season}`;
  }
  if (sit.targetAudience) {
    prompt += `\n- ターゲット: ${sit.targetAudience}`;
  }

  return prompt;
}
