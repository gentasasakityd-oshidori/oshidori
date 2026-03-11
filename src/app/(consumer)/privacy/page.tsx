export default function PrivacyPage() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-balance text-2xl font-bold">プライバシーポリシー</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          最終更新日: 2026年3月10日
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
          <div>
            <p>
              佐々木彦太（以下「運営者」といいます）は、Webサービス「オシドリ」（以下「本サービス」といいます）における個人情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
            </p>
          </div>

          {/* --- 第1条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">1. 収集する情報</h2>
            <div className="mt-2 space-y-3">
              <div>
                <h3 className="font-medium">1-1. ユーザーから直接提供される情報</h3>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li>メールアドレス（アカウント認証用）</li>
                  <li>ニックネーム（サービス上の表示名、2〜20文字）</li>
                  <li>パスワード（ハッシュ化して保存）</li>
                  <li>Google認証情報（Googleアカウントでのログイン時）</li>
                  <li>店舗情報（店舗オーナーの場合：店名、住所、電話番号、営業時間、カテゴリ等）</li>
                  <li>投稿コンテンツ（日記テキスト、ファンレター、写真等）</li>
                  <li>AIインタビューでの発言内容（店舗オーナーの場合）</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium">1-2. 自動的に収集される情報</h3>
                <ul className="mt-1 list-inside list-disc space-y-1 pl-4">
                  <li>アクセスログ（閲覧ページ、操作履歴、アクセス日時）</li>
                  <li>デバイス情報（ブラウザ種別、OS、画面サイズ）</li>
                  <li>位置情報（ユーザーが明示的に許可した場合のみ、近隣店舗検索に使用）</li>
                  <li>Cookie情報（認証状態の維持・分析に使用）</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium">1-3. 収集しない情報</h3>
                <p className="mt-1 pl-4">
                  本サービスでは、クレジットカード情報、銀行口座情報、マイナンバー等の機微な個人情報は収集しません。
                </p>
              </div>
            </div>
          </div>

          {/* --- 第2条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">2. 利用目的</h2>
            <div className="mt-2">
              <p>収集した個人情報は、以下の目的で利用します。</p>
              <ul className="mt-2 list-inside list-decimal space-y-1 pl-2">
                <li>本サービスの提供・運営（アカウント管理、認証、機能提供）</li>
                <li>ユーザー体験の向上（パーソナライズされた店舗レコメンデーション、ムードマッチング）</li>
                <li>AIインタビューに基づくストーリー・メニュー情報の生成</li>
                <li>店舗オーナーへの顧客分析情報の提供（匿名化された統計情報）</li>
                <li>サービスの改善・新機能開発のためのデータ分析</li>
                <li>重要なお知らせ・サービス変更の通知</li>
                <li>不正利用の検知・防止</li>
                <li>お問い合わせ対応</li>
              </ul>
            </div>
          </div>

          {/* --- 第3条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">3. 第三者サービスへのデータ提供</h2>
            <div className="mt-2 space-y-3">
              <p>本サービスでは、以下の第三者サービスを利用しており、それぞれのプライバシーポリシーに従いデータが処理されます。</p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 pr-4 text-left font-semibold">サービス</th>
                      <th className="py-2 pr-4 text-left font-semibold">利用目的</th>
                      <th className="py-2 text-left font-semibold">送信されるデータ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-2 pr-4">Supabase</td>
                      <td className="py-2 pr-4">データベース・認証・ファイル保存</td>
                      <td className="py-2">ユーザー情報、投稿データ、画像</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">OpenAI</td>
                      <td className="py-2 pr-4">AIインタビュー、ストーリー生成、メニュー検索</td>
                      <td className="py-2">インタビュー発言内容、検索クエリ</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Vercel</td>
                      <td className="py-2 pr-4">Webアプリケーションのホスティング</td>
                      <td className="py-2">アクセスログ</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">PostHog</td>
                      <td className="py-2 pr-4">利用状況分析（アナリティクス）</td>
                      <td className="py-2">操作履歴、ページ閲覧（IPアドレスは無効化済み）</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Google</td>
                      <td className="py-2 pr-4">OAuth認証、地図表示</td>
                      <td className="py-2">認証トークン（ログイン時のみ）</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p>
                上記以外の第三者に対しては、法令に基づく場合、人の生命・身体・財産の保護に必要な場合、または本人の同意がある場合を除き、個人情報を提供しません。
              </p>
            </div>
          </div>

          {/* --- 第4条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">4. AIによるデータ処理</h2>
            <div className="mt-2 space-y-2">
              <p>
                本サービスでは、OpenAI社のAPIを利用してAI機能を提供しています。以下の点にご留意ください。
              </p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>AIインタビューでの発言内容はOpenAI社のAPIに送信され、ストーリー生成に使用されます</li>
                <li>メニュー検索時の自然言語クエリがOpenAI社のAPIに送信されることがあります</li>
                <li>OpenAI社のAPI利用ポリシーにより、送信データがモデルの学習に使用されることはありません（API経由）</li>
                <li>AI生成コンテンツは店舗オーナーの確認後に公開されます</li>
              </ul>
            </div>
          </div>

          {/* --- 第5条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">5. Cookieおよびトラッキング技術</h2>
            <div className="mt-2 space-y-2">
              <p>本サービスでは、以下の目的でCookieおよび類似技術を使用しています。</p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li><span className="font-medium">必須Cookie:</span> ログイン状態の維持、セッション管理（無効化不可）</li>
                <li><span className="font-medium">分析Cookie:</span> PostHogによるサービス利用状況の分析（IPアドレス取得は無効化済み）</li>
              </ul>
              <p>
                分析Cookieの使用を希望しない場合は、ブラウザの設定でCookieを無効化することができます。ただし、一部の機能が正常に動作しなくなる場合があります。
              </p>
            </div>
          </div>

          {/* --- 第6条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">6. データの安全管理</h2>
            <div className="mt-2 space-y-2">
              <p>個人情報の漏洩、滅失、毀損の防止のため、以下の措置を講じています。</p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>通信の暗号化（HTTPS/TLS）</li>
                <li>パスワードのハッシュ化保存</li>
                <li>データベースへのアクセス制御（Row Level Security）</li>
                <li>環境変数による秘密情報の管理</li>
                <li>定期的なセキュリティ対策の見直し</li>
              </ul>
            </div>
          </div>

          {/* --- 第7条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">7. データの保存期間</h2>
            <div className="mt-2 space-y-2">
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>アカウント情報: 退会後30日で削除</li>
                <li>投稿コンテンツ（日記・ファンレター等）: アカウント削除に伴い削除</li>
                <li>来店記録: アカウント削除に伴い削除（匿名化された統計データは保持する場合があります）</li>
                <li>AIインタビュー記録: 店舗公開中は保持、店舗退会後30日で削除</li>
                <li>アクセスログ: 取得後90日で自動削除</li>
              </ul>
            </div>
          </div>

          {/* --- 第8条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">8. ユーザーの権利</h2>
            <div className="mt-2 space-y-2">
              <p>ユーザーは、自己の個人情報について、以下の権利を有します。</p>
              <ul className="list-inside list-decimal space-y-1 pl-2">
                <li><span className="font-medium">開示請求:</span> 保有する個人情報の開示を請求できます</li>
                <li><span className="font-medium">訂正・追加・削除:</span> 個人情報の内容が事実と異なる場合、訂正等を請求できます</li>
                <li><span className="font-medium">利用停止・消去:</span> 個人情報の利用停止または消去を請求できます</li>
                <li><span className="font-medium">第三者提供の停止:</span> 第三者への提供の停止を請求できます</li>
              </ul>
              <p>
                上記の請求は、本人確認の上、下記お問い合わせ先にて受け付けます。対応には合理的な期間をいただきます。
              </p>
            </div>
          </div>

          {/* --- 第9条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">9. 未成年の利用</h2>
            <p className="mt-2">
              16歳未満の方が本サービスを利用する場合は、保護者の同意が必要です。運営者が16歳未満と知り得た場合、保護者の同意を確認できないときはアカウントを停止することがあります。
            </p>
          </div>

          {/* --- 第10条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">10. 店舗オーナー向け特記事項</h2>
            <div className="mt-2 space-y-2">
              <p>
                店舗オーナーは、本サービスを通じて一般ユーザーの以下の情報にアクセスできます。これらの情報の取り扱いについて、店舗オーナーは以下を遵守するものとします。
              </p>
              <ul className="list-inside list-disc space-y-1 pl-4">
                <li>ニックネーム、エンパシー・来店記録等は本サービス上での顧客関係構築の目的にのみ利用すること</li>
                <li>取得した情報を本サービス外の営業目的で利用しないこと</li>
                <li>取得した情報を第三者に提供しないこと</li>
              </ul>
            </div>
          </div>

          {/* --- 第11条 --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">11. ポリシーの変更</h2>
            <div className="mt-2 space-y-2">
              <p>
                1. 運営者は、必要に応じて本ポリシーを変更することがあります。重要な変更については、本サービス上での掲示または登録メールアドレスへの通知により告知します。
              </p>
              <p>
                2. 変更後の本ポリシーは、本サービス上に掲載した時点で効力を生じます。
              </p>
            </div>
          </div>

          {/* --- お問い合わせ --- */}
          <div>
            <h2 className="text-balance text-lg font-semibold">12. お問い合わせ</h2>
            <p className="mt-2">
              個人情報の取り扱いに関するお問い合わせ・請求は、以下の連絡先までお願いいたします。
            </p>
            <div className="mt-2 rounded-lg bg-muted/50 p-4">
              <p>個人情報取扱責任者: 佐々木彦太</p>
              <p>メール: privacy@oshidori.app</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-800">
              ※ 本ポリシーはPoC（実証実験）段階のドラフト版です。正式な商用展開に際しては、弁護士による法務レビューを実施予定です。
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
