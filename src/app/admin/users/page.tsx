"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, Shield, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AdminUser = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  oshi_count: number;
  empathy_count: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users);
        }
      } catch {
        // Ignore
      }
      setIsLoading(false);
    }
    loadUsers();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            登録ユーザーの一覧と活動状況
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {users.length}ユーザー
        </Badge>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center gap-4 p-4">
                {/* アバター */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {user.nickname[0] ?? "?"}
                </div>

                {/* ユーザー情報 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{user.nickname}</h3>
                    {user.is_admin && (
                      <Badge className="gap-1 text-xs">
                        <Shield className="h-3 w-3" />
                        管理者
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    登録日:{" "}
                    {new Date(user.created_at).toLocaleDateString("ja-JP")}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      推し {user.oshi_count}件
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      共感 {user.empathy_count}回
                    </span>
                  </div>
                </div>

                {/* ユーザーID（省略表示） */}
                <div className="hidden shrink-0 sm:block">
                  <p className="text-xs font-mono text-muted-foreground">
                    {user.id.slice(0, 8)}...
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
