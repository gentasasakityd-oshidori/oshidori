import type { Story, ShopStructuredTag } from "@/types/database";
import { EMPATHY_TAGS } from "@/lib/constants";

/**
 * 店舗固有の共感カード型
 */
export interface ShopEmpathyCard {
  id: string;
  label: string;
  emoji: string;
  source: "kodawari" | "personality" | "scene" | "emotion" | "fallback";
}

/**
 * ShopStructuredTag[] をカテゴリ別にグルーピングする
 */
function groupStructuredTags(tags?: ShopStructuredTag[]): {
  kodawari: string[];
  personality: string[];
  scene: string[];
} {
  if (!tags || tags.length === 0) return { kodawari: [], personality: [], scene: [] };
  return {
    kodawari: tags.filter((t) => t.tag_category === "kodawari").map((t) => t.tag_value),
    personality: tags.filter((t) => t.tag_category === "personality").map((t) => t.tag_value),
    scene: tags.filter((t) => t.tag_category === "scene").map((t) => t.tag_value),
  };
}

/**
 * 店舗の structured_tags / emotion_tags から店舗固有の共感カードを生成する。
 * structured_tags がない場合は汎用 EMPATHY_TAGS にフォールバック。
 *
 * @param story - 店舗のメインストーリー
 * @param structuredTags - 店舗の構造化タグ（ShopStructuredTag[]）
 * @returns 最大6枚の共感カード配列
 */
export function generateShopEmpathyCards(
  story: Story | null | undefined,
  structuredTags?: ShopStructuredTag[],
): ShopEmpathyCard[] {
  if (!story) return getDefaultCards();

  const grouped = groupStructuredTags(structuredTags);
  const emotionTags = story.emotion_tags as string[] | null;
  const cards: ShopEmpathyCard[] = [];

  // 1. kodawari タグ → "〇〇に共感" カード（最大2枚）
  if (grouped.kodawari.length > 0) {
    for (const k of grouped.kodawari.slice(0, 2)) {
      cards.push({
        id: `kodawari-${sanitizeId(k)}`,
        label: `${k}に共感`,
        emoji: "👏",
        source: "kodawari",
      });
    }
  }

  // 2. personality → "〇〇に惹かれた" カード（最大1枚）
  if (grouped.personality.length > 0) {
    cards.push({
      id: `personality-${sanitizeId(grouped.personality[0])}`,
      label: `${grouped.personality[0]}に惹かれた`,
      emoji: "✨",
      source: "personality",
    });
  }

  // 3. scene → "〇〇が好き" カード（最大1枚）
  if (grouped.scene.length > 0) {
    cards.push({
      id: `scene-${sanitizeId(grouped.scene[0])}`,
      label: `${grouped.scene[0]}が好き`,
      emoji: "🏠",
      source: "scene",
    });
  }

  // 4. emotion_tags → 感情カード（最大2枚）
  if (emotionTags && emotionTags.length > 0) {
    for (const e of emotionTags.slice(0, 2)) {
      cards.push({
        id: `emotion-${sanitizeId(e)}`,
        label: e,
        emoji: "💝",
        source: "emotion",
      });
    }
  }

  // カードが0枚の場合は汎用タグにフォールバック
  if (cards.length === 0) return getDefaultCards();

  // 最大6枚まで（不足分は汎用で補完しない — 固有カードのみ）
  return cards.slice(0, 6);
}

/** 汎用 EMPATHY_TAGS をフォールバック用カードに変換 */
function getDefaultCards(): ShopEmpathyCard[] {
  return EMPATHY_TAGS.map((tag) => ({
    id: tag.id,
    label: tag.label,
    emoji: tag.emoji,
    source: "fallback" as const,
  }));
}

/** IDに使えない文字を除去 */
function sanitizeId(str: string): string {
  return str.replace(/[^a-zA-Z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, "_").slice(0, 30);
}
