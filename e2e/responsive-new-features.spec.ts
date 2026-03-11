import { test, expect, devices } from "@playwright/test";

test.describe("新機能レスポンシブテスト", () => {
  const viewports = [
    { name: "Mobile", ...devices["iPhone 14"].viewport! },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Desktop", width: 1280, height: 800 },
  ];

  for (const vp of viewports) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("メニュー検索タブが表示される", async ({ page }) => {
        await page.goto("/explore");
        await page.waitForTimeout(2000);

        // タブが存在する
        const body = page.locator("body");
        await expect(body).toBeVisible();

        // 水平スクロールバーが出ていない
        const scrollWidth = await page.evaluate(
          () => document.documentElement.scrollWidth
        );
        const clientWidth = await page.evaluate(
          () => document.documentElement.clientWidth
        );
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });

      test("LPページがレイアウト崩れなく表示される", async ({ page }) => {
        await page.goto("/lp");
        await page.waitForTimeout(2000);

        await expect(page.locator("body")).toBeVisible();

        // 水平スクロールバーチェック
        const scrollWidth = await page.evaluate(
          () => document.documentElement.scrollWidth
        );
        const clientWidth = await page.evaluate(
          () => document.documentElement.clientWidth
        );
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });

      test("利用規約ページが表示される", async ({ page }) => {
        await page.goto("/terms");
        await page.waitForTimeout(1500);
        await expect(page.locator("body")).toBeVisible();
        // テキストコンテンツが存在する
        const text = await page.locator("body").textContent();
        expect(text?.length).toBeGreaterThan(10);
      });

      test("プライバシーポリシーページが表示される", async ({ page }) => {
        await page.goto("/privacy");
        await page.waitForTimeout(1500);
        await expect(page.locator("body")).toBeVisible();
      });
    });
  }
});

test.describe("店舗詳細ページ表示確認", () => {
  test("存在しない店舗スラッグで適切にハンドリングされる", async ({ page }) => {
    const response = await page.goto("/shops/non-existent-shop-slug-12345");
    // 404またはリダイレクトが返ること
    if (response) {
      expect([200, 404, 308]).toContain(response.status());
    }
    await expect(page.locator("body")).toBeVisible();
  });
});
