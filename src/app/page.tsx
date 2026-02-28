import Link from "next/link";
import Image from "next/image";
import { Users, Store, Shield } from "lucide-react";

export default function PortalPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4 py-12">
      {/* ロゴ */}
      <div className="mb-2">
        <Image
          src="/logo.png"
          alt="オシドリ"
          width={160}
          height={45}
          className="h-10 w-auto"
          priority
        />
      </div>
      <p className="mb-10 text-center text-sm text-gray-500">
        飲食人の&quot;好き&quot;と&quot;こだわり&quot;が、お客さんの共感を通じて価値になる。
      </p>

      {/* 3つの選択肢 */}
      <div className="grid w-full max-w-3xl gap-5 sm:grid-cols-3">
        {/* 消費者向け */}
        <Link
          href="/home"
          className="group flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-200 hover:border-orange-300 hover:shadow-lg hover:-translate-y-1"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 transition-colors group-hover:bg-orange-100">
            <Users className="h-8 w-8 text-orange-600" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">消費者向けトップ</h2>
            <p className="mt-1 text-xs text-gray-500">
              推しの飲食店を探す・ストーリーを読む
            </p>
          </div>
        </Link>

        {/* 飲食店向け */}
        <Link
          href="/dashboard"
          className="group flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 transition-colors group-hover:bg-blue-100">
            <Store className="h-8 w-8 text-blue-600" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">
              飲食店ダッシュボード
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              AIインタビュー・ストーリー管理
            </p>
          </div>
        </Link>

        {/* 自社管理画面 */}
        <Link
          href="/admin"
          className="group flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all duration-200 hover:border-purple-300 hover:shadow-lg hover:-translate-y-1"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 transition-colors group-hover:bg-purple-100">
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-900">自社管理画面</h2>
            <p className="mt-1 text-xs text-gray-500">
              KPI・店舗管理・データ分析
            </p>
          </div>
        </Link>
      </div>

      <p className="mt-10 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} オシドリ &mdash; Demo Portal
      </p>
    </div>
  );
}
