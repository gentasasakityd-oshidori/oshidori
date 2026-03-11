export default function LegalPage() {
  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-balance text-2xl font-bold">特定商取引法に基づく表記</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          最終更新日: 2026年3月10日
        </p>

        <div className="mt-8 text-sm leading-relaxed text-foreground/90">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <tbody className="divide-y">
                <tr>
                  <td className="w-1/3 py-4 pr-4 align-top font-semibold">事業者名</td>
                  <td className="py-4">佐々木彦太（個人事業）</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">運営責任者</td>
                  <td className="py-4">佐々木彦太</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">所在地</td>
                  <td className="py-4">
                    請求があった場合には遅滞なく開示いたします。
                    <br />
                    <span className="text-xs text-muted-foreground">
                      （個人事業のため、住所はお問い合わせいただいた方に個別にお知らせいたします）
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">電話番号</td>
                  <td className="py-4">
                    請求があった場合には遅滞なく開示いたします。
                    <br />
                    <span className="text-xs text-muted-foreground">
                      （お問い合わせはメールにて受け付けております）
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">メールアドレス</td>
                  <td className="py-4">contact@oshidori.app</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">サービスURL</td>
                  <td className="py-4">https://oshidori.vercel.app</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">サービス内容</td>
                  <td className="py-4">
                    個人経営飲食店向けCRMプラットフォーム「オシドリ」の提供
                    <br />
                    <span className="text-xs text-muted-foreground">
                      （AIインタビュー、ストーリー生成、顧客管理、ファンクラブ運営支援等）
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">販売価格</td>
                  <td className="py-4">
                    <p>PoC期間中: 全機能無料</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      有料プラン導入時は、サービス画面上およびメールにて事前にお知らせいたします。
                    </p>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">
                    サービス提供時期
                  </td>
                  <td className="py-4">
                    利用登録完了後、直ちにご利用いただけます。
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">支払方法</td>
                  <td className="py-4">
                    PoC期間中は無料のため支払い不要
                    <br />
                    <span className="text-xs text-muted-foreground">
                      （有料プラン導入時はクレジットカード決済を予定）
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">キャンセル・退会</td>
                  <td className="py-4">
                    ユーザーはいつでも退会可能です。退会後30日でアカウント情報は削除されます。
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 align-top font-semibold">動作環境</td>
                  <td className="py-4">
                    <p>Google Chrome、Safari、Firefox、Edgeの最新版</p>
                    <p className="text-xs text-muted-foreground">
                      （スマートフォンでの利用を推奨）
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-800">
              ※ PoC（実証実験）段階のため、全機能を無料で提供しています。有料サービスの提供開始時には、本ページを更新いたします。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
