export default function TermsPage() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">利用規約</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          最終更新日: 2026年2月28日
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <div>
            <h2 className="text-lg font-semibold">第1条（適用）</h2>
            <p className="mt-2">
              本利用規約（以下、「本規約」）は、オシドリ（以下、「当社」）が提供するサービス（以下、「本サービス」）の利用に関する条件を定めるものです。
              登録ユーザーの皆さまには、本規約に同意いただいた上で、本サービスをご利用いただきます。
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">第2条（利用登録）</h2>
            <p className="mt-2">
              本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、
              当社がこれを承認することによって、利用登録が完了するものとします。
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">第3条（ユーザーの責任）</h2>
            <p className="mt-2">
              ユーザーは、自己の責任において、本サービスのアカウントを適切に管理するものとします。
              ユーザーは、いかなる場合にも、アカウントを第三者に譲渡または貸与することはできません。
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">第4条（禁止事項）</h2>
            <p className="mt-2">
              ユーザーは、本サービスの利用にあたり、法令または公序良俗に違反する行為、
              他のユーザーまたは第三者の権利を侵害する行為、
              本サービスの運営を妨害する行為等を行ってはならないものとします。
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">第5条（免責事項）</h2>
            <p className="mt-2">
              当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じたトラブル等について、
              一切責任を負わないものとします。
            </p>
          </div>

          <div className="rounded-lg bg-warm p-4">
            <p className="text-xs text-muted-foreground">
              ※ これはデモ用のダミーテキストです。正式な利用規約は法務確認の上で作成されます。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
