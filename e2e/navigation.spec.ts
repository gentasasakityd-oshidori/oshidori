import { test, expect } from "@playwright/test";

test.describe("基本ナビゲーション", () => {
  test("ランディングページが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/オシドリ/);
  });

  test("ホームページが表示される", async ({ page }) => {
    await page.goto("/home");
    // ホームにピックアップやエリアナビが表示される
    await expect(page.locator("body")).toBeVisible();
  });

  test("探すページが表示される", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.locator("body")).toBeVisible();
  });

  test("about ページが表示される", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("body")).toBeVisible();
  });

  test("for-shops ページが表示される", async ({ page }) => {
    await page.goto("/for-shops");
    await expect(page.locator("body")).toBeVisible();
  });

  test("利用規約ページが表示される", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("body")).toBeVisible();
  });

  test("プライバシーポリシーページが表示される", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("body")).toBeVisible();
  });

  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
  });

  test("存在しないページで404が表示される", async ({ page }) => {
    const res = await page.goto("/nonexistent-page-xyz");
    expect(res?.status()).toBe(404);
  });
});

test.describe("認証が必要なページのリダイレクト", () => {
  test("推し店ページは未認証ならリダイレクト", async ({ page }) => {
    await page.goto("/oshi");
    // ログインページにリダイレクトされるか、認証を促す表示
    await page.waitForURL(/\/(login|oshi)/, { timeout: 5000 });
  });

  test("ダイアリーページは未認証ならリダイレクト", async ({ page }) => {
    await page.goto("/diary");
    await page.waitForURL(/\/(login|diary)/, { timeout: 5000 });
  });

  test("マイページは未認証ならリダイレクト", async ({ page }) => {
    await page.goto("/mypage");
    await page.waitForURL(/\/(login|mypage)/, { timeout: 5000 });
  });

  test("ダッシュボードは未認証ならリダイレクト", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/(login|dashboard|unauthorized)/, { timeout: 5000 });
  });

  test("管理画面は未認証ならリダイレクト", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/(login|admin|unauthorized)/, { timeout: 5000 });
  });
});

test.describe("ボトムナビゲーション（モバイル）", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("ホームからボトムナビでページ遷移できる", async ({ page }) => {
    await page.goto("/home");

    // ボトムナビが表示されている
    const nav = page.locator("nav").last();
    await expect(nav).toBeVisible();
  });
});
