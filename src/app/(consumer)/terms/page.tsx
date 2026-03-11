export default function TermsPage() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-balance text-2xl font-bold">利用規約</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          最終更新日: 2026年3月10日
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <div>
            <h2 className="text-balance text-lg font-semibold">第1条（適用）</h2>
            <p className="mt-2">
              本利用規約（以下「本規約」といいます）は、佐々木彦太（以下「運営者」といいます）が個人として運営するWebサービス「オシドリ」（以下「本サービス」といいます）の利用に関する条件を、本サービスを利用するすべての方（以下「ユーザー」といいます）と運営者との間で定めるものです。ユーザーは、本規約に同意の上、本サービスを利用するものとします。
            </p>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第2条（定義）</h2>
            <div className="mt-2 space-y-2">
              <p>本規約において、次の用語は以下の意味を有します。</p>
              <ul className="list-inside list-decimal space-y-1 pl-2">
                <li>「一般ユーザー」：本サービスに消費者として登録し、飲食店情報の閲覧・エンゲージメント機能を利用するユーザー</li>
                <li>「店舗オーナー」：本サービスに飲食店経営者として登録し、店舗情報の管理・発信機能を利用するユーザー</li>
                <li>「コンテンツ」：本サービス上に投稿・掲載されるテキスト、画像、音声、動画その他一切の情報</li>
                <li>「AIインタビュー」：本サービスが提供するAI技術を活用した店舗オーナーへのインタビュー機能</li>
                <li>「ストーリー」：AIインタビュー等を基にAIが生成し、店舗オーナーの確認を経て公開される店舗紹介コンテンツ</li>
              </ul>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第3条（利用登録）</h2>
            <div className="mt-2 space-y-2">
              <p>
                1. 本サービスの利用を希望する者は、本規約に同意の上、運営者が定める方法により利用登録を申請するものとします。
              </p>
              <p>
                2. 運営者は、以下の場合に利用登録を拒否することがあります。理由の開示義務は負いません。
              </p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>登録内容に虚偽、誤記または記載漏れがあった場合</li>
                <li>過去に本規約違反等により登録取消しを受けたことがある場合</li>
                <li>その他、運営者が登録を相当でないと判断した場合</li>
              </ul>
              <p>
                3. ユーザーは、登録情報に変更が生じた場合、速やかに所定の方法により変更手続を行うものとします。
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第4条（アカウント管理）</h2>
            <div className="mt-2 space-y-2">
              <p>
                1. ユーザーは、自己の責任においてアカウント情報（メールアドレス・パスワード等）を適切に管理するものとします。
              </p>
              <p>
                2. ユーザーは、アカウントを第三者に譲渡、貸与、または共有することはできません。
              </p>
              <p>
                3. アカウント情報の管理不十分、第三者の使用等による損害について、運営者は一切の責任を負いません。
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第5条（本サービスの内容）</h2>
            <div className="mt-2 space-y-2">
              <p>本サービスは、以下の機能を提供します。ただし、機能の追加・変更・廃止を行うことがあります。</p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>飲食店情報の閲覧・検索機能</li>
                <li>店舗への「推し店」登録・エンパシー（共感）送信・ファンレター送信機能</li>
                <li>来店記録（日記）の作成・管理機能</li>
                <li>AIインタビューによるストーリー・メニュー情報の生成支援機能</li>
                <li>店舗オーナー向けダッシュボード（顧客管理・メッセージ配信等）機能</li>
                <li>その他運営者が随時提供する機能</li>
              </ul>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第6条（AI生成コンテンツ）</h2>
            <div className="mt-2 space-y-2">
              <p>
                1. 本サービスでは、AI技術（OpenAI社のAPI等）を活用してストーリーやメニュー情報等のコンテンツを生成する機能を提供します。
              </p>
              <p>
                2. AI生成コンテンツは、店舗オーナーの発言・提供情報を基に生成されますが、内容の正確性・完全性を保証するものではありません。店舗オーナーは、公開前にAI生成コンテンツの内容を確認・修正する責任を負います。
              </p>
              <p>
                3. AI生成コンテンツの著作権は、運営者に帰属します。ただし、店舗オーナーは、本サービス上での利用およびSNS等での自店舗の宣伝目的において、これを自由に利用できるものとします。
              </p>
              <p>
                4. AIインタビューの音声・テキストデータは、ストーリー生成およびサービス改善の目的で利用されます。第三者AIサービス（OpenAI社等）のAPIに送信されることについて、店舗オーナーは同意するものとします。
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第7条（ユーザーによるコンテンツの投稿）</h2>
            <div className="mt-2 space-y-2">
              <p>
                1. ユーザーが本サービス上に投稿するコンテンツ（日記、ファンレター、写真、レビュー等）の著作権は、ユーザーに帰属します。
              </p>
              <p>
                2. ユーザーは、投稿コンテンツについて、運営者に対し、本サービスの運営・改善・宣伝に必要な範囲で、無償かつ非独占的な利用を許諾するものとします。
              </p>
              <p>
                3. ユーザーは、投稿コンテンツが第三者の権利を侵害しないことを保証するものとします。
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第8条（禁止事項）</h2>
            <div className="mt-2 space-y-2">
              <p>ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
              <ul className="list-inside list-decimal space-y-1 pl-2">
                <li>法令または公序良俗に違反する行為</li>
                <li>他のユーザー、店舗オーナーまたは第三者の権利（著作権、肖像権、プライバシー等）を侵害する行為</li>
                <li>虚偽の情報を登録・投稿する行為</li>
                <li>他のユーザーになりすます行為</li>
                <li>本サービスのシステムに過度の負荷をかける行為、不正アクセス行為</li>
                <li>本サービスの運営を妨害する行為</li>
                <li>営利目的でのスクレイピング、データ収集行為</li>
                <li>反社会的勢力に関連する行為</li>
                <li>誹謗中傷、差別的表現、ハラスメントに該当する行為</li>
                <li>その他、運営者が不適切と合理的に判断する行為</li>
              </ul>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第9条（サービスの停止・変更・終了）</h2>
            <div className="mt-2 space-y-2">
              <p>
                1. 運営者は、以下の場合に本サービスの全部または一部を停止できるものとします。
              </p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>システムの保守・更新を行う場合</li>
                <li>天災、停電、通信障害等の不可抗力が生じた場合</li>
                <li>その他、運営上やむを得ない事由がある場合</li>
              </ul>
              <p>
                2. 運営者は、ユーザーに事前通知の上、本サービスの内容を変更または終了することがあります。ただし、緊急の場合は事後通知とすることがあります。
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第10条（退会）</h2>
            <div className="mt-2 space-y-2">
              <p>
                1. ユーザーは、運営者が定める手続により、いつでも退会できるものとします。
              </p>
              <p>
                2. 退会後、ユーザーのアカウントおよびこれに紐づくデータは、運営者が定める期間（原則30日間）経過後に削除されます。ただし、法令上の保存義務がある場合を除きます。
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第11条（免責事項）</h2>
            <div className="mt-2 space-y-2">
              <p>
                1. 運営者は、本サービスがユーザーの特定の目的に適合すること、正確性、有用性、完全性を有すること、および不具合が生じないことについて保証しません。
              </p>
              <p>
                2. 運営者は、ユーザー間またはユーザーと第三者との間で生じたトラブル（店舗の品質、予約の履行等を含みます）について、一切の責任を負いません。
              </p>
              <p>
                3. 運営者は、AI生成コンテンツの内容に起因する損害について、故意または重大な過失がある場合を除き、責任を負いません。
              </p>
              <p>
                4. 本サービスは個人が運営するものであり、提供されるサービスの水準は商業的に提供される同等サービスと異なる場合があります。
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第12条（損害賠償）</h2>
            <p className="mt-2">
              運営者がユーザーに対して損害賠償責任を負う場合、その範囲は直接かつ現実に生じた通常の損害に限り、逸失利益その他の間接損害は含まないものとします。また、賠償額の上限は、当該ユーザーが過去12ヶ月間に本サービスに支払った金額とします（無料利用の場合は0円とします）。
            </p>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第13条（規約の変更）</h2>
            <div className="mt-2 space-y-2">
              <p>
                1. 運営者は、必要に応じて本規約を変更できるものとします。変更後の規約は、本サービス上に掲載した時点で効力を生じます。
              </p>
              <p>
                2. 重要な変更については、変更の効力発生日の14日前までに、本サービス上または登録メールアドレスへの通知により、ユーザーに告知します。
              </p>
              <p>
                3. 変更後に本サービスを利用した場合、変更後の規約に同意したものとみなします。
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第14条（準拠法・管轄）</h2>
            <div className="mt-2 space-y-2">
              <p>
                1. 本規約の解釈は日本法に準拠します。
              </p>
              <p>
                2. 本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-balance text-lg font-semibold">第15条（お問い合わせ）</h2>
            <p className="mt-2">
              本規約に関するお問い合わせは、以下の連絡先までお願いいたします。
            </p>
            <div className="mt-2 rounded-lg bg-muted/50 p-4">
              <p>運営者: 佐々木彦太</p>
              <p>メール: contact@oshidori.app</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-800">
              ※ 本規約はPoC（実証実験）段階のドラフト版です。正式な商用展開に際しては、弁護士による法務レビューを実施予定です。
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            制定日: 2026年3月10日
          </p>
        </div>
      </div>
    </section>
  );
}
