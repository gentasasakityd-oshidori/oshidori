// 都道府県一覧
export const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;

// エリア一覧（非推奨: 住所→駅自動マッピングに移行中）
export const AREAS = [
  "蔵前",
  "清澄白河",
  "代々木上原",
  "三軒茶屋",
  "神楽坂",
  "谷根千",
  "下北沢",
  "渋谷",
  "大岡山",
] as const;

/**
 * 路線→駅名マッピング
 * エリア選択をより正確にするため、路線ごとに駅名をソートして提供。
 * 将来的に路線選択→駅名絞り込みUIに使用。
 */
export const STATION_BY_LINE: Record<string, string[]> = {
  "東急目黒線": ["目黒", "不動前", "武蔵小山", "西小山", "洗足", "大岡山", "奥沢", "田園調布", "多摩川", "新丸子", "武蔵小杉", "元住吉", "日吉"],
  "東急大井町線": ["大井町", "下神明", "戸越公園", "中延", "荏原町", "旗の台", "北千束", "大岡山", "緑が丘", "自由が丘", "九品仏", "尾山台", "等々力", "上野毛", "二子玉川", "溝の口"],
  "東急東横線": ["渋谷", "代官山", "中目黒", "祐天寺", "学芸大学", "都立大学", "自由が丘", "田園調布", "多摩川", "新丸子", "武蔵小杉", "元住吉", "日吉", "綱島", "大倉山", "菊名", "妙蓮寺", "白楽", "東白楽", "反町", "横浜"],
  "東急田園都市線": ["渋谷", "池尻大橋", "三軒茶屋", "駒沢大学", "桜新町", "用賀", "二子玉川", "溝の口"],
  "京王井の頭線": ["渋谷", "神泉", "駒場東大前", "池ノ上", "下北沢", "新代田", "東松原", "明大前", "永福町", "西永福", "浜田山", "高井戸", "富士見ヶ丘", "久我山", "三鷹台", "井の頭公園", "吉祥寺"],
  "小田急小田原線": ["新宿", "南新宿", "参宮橋", "代々木八幡", "代々木上原", "東北沢", "下北沢", "世田谷代田", "梅ヶ丘", "豪徳寺", "経堂", "千歳船橋", "祖師ヶ谷大蔵", "成城学園前"],
  "東京メトロ千代田線": ["代々木上原", "代々木公園", "明治神宮前", "表参道", "乃木坂", "赤坂", "国会議事堂前", "霞ケ関", "日比谷", "二重橋前", "大手町", "新御茶ノ水", "湯島", "根津", "千駄木", "西日暮里", "町屋", "北千住", "綾瀬"],
  "都営浅草線": ["西馬込", "馬込", "中延", "戸越", "五反田", "高輪台", "泉岳寺", "三田", "大門", "新橋", "東銀座", "宝町", "日本橋", "人形町", "東日本橋", "浅草橋", "蔵前", "浅草", "押上"],
  "東京メトロ半蔵門線": ["渋谷", "表参道", "青山一丁目", "永田町", "半蔵門", "九段下", "神保町", "大手町", "三越前", "水天宮前", "清澄白河", "住吉", "錦糸町", "押上"],
  "東京メトロ東西線": ["中野", "落合", "高田馬場", "早稲田", "神楽坂", "飯田橋", "九段下", "竹橋", "大手町", "日本橋", "茅場町", "門前仲町", "木場", "東陽町", "南砂町", "西葛西", "葛西", "浦安"],
  "都営大江戸線": ["都庁前", "新宿西口", "東新宿", "若松河田", "牛込柳町", "牛込神楽坂", "飯田橋", "春日", "本郷三丁目", "上野御徒町", "新御徒町", "蔵前", "両国", "森下", "清澄白河", "門前仲町", "月島", "勝どき", "築地市場", "汐留", "大門", "赤羽橋", "麻布十番", "六本木", "青山一丁目", "国立競技場", "代々木", "新宿"],
};

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

// 来店記録ムードタグ（ポジティブ6 + ニュートラル3、ネガティブなし）
export const VISIT_MOOD_TAGS = [
  { id: "heartwarming", label: "ほっこりした", emoji: "😊" },
  { id: "delicious", label: "美味しかった", emoji: "😋" },
  { id: "healing", label: "癒やされた", emoji: "🌿" },
  { id: "exciting", label: "ワクワクした", emoji: "✨" },
  { id: "moved", label: "感動した", emoji: "🥺" },
  { id: "satisfied", label: "大満足", emoji: "👍" },
  { id: "casual", label: "ふらっと寄った", emoji: "🚶" },
  { id: "new_discovery", label: "新発見があった", emoji: "💡" },
  { id: "regular", label: "いつもの安心感", emoji: "🏠" },
] as const;

// ストーリー視点ラベル（段落に自動付与）
export const STORY_PERSPECTIVE_LABELS = [
  {
    id: "origin",
    label: "ルーツ",
    emoji: "📖",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    keywords: ["きっかけ", "始め", "創業", "開業", "オープン", "原点", "出発", "出会", "幼い", "子ども", "学生", "修業", "師匠", "弟子", "故郷", "生まれ", "育ち", "祖父", "祖母", "父", "母", "家族", "実家", "歴史", "ルーツ"],
  },
  {
    id: "food_craft",
    label: "こだわり",
    emoji: "🔥",
    color: "text-red-700 bg-red-50 border-red-200",
    keywords: ["こだわ", "素材", "食材", "産地", "仕入", "手作り", "手打ち", "製法", "技術", "レシピ", "調理", "火加減", "温度", "時間をかけ", "一つひとつ", "丁寧", "厳選", "自家製", "特注", "注文", "出汁", "スープ", "仕込み", "下ごしらえ"],
  },
  {
    id: "hospitality",
    label: "おもてなし",
    emoji: "💝",
    color: "text-pink-700 bg-pink-50 border-pink-200",
    keywords: ["お客", "おもてなし", "接客", "サービス", "笑顔", "喜んで", "楽しんで", "居心地", "くつろ", "温かい", "空間", "雰囲気", "アットホーム", "迎え", "おかえり", "会話", "カウンター"],
  },
  {
    id: "community",
    label: "地域とのつながり",
    emoji: "🤝",
    color: "text-green-700 bg-green-50 border-green-200",
    keywords: ["地域", "地元", "街", "商店街", "近所", "ご近所", "常連", "顔なじみ", "コミュニティ", "繋が", "つなが", "交流", "集まり", "仲間", "マルシェ", "イベント", "町"],
  },
  {
    id: "vision",
    label: "これから",
    emoji: "✨",
    color: "text-blue-700 bg-blue-50 border-blue-200",
    keywords: ["これから", "未来", "夢", "目標", "挑戦", "チャレンジ", "新しい", "次", "展望", "実現", "いつか", "将来", "構想", "広げ", "伝えたい", "届けたい", "続けて"],
  },
] as const;

// ファンクラブ: 推奨プランテンプレート（店舗は1つ選んでカスタマイズ）
export const FAN_CLUB_TEMPLATES = {
  light: {
    name: "ライトプラン",
    price: 300,
    benefits: ["限定メッセージ", "裏メニュー情報"],
    description: "お店の最新情報をいちはやくキャッチ",
  },
  standard: {
    name: "スタンダードプラン",
    price: 980,
    benefits: ["限定メッセージ", "裏メニュー情報", "予約優先権", "限定イベント参加"],
    description: "お店との特別なつながりを楽しむ",
  },
  premium: {
    name: "プレミアムプラン",
    price: 2000,
    benefits: ["限定メッセージ", "裏メニュー情報", "予約優先権", "限定イベント参加", "店主との交流会", "記念日サプライズ", "特別体験への招待"],
    description: "いちばんの応援者として特別な体験を",
  },
} as const;

// ファンクラブ: 選択可能な特典オプション
export const FAN_CLUB_BENEFIT_OPTIONS = [
  "限定メッセージ",
  "裏メニュー情報",
  "予約優先権",
  "限定イベント参加",
  "店主との交流会",
  "記念日サプライズ",
  "特別体験への招待",
  "オリジナルグッズ",
] as const;

export type Area = (typeof AREAS)[number];
export type Prefecture = (typeof PREFECTURES)[number];
export type Category = (typeof CATEGORIES)[number];
export type Genre = (typeof GENRES)[number];
export type BudgetLabelId = (typeof BUDGET_LABELS)[number]["id"];
export type EmpathyTagId = (typeof EMPATHY_TAGS)[number]["id"];
export type VisitMoodTagId = (typeof VISIT_MOOD_TAGS)[number]["id"];
export type StoryPerspectiveId = (typeof STORY_PERSPECTIVE_LABELS)[number]["id"];
export type FanClubTemplateKey = keyof typeof FAN_CLUB_TEMPLATES;

// 気分タグ（探す画面フィルター用） v6.1追加
export const MOOD_TAGS = [
  { value: "relaxed", label: "ゆったりしたい", icon: "🌿" },
  { value: "energetic", label: "元気になりたい", icon: "⚡" },
  { value: "reward", label: "自分へのご褒美", icon: "🎁" },
  { value: "social", label: "誰かと楽しみたい", icon: "🥂" },
  { value: "solo", label: "ひとりで過ごしたい", icon: "☕" },
  { value: "discovery", label: "新しい発見をしたい", icon: "🔍" },
  { value: "comfort", label: "安心する味がほしい", icon: "🏠" },
  { value: "celebration", label: "お祝いしたい", icon: "🎉" },
] as const;

export type MoodTagValue = (typeof MOOD_TAGS)[number]["value"];

// 感情タグ（体験記録時に選択、v6.1追加）
export const EMOTION_TAGS = [
  { id: "happy", label: "幸せな気持ちになった", emoji: "😊" },
  { id: "want_again", label: "また来たい", emoji: "🔄" },
  { id: "tell_someone", label: "誰かに教えたい", emoji: "📣" },
  { id: "talked_owner", label: "店主と話せた", emoji: "💬" },
  { id: "new_discovery", label: "新しい発見があった", emoji: "💡" },
  { id: "treat_myself", label: "自分へのご褒美になった", emoji: "🎁" },
  { id: "quiet_time", label: "静かに過ごせた", emoji: "☕" },
  { id: "usual_taste", label: "いつもの味で安心", emoji: "🏠" },
] as const;

export type EmotionTagId = (typeof EMOTION_TAGS)[number]["id"];
