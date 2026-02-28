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

// 予算帯ラベル（感情ベース）── v2.2追加
export const BUDGET_LABELS = [
  { id: "casual", label: "ふらっと一杯", range: "〜1,000円", min: 0, max: 1000 },
  { id: "everyday", label: "日常のごほうび", range: "1,000〜3,000円", min: 1000, max: 3000 },
  { id: "weekend", label: "週末のちょっと贅沢", range: "3,000〜5,000円", min: 3000, max: 5000 },
  { id: "special", label: "とっておきの夜", range: "5,000〜10,000円", min: 5000, max: 10000 },
  { id: "celebration", label: "記念日・お祝いに", range: "10,000円〜", min: 10000, max: null },
] as const;

// ジャンル（検索フィルター用、CATEGORIESを拡張）── v2.2追加
export const GENRES = [
  "和食", "寿司", "焼鳥", "天ぷら",
  "そば・うどん", "ラーメン",
  "洋食", "イタリアン", "フレンチ", "ビストロ",
  "中華",
  "居酒屋", "バー",
  "カフェ", "パン", "スイーツ",
  "カレー", "エスニック",
  "焼肉・ホルモン",
  "その他",
] as const;

export type Area = (typeof AREAS)[number];
export type Category = (typeof CATEGORIES)[number];
export type Genre = (typeof GENRES)[number];
export type BudgetLabelId = (typeof BUDGET_LABELS)[number]["id"];
export type EmpathyTagId = (typeof EMPATHY_TAGS)[number]["id"];
