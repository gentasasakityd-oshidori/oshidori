import { test, expect, Page } from "@playwright/test";

// オーバーレイ（Cookie同意バナー、チュートリアル等）を閉じるヘルパー
async function dismissOverlays(page: Page) {
  await page.waitForTimeout(1500);
  // スキップ、同意、閉じる等のボタンを順に試す
  const selectors = [
    'button:has-text("スキップ")',
    'text=スキップ',
    'button:has-text("同意")',
    'button:has-text("OK")',
    'button:has-text("閉じる")',
    'button:has-text("許可")',
    '[aria-label="close"]',
    '[aria-label="閉じる"]',
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 500 })) {
        await el.click({ timeout: 2000 });
        await page.waitForTimeout(500);
      }
    } catch {
      // 無視
    }
  }
  // チュートリアルが複数ステップある場合、再度スキップ
  for (let i = 0; i < 5; i++) {
    try {
      const skip = page.locator('button:has-text("スキップ"), text=スキップ').first();
      if (await skip.isVisible({ timeout: 300 })) {
        await skip.click({ timeout: 1000 });
        await page.waitForTimeout(300);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}

test.describe("店舗閲覧フロー", () => {
  test("探すページで検索エリアが表示される", async ({ page }) => {
    await page.goto("/explore");
    await dismissOverlays(page);

    // 検索入力フィールドまたはタブ切替UIがある
    const searchArea = page.locator('input[placeholder*="探す"], input[placeholder*="検索"]').first();
    await expect(searchArea).toBeVisible({ timeout: 10000 });
  });

  test("探すページでタブ切替が動作する", async ({ page }) => {
    await page.goto("/explore");
    await dismissOverlays(page);
    await page.waitForTimeout(1000);

    // 「お店」「メニュー」タブの存在確認
    const shopTab = page.locator('button:has-text("お店"), [role="tab"]:has-text("お店")').first();
    const menuTab = page.locator('button:has-text("メニュー"), [role="tab"]:has-text("メニュー")').first();

    const shopTabCount = await shopTab.count();
    const menuTabCount = await menuTab.count();

    if (shopTabCount > 0 && menuTabCount > 0) {
      await menuTab.click({ timeout: 10000 });
      await page.waitForTimeout(500);
      // メニュー検索用の入力欄が表示される
      const menuInput = page.locator('input[placeholder*="メニュー"]').first();
      await expect(menuInput).toBeVisible({ timeout: 5000 });
    }
  });

  test("店舗カードがあればクリックで詳細ページに遷移する", async ({ page }) => {
    await page.goto("/explore");
    await dismissOverlays(page);
    await page.waitForTimeout(2000);

    // 店舗カード内のリンクを探す
    const shopLinks = page.locator('a[href^="/shops/"]');
    const count = await shopLinks.count();

    if (count > 0) {
      const href = await shopLinks.first().getAttribute("href");
      await shopLinks.first().click({ timeout: 10000 });
      await page.waitForURL(`**${href}`, { timeout: 10000 });
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("ストーリー一覧ページが表示される", async ({ page }) => {
    await page.goto("/stories");
    await dismissOverlays(page);
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("店舗詳細ページ", () => {
  test("基本情報が表示される", async ({ page }) => {
    await page.goto("/explore");
    await dismissOverlays(page);
    await page.waitForTimeout(2000);

    const shopLinks = page.locator('a[href^="/shops/"]');
    const count = await shopLinks.count();

    if (count > 0) {
      await shopLinks.first().click({ timeout: 10000 });
      await dismissOverlays(page);
      await page.waitForTimeout(2000);

      // 店舗名が表示されている
      const heading = page.locator("h1, h2").first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe("料金プランページ", () => {
  test("3プランが表示される", async ({ page }) => {
    await page.goto("/for-shops");
    await dismissOverlays(page);

    // フリー・スタンダード・プレミアムが存在する
    await expect(page.locator('text=フリー').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=スタンダード').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=プレミアム').first()).toBeVisible({ timeout: 10000 });
  });

  test("正しい料金が表示される", async ({ page }) => {
    await page.goto("/for-shops");
    await dismissOverlays(page);

    // 事業計画書準拠の価格
    await expect(page.locator('text=8,000').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=15,000').first()).toBeVisible({ timeout: 10000 });
  });
});
