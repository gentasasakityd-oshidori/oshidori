"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// マイページに統合済み — /mypage へリダイレクト
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/mypage");
  }, [router]);

  return null;
}
