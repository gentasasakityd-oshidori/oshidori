"use client";

import { useState, useEffect } from "react";
import { Users, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SocialProofProps {
  shopId: string;
  oshiCount: number;
}

export function SocialProof({ shopId, oshiCount }: SocialProofProps) {
  const [supporters, setSupporters] = useState<string[]>([]);
  const [trustChainNames, setTrustChainNames] = useState<string[]>([]);

  useEffect(() => {
    async function fetchSocialData() {
      try {
        const supabase = createClient();

        // 推し登録者の情報を取得
        const { data: oshiData } = await supabase
          .from("oshi_shops")
          .select("user_id")
          .eq("shop_id", shopId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!oshiData || oshiData.length === 0) return;

        const oshiUserIds = oshiData.map((d: { user_id: string }) => d.user_id);

        // ニックネーム取得
        const { data: users } = await supabase
          .from("users")
          .select("id, nickname")
          .in("id", oshiUserIds);

        if (users) {
          const nicknameMap = new Map(
            users.map((u: { id: string; nickname: string | null }) => [u.id, u.nickname ?? "ファン"])
          );
          setSupporters(
            oshiUserIds
              .map((uid: string) => nicknameMap.get(uid) ?? "ファン")
              .slice(0, 3)
          );
        }

        // 信頼の連鎖: ログインユーザーのフォロー先がこの店を推しているか確認
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: followData } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (!followData || followData.length === 0) return;

        const followingIds = followData.map((f: { following_id: string }) => f.following_id);

        // フォロー先でこの店を推している人
        const mutualOshi = oshiUserIds.filter((uid: string) => followingIds.includes(uid));
        if (mutualOshi.length === 0) return;

        const { data: mutualUsers } = await supabase
          .from("users")
          .select("id, nickname")
          .in("id", mutualOshi);

        if (mutualUsers) {
          setTrustChainNames(
            mutualUsers
              .map((u: { nickname: string | null }) => u.nickname ?? "ファン")
              .slice(0, 2)
          );
        }
      } catch {
        // 取得エラーは無視
      }
    }
    if (oshiCount > 0) {
      fetchSocialData();
    }
  }, [shopId, oshiCount]);

  if (oshiCount === 0) return null;

  return (
    <div className="space-y-1">
      {/* 信頼の連鎖（フォロー先の推し） */}
      {trustChainNames.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <UserCheck className="h-3.5 w-3.5 text-green-500" />
          <span className="text-green-700">
            <span className="font-medium">{trustChainNames.join("、")}</span>
            さんもこのお店を推しています
          </span>
        </div>
      )}
      {/* 基本のソーシャルプルーフ */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span>
          {supporters.length > 0 ? (
            <>
              <span className="font-medium text-[#2C3E50]">
                {supporters.join("、")}
              </span>
              {oshiCount > supporters.length && (
                <> ほか{oshiCount - supporters.length}人</>
              )}
              が推し登録中
            </>
          ) : (
            <>{oshiCount}人が推し登録中</>
          )}
        </span>
      </div>
    </div>
  );
}
