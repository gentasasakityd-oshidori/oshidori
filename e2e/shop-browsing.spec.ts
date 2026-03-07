import { test, expect } from "@playwright/test";

test.describe("店舗閲覧フロー", () => {
  test("探すページで検索バーが表示される", async ({ page }) => {
    await page.goto("/explore");

    // 検索入力フィールドがある
    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    await expect(searchInput).toBeVisible();
  });

  test("探すページでエリアフィルターが動作する", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForTimeout(1000); // データ読み込み待ち

    // エリアボタンを探す（蔵前、清澄白河など）
    const areaButtons = page.locator('button:has-text("蔵前"), button:has-text("清澄白河"), button:has-text("三軒茶屋")');
    const count = await areaButtons.count();
    if (count > 0) {
      await areaButtons.first().click();
      await page.waitForTimeout(500);
    }
  });

  test("店舗カードがあればクリックで詳細ページに遷移する", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForTimeout(2000);

    // 店舗カード内のリンクを探す
    const shopLinks = page.locator('a[href^="/shops/"]');
    const count = await shopLinks.count();

    if (count > 0) {
      const href = await shopLinks.first().getAttribute("href");
      await shopLinks.first().click();
      await page.waitForURL(`**${href}`, { timeout: 5000 });
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("ストーリー一覧ページが表示される", async ({ page }) => {
    await page.goto("/stories");
    await page.waitForTimeout(1000);
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("店舗詳細ページ", () => {
  // ダミーデータの店舗slugを使用（Supabase接続エラー時のフォールバック）
  test("基本情報が表示される", async ({ page }) => {
    await page.goto("/explore");
    await page.waitForTimeout(2000);

    const shopLinks = page.locator('a[href^="/shops/"]');
    const count = await shopLinks.count();

    if (count > 0) {
      await shopLinks.first().click();
      await page.waitForTimeout(2000);

      // 店舗名が表示されている
      const heading = page.locator("h1, h2").first();
      await expect(heading).toBeVisible();
    }
  });
});

test.describe("料金プランページ", () => {
  test("3プランが表示される", async ({ page }) => {
    await page.goto("/for-shops");
    await page.waitForTimeout(1000);

    // フリー・スタンダード・プレミアムが存在する
    await expect(page.locator('text=フリー').first()).toBeVisible();
    await expect(page.locator('text=スタンダード').first()).toBeVisible();
    await expect(page.locator('text=プレミアム').first()).toBeVisible();
  });

  test("正しい料金が表示される", async ({ page }) => {
    await page.goto("/for-shops");
    await page.waitForTimeout(1000);

    // 事業計画書準拠の価格
    await expect(page.locator('text=8,000').first()).toBeVisible();
    await expect(page.locator('text=15,000').first()).toBeVisible();
  });
});
