"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/analytics");
  }, [router]);
  return <p className="p-4 text-muted-foreground">リダイレクト中...</p>;
}
