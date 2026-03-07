import { describe, it, expect } from "vitest";
import {
  AREAS,
  CATEGORIES,
  EMPATHY_TAGS,
  BUDGET_LABELS,
  GENRES,
  VISIT_MOOD_TAGS,
  STORY_PERSPECTIVE_LABELS,
} from "@/lib/constants";

describe("Constants", () => {
  describe("AREAS", () => {
    it("9つのエリアが定義されている", () => {
      expect(AREAS).toHaveLength(9);
    });

    it("各エリアは非空文字列", () => {
      for (const area of AREAS) {
        expect(typeof area).toBe("string");
        expect(area.length).toBeGreaterThan(0);
      }
    });

    it("重複がない", () => {
      const unique = new Set(AREAS);
      expect(unique.size).toBe(AREAS.length);
    });
  });

  describe("CATEGORIES", () => {
    it("13のカテゴリが定義されている", () => {
      expect(CATEGORIES).toHaveLength(13);
    });

    it("「その他」が含まれる", () => {
      expect(CATEGORIES).toContain("その他");
    });
  });

  describe("EMPATHY_TAGS", () => {
    it("6つの共感タグが定義されている", () => {
      expect(EMPATHY_TAGS).toHaveLength(6);
    });

    it("各タグにid, label, emojiが存在する", () => {
      for (const tag of EMPATHY_TAGS) {
        expect(tag).toHaveProperty("id");
        expect(tag).toHaveProperty("label");
        expect(tag).toHaveProperty("emoji");
        expect(tag.id.length).toBeGreaterThan(0);
        expect(tag.label.length).toBeGreaterThan(0);
        expect(tag.emoji.length).toBeGreaterThan(0);
      }
    });

    it("IDが一意である", () => {
      const ids = EMPATHY_TAGS.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("定義されたIDが正しい", () => {
      const ids = EMPATHY_TAGS.map((t) => t.id);
      expect(ids).toContain("craftsman");
      expect(ids).toContain("ingredient");
      expect(ids).toContain("hospitality");
      expect(ids).toContain("passion");
      expect(ids).toContain("kodawari");
      expect(ids).toContain("story");
    });
  });

  describe("BUDGET_LABELS", () => {
    it("5つの予算帯が定義されている", () => {
      expect(BUDGET_LABELS).toHaveLength(5);
    });

    it("各ラベルにid, label, range, emojiが存在する", () => {
      for (const b of BUDGET_LABELS) {
        expect(b).toHaveProperty("id");
        expect(b).toHaveProperty("label");
      }
    });
  });

  describe("VISIT_MOOD_TAGS", () => {
    it("9つの気分タグが定義されている", () => {
      expect(VISIT_MOOD_TAGS).toHaveLength(9);
    });

    it("各タグにid, label, emojiが存在する", () => {
      for (const tag of VISIT_MOOD_TAGS) {
        expect(tag).toHaveProperty("id");
        expect(tag).toHaveProperty("label");
        expect(tag).toHaveProperty("emoji");
      }
    });

    it("IDが一意である", () => {
      const ids = VISIT_MOOD_TAGS.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("GENRES", () => {
    it("ジャンルが定義されている", () => {
      expect(GENRES.length).toBeGreaterThan(0);
    });
  });

  describe("STORY_PERSPECTIVE_LABELS", () => {
    it("5つの視点ラベルが定義されている", () => {
      expect(STORY_PERSPECTIVE_LABELS).toHaveLength(5);
    });

    it("各ラベルにid, label, emoji, keywordsが存在する", () => {
      for (const label of STORY_PERSPECTIVE_LABELS) {
        expect(label).toHaveProperty("id");
        expect(label).toHaveProperty("label");
        expect(label).toHaveProperty("emoji");
        expect(label).toHaveProperty("keywords");
        expect(Array.isArray(label.keywords)).toBe(true);
        expect(label.keywords.length).toBeGreaterThan(0);
      }
    });
  });
});
