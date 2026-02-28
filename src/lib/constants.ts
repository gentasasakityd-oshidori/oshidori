// エリア一覧（Phase 1 ターゲットエリア）
export const AREAS = [
  "蔵前",
  "清澄白河",
  "代々木上原",
  "三軒茶屋",
  "神楽坂",
  "谷根千",
  "下北沢",
  "渋谷",
] as const;

// カテゴリ一覧
export const CATEGORIES = [
  "和食",
  "洋食",
  "中華",
  "イタリアン",
  "フレンチ",
  "居酒屋",
  "焼鳥",
  "そば・うどん",
  "ラーメン",
  "カフェ",
  "パン",
  "スイーツ",
  "その他",
] as const;

// 感情タグ
export const EMPATHY_TAGS = [
  { id: "craftsman", label: "職人魂に惚れた", emoji: "🔥" },
  { id: "ingredient", label: "食材愛がすごい", emoji: "🌿" },
  { id: "hospitality", label: "おもてなしの心", emoji: "💝" },
  { id: "passion", label: "情熱を感じた", emoji: "✨" },
  { id: "kodawari", label: "こだわりに共感", emoji: "👏" },
  { id: "story", label: "物語に感動した", emoji: "📖" },
] as const;

export type Area = (typeof AREAS)[number];
export type Category = (typeof CATEGORIES)[number];
export type EmpathyTagId = (typeof EMPATHY_TAGS)[number]["id"];
