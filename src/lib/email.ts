/**
 * メール送信ユーティリティ
 * Resend API を使用してシステムメールを送信する
 */

const SYSTEM_EMAIL = "oshidori.service@gmail.com";
const FROM_ADDRESS = "オシドリ <noreply@oshidori.vercel.app>";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

/**
 * メールを送信する（Resend設定時のみ）
 * RESEND_API_KEY が未設定の場合はログ出力のみ
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[Email] RESEND_API_KEY未設定のためスキップ:", options.subject);
    return false;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      text: options.text,
      ...(options.html ? { html: options.html } : {}),
    });
    return true;
  } catch (err) {
    console.error("[Email] 送信失敗:", err);
    return false;
  }
}

/**
 * 運営チームに通知メールを送信する
 */
export async function notifyAdmin(subject: string, body: string): Promise<boolean> {
  return sendEmail({
    to: SYSTEM_EMAIL,
    subject: `【オシドリ】${subject}`,
    text: body,
  });
}

/**
 * 店舗登録完了時の通知メール（運営宛て）
 */
export async function notifyShopRegistered(shopData: {
  shopName: string;
  ownerName: string;
  category: string;
  address: string;
  phone: string;
  ownerEmail?: string;
}): Promise<void> {
  const body = [
    "新しい店舗が登録されました。",
    "",
    `店舗名: ${shopData.shopName}`,
    `オーナー名: ${shopData.ownerName}`,
    `カテゴリ: ${shopData.category}`,
    `住所: ${shopData.address}`,
    `電話番号: ${shopData.phone}`,
    shopData.ownerEmail ? `オーナーメール: ${shopData.ownerEmail}` : "",
    "",
    `登録日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
    "",
    "管理画面で確認してください:",
    `${process.env.NEXT_PUBLIC_APP_URL || "https://oshidori.vercel.app"}/admin/shops`,
  ].filter(Boolean).join("\n");

  await notifyAdmin("新規店舗登録", body);
}

/**
 * 店舗登録完了時の確認メール（登録者宛て）
 */
export async function notifyOwnerShopRegistered(ownerEmail: string, shopData: {
  shopName: string;
  ownerName: string;
}): Promise<void> {
  const body = [
    `${shopData.ownerName} 様`,
    "",
    "オシドリへの店舗登録が完了しました。",
    "",
    `店舗名: ${shopData.shopName}`,
    "",
    "店舗情報の編集やストーリーの作成は、ダッシュボードから行えます。",
    `${process.env.NEXT_PUBLIC_APP_URL || "https://oshidori.vercel.app"}/dashboard`,
    "",
    "今後の流れ:",
    "1. 運営チームが店舗情報を確認します",
    "2. AIインタビューで店舗の魅力を引き出します",
    "3. ストーリーが自動生成され、公開されます",
    "",
    "ご不明な点がございましたら、お気軽にお問い合わせください。",
    "",
    "---",
    "オシドリ運営チーム",
    "oshidori.service@gmail.com",
  ].join("\n");

  await sendEmail({
    to: ownerEmail,
    subject: "【オシドリ】店舗登録が完了しました",
    text: body,
  });
}

/**
 * 店舗申請受付時の通知メール（運営宛て）
 */
export async function notifyShopApplicationReceived(appData: {
  shopName: string;
  applicantName: string;
  applicantEmail: string;
  category: string;
}): Promise<void> {
  const body = [
    "新しい店舗オーナー申請を受け付けました。",
    "",
    `店舗名: ${appData.shopName}`,
    `申請者名: ${appData.applicantName}`,
    `メール: ${appData.applicantEmail}`,
    `カテゴリ: ${appData.category}`,
    "",
    `受付日時: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
    "",
    "管理画面で審査してください:",
    `${process.env.NEXT_PUBLIC_APP_URL || "https://oshidori.vercel.app"}/admin/applications`,
  ].join("\n");

  await notifyAdmin("新規店舗オーナー申請", body);
}

/**
 * 店舗申請受付時の確認メール（申請者宛て）
 */
export async function notifyApplicantReceived(applicantEmail: string, appData: {
  shopName: string;
  applicantName: string;
}): Promise<void> {
  const body = [
    `${appData.applicantName} 様`,
    "",
    "オシドリへの店舗オーナー申請を受け付けました。",
    "",
    `申請店舗名: ${appData.shopName}`,
    "",
    "運営チームにて内容を確認し、審査いたします。",
    "審査完了後、結果をメールでお知らせいたします。",
    "",
    "審査には通常1〜3営業日いただいております。",
    "",
    "ご不明な点がございましたら、お気軽にお問い合わせください。",
    "",
    "---",
    "オシドリ運営チーム",
    "oshidori.service@gmail.com",
  ].join("\n");

  await sendEmail({
    to: applicantEmail,
    subject: "【オシドリ】店舗オーナー申請を受け付けました",
    text: body,
  });
}

/**
 * 申請審査完了時の通知メール（申請者宛て）
 */
export async function notifyApplicationResult(applicantEmail: string, result: {
  applicantName: string;
  shopName: string;
  approved: boolean;
  rejectReason?: string;
}): Promise<void> {
  if (result.approved) {
    const body = [
      `${result.applicantName} 様`,
      "",
      "店舗オーナー申請が承認されました。おめでとうございます！",
      "",
      `承認店舗名: ${result.shopName}`,
      "",
      "ダッシュボードから店舗情報の編集が可能です。",
      `${process.env.NEXT_PUBLIC_APP_URL || "https://oshidori.vercel.app"}/dashboard`,
      "",
      "今後の流れ:",
      "1. ダッシュボードで店舗情報を充実させてください",
      "2. AIインタビューで店舗の魅力を引き出します",
      "3. ストーリーが自動生成され、公開されます",
      "",
      "---",
      "オシドリ運営チーム",
      "oshidori.service@gmail.com",
    ].join("\n");

    await sendEmail({
      to: applicantEmail,
      subject: "【オシドリ】店舗オーナー申請が承認されました",
      text: body,
    });
  } else {
    const body = [
      `${result.applicantName} 様`,
      "",
      "店舗オーナー申請について確認させていただきたい点がございます。",
      "",
      `対象店舗名: ${result.shopName}`,
      result.rejectReason ? `\n確認事項:\n${result.rejectReason}` : "",
      "",
      "恐れ入りますが、内容をご確認の上、再度お申し込みいただくか、",
      "お問い合わせフォームよりご連絡ください。",
      "",
      "---",
      "オシドリ運営チーム",
      "oshidori.service@gmail.com",
    ].filter(Boolean).join("\n");

    await sendEmail({
      to: applicantEmail,
      subject: "【オシドリ】店舗オーナー申請について",
      text: body,
    });
  }
}
