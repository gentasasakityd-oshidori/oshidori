export const DISPLAY_TAG_MAP: Record<string, Record<string, { icon: string; label: string }>> = {
  kodawari: {
    '産地直送': { icon: '🌿', label: '食材愛' },
    '手打ち・手仕込み': { icon: '🔥', label: '職人魂' },
    '無添加・自然派': { icon: '🍃', label: '自然派' },
    '修行先の伝統': { icon: '🏯', label: '伝統の技' },
    '自家製': { icon: '🔥', label: '職人魂' },
    '旬の食材': { icon: '🌿', label: '食材愛' },
    '特注の器': { icon: '✨', label: 'こだわり' },
  },
  personality: {
    '寡黙な職人タイプ': { icon: '🔪', label: '無言の情熱' },
    '話好きな大将': { icon: '😊', label: '人柄最高' },
    '夫婦でやってる温かい店': { icon: '🤝', label: '夫婦の温もり' },
    '若手オーナー': { icon: '🌟', label: '新世代' },
  },
  scene: {
    '接待向き': { icon: '🎩', label: '特別な夜に' },
    '1人飲みに最高': { icon: '🍶', label: 'ひとり時間' },
    'デートに最適': { icon: '💫', label: '特別なひとときに' },
    '仲間とわいわい': { icon: '🎉', label: 'みんなで楽しく' },
  },
  atmosphere: {
    '隠れ家': { icon: '🚪', label: '秘密の一軒' },
    'カウンター主体': { icon: '🪑', label: '臨場感' },
    '落ち着いた空間': { icon: '🕯️', label: '静かな時間' },
  },
};

export const THEME_TO_DISPLAY_TAG: Record<string, { icon: string; label: string }> = {
  origin: { icon: '📖', label: '物語の始まり' },
  food_craft: { icon: '🔥', label: '職人魂' },
  hospitality: { icon: '😊', label: 'おもてなし' },
  community: { icon: '🤝', label: 'コミュニティ' },
  personality: { icon: '💫', label: '人柄' },
  local_connection: { icon: '📍', label: '街とのつながり' },
  vision: { icon: '🌟', label: '未来への想い' },
};

export interface DisplayTag {
  icon: string;
  label: string;
  sourceTagId?: string;
  priority: number;
}

export interface StructuredTag {
  id: string;
  tag_type: string;
  tag_value: string;
}

export function generateDisplayTags(
  structuredTags: StructuredTag[],
  storyThemes: Record<string, number>
): DisplayTag[] {
  const MAX_TAGS = 2;

  // Step 1: Try to match structured tags against DISPLAY_TAG_MAP
  const matchedTags: DisplayTag[] = [];
  const seenLabels = new Set<string>();

  for (const tag of structuredTags) {
    const typeMap = DISPLAY_TAG_MAP[tag.tag_type];
    if (!typeMap) continue;

    const displayTag = typeMap[tag.tag_value];
    if (!displayTag) continue;

    // Avoid duplicate labels
    if (seenLabels.has(displayTag.label)) continue;
    seenLabels.add(displayTag.label);

    // Priority is based on the best matching story_theme score for this tag_type.
    // tag_type maps loosely to themes: kodawari -> food_craft, personality -> personality, etc.
    const themeKey = TAG_TYPE_TO_THEME[tag.tag_type];
    const priority = themeKey && storyThemes[themeKey] != null ? storyThemes[themeKey] : 0;

    matchedTags.push({
      icon: displayTag.icon,
      label: displayTag.label,
      sourceTagId: tag.id,
      priority,
    });
  }

  // Sort by priority descending
  matchedTags.sort((a, b) => b.priority - a.priority);

  // Step 2: If we have enough matches, return top results
  if (matchedTags.length >= MAX_TAGS) {
    return matchedTags.slice(0, MAX_TAGS);
  }

  // Step 3: Fall back to top-scoring story themes
  const themeEntries = Object.entries(storyThemes)
    .filter(([key]) => key in THEME_TO_DISPLAY_TAG)
    .sort(([, a], [, b]) => b - a);

  const result: DisplayTag[] = [...matchedTags];

  for (const [themeKey, score] of themeEntries) {
    if (result.length >= MAX_TAGS) break;

    const themeTag = THEME_TO_DISPLAY_TAG[themeKey];
    // Avoid duplicate labels with already-selected tags
    if (seenLabels.has(themeTag.label)) continue;
    seenLabels.add(themeTag.label);

    result.push({
      icon: themeTag.icon,
      label: themeTag.label,
      priority: score,
    });
  }

  return result.slice(0, MAX_TAGS);
}

// Internal mapping from structured tag_type to story_themes key for priority scoring
const TAG_TYPE_TO_THEME: Record<string, string> = {
  kodawari: 'food_craft',
  personality: 'personality',
  scene: 'hospitality',
  atmosphere: 'community',
};
