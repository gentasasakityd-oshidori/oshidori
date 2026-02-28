export default function PrivacyPage() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          最終更新日: 2026年2月28日
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <div>
            <h2 className="text-lg font-semibold">1. 個人情報の収集について</h2>
            <p className="mt-2">
              当社は、本サービスの提供にあたり、以下の情報を収集することがあります。
              メールアドレス、ニックネーム、利用履歴、Cookie情報等。
              これらの情報は、サービスの提供・改善のために利用されます。
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">2. 個人情報の利用目的</h2>
            <p className="mt-2">
              収集した個人情報は、本サービスの提供・運営、ユーザーサポート、
              サービスの改善・新機能開発、重要なお知らせの通知等の目的で利用いたします。
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">3. 第三者への提供</h2>
            <p className="mt-2">
              当社は、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">4. データの安全管理</h2>
            <p className="mt-2">
              当社は、個人情報の漏洩、滅失、毀損の防止のため、適切なセキュリティ対策を講じます。
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">5. お問い合わせ</h2>
            <p className="mt-2">
              個人情報の取り扱いに関するお問い合わせは、当社までご連絡ください。
            </p>
          </div>

          <div className="rounded-lg bg-warm p-4">
            <p className="text-xs text-muted-foreground">
              ※ これはデモ用のダミーテキストです。正式なプライバシーポリシーは法務確認の上で作成されます。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
