import { test, expect, devices } from "@playwright/test";

test.describe("レスポンシブデザイン", () => {
  const viewports = [
    { name: "Mobile", ...devices["iPhone 14"].viewport! },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Desktop", width: 1280, height: 800 },
  ];

  for (const vp of viewports) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test("ホームページがレイアウト崩れなく表示される", async ({ page }) => {
        await page.goto("/home");
        await page.waitForTimeout(1000);

        // ページがスクロール可能（コンテンツが存在する）
        const body = page.locator("body");
        await expect(body).toBeVisible();

        // 水平スクロールバーが出ていない（レイアウト崩れチェック）
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // 1px許容
      });

      test("探すページが正常表示", async ({ page }) => {
        await page.goto("/explore");
        await page.waitForTimeout(1000);
        await expect(page.locator("body")).toBeVisible();
      });

      test("料金ページが正常表示", async ({ page }) => {
        await page.goto("/for-shops");
        await page.waitForTimeout(1000);
        await expect(page.locator("body")).toBeVisible();
      });
    });
  }
});

test.describe("アクセシビリティ基本チェック", () => {
  test("ホームページにlang属性がある", async ({ page }) => {
    await page.goto("/home");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });

  test("画像にalt属性がある", async ({ page }) => {
    await page.goto("/home");
    await page.waitForTimeout(2000);

    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const alt = await images.nth(i).getAttribute("alt");
      // alt属性が存在する（空文字は装飾画像として許容）
      expect(alt).not.toBeNull();
    }
  });

  test("ボタンにアクセシブルな名前がある", async ({ page }) => {
    await page.goto("/home");
    await page.waitForTimeout(2000);

    const buttons = page.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute("aria-label");
      const title = await btn.getAttribute("title");
      // テキスト、aria-label、titleのいずれかがある
      expect(text || ariaLabel || title).toBeTruthy();
    }
  });
});
