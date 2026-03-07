"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, Shield, Store, Loader2, User, Mail, Clock, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AdminUser = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  is_admin: boolean;
  role: string;
  created_at: string;
  email: string | null;
  last_sign_in_at: string | null;
  provider: string;
  oshi_count: number;
  empathy_count: number;
};

const ROLE_LABELS: Record<string, { label: string; icon: typeof User; color: string }> = {
  consumer: { label: "生活者", icon: User, color: "bg-gray-100 text-gray-700" },
  shop_owner: { label: "店舗", icon: Store, color: "bg-blue-100 text-blue-700" },
  admin: { label: "管理者", icon: Shield, color: "bg-purple-100 text-purple-700" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return "未ログイン";
  return new Date(dateStr).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function providerLabel(provider: string) {
  switch (provider) {
    case "google": return "Google";
    case "email": return "メール";
    case "github": return "GitHub";
    default: return provider;
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

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

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`このユーザーの権限を「${ROLE_LABELS[newRole]?.label}」に変更しますか？`)) {
      return;
    }
    setUpdatingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, role: newRole, is_admin: newRole === "admin" }
              : u
          )
        );
      }
    } catch {
      // Ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const effectiveRole = user.is_admin ? "admin" : (user.role || "consumer");
    const matchesRole = roleFilter === "all" || effectiveRole === roleFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      user.nickname.toLowerCase().includes(q) ||
      (user.email?.toLowerCase().includes(q) ?? false) ||
      user.id.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            登録ユーザーの一覧と権限管理
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {filteredUsers.length}/{users.length}ユーザー
        </Badge>
      </div>

      {/* フィルター */}
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="名前・メール・IDで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て</SelectItem>
            <SelectItem value="consumer">生活者</SelectItem>
            <SelectItem value="shop_owner">店舗</SelectItem>
            <SelectItem value="admin">管理者</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredUsers.map((user) => {
            const effectiveRole = user.is_admin ? "admin" : (user.role || "consumer");
            const roleInfo = ROLE_LABELS[effectiveRole] || ROLE_LABELS.consumer;
            return (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* アバター */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                      {user.nickname?.[0] ?? "?"}
                    </div>

                    {/* ユーザー情報 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{user.nickname}</h3>
                        <Badge className={`gap-1 text-xs ${roleInfo.color}`}>
                          <roleInfo.icon className="h-3 w-3" />
                          {roleInfo.label}
                        </Badge>
                      </div>

                      {/* メールアドレス */}
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{user.email ?? "メール未設定"}</span>
                      </div>

                      {/* ID */}
                      <div className="mt-0.5 text-[10px] font-mono text-muted-foreground/60">
                        ID: {user.id.slice(0, 8)}...
                      </div>

                      {/* 詳細情報グリッド */}
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          登録: {formatDate(user.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          最終ログイン: {formatDateTime(user.last_sign_in_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          推し店 {user.oshi_count}件
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          共感 {user.empathy_count}回
                        </span>
                      </div>

                      {/* 認証方法 */}
                      <div className="mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {providerLabel(user.provider)}認証
                        </Badge>
                      </div>
                    </div>

                    {/* 権限変更 */}
                    <div className="shrink-0">
                      <Select
                        value={effectiveRole}
                        onValueChange={(v) => handleRoleChange(user.id, v)}
                        disabled={updatingId === user.id}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consumer">生活者</SelectItem>
                          <SelectItem value="shop_owner">店舗</SelectItem>
                          <SelectItem value="admin">管理者</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              条件に合うユーザーが見つかりません
            </div>
          )}
        </div>
      )}
    </div>
  );
}
