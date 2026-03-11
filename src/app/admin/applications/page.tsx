"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 旧ページ → 店舗管理へリダイレクト */
export default function ApplicationsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/shops");
  }, [router]);
  return <p className="p-4 text-muted-foreground">リダイレクト中...</p>;
}
