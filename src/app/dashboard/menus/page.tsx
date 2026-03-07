"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Edit2,
  Sparkles,
  UtensilsCrossed,
  MessageCircle,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type MenuRow = {
  id: string;
  shop_id: string;
  name: string;
  price: number | null;
  description: string | null;
  photo_url: string | null;
  owner_message: string | null;
  kodawari_text: string | null;
  eating_tip: string | null;
  kodawari_tags: string[] | null;
  is_ai_generated: boolean;
  created_at: string;
};

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editKodawari, setEditKodawari] = useState("");
  const [editTip, setEditTip] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard/menus");
        if (!res.ok) {
          setError(res.status === 401 ? "ログインが必要です" : "データの読み込みに失敗しました");
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setMenus(data.menus ?? []);
      } catch {
        setError("ネットワークエラーが発生しました");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  function startEdit(menu: MenuRow) {
    setEditingId(menu.id);
    setEditName(menu.name);
    setEditPrice(menu.price?.toString() ?? "");
    setEditDesc(menu.description ?? "");
    setEditMessage(menu.owner_message ?? "");
    setEditKodawari(menu.kodawari_text ?? "");
    setEditTip(menu.eating_tip ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/dashboard/menus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_id: editingId,
          name: editName,
          price: editPrice ? parseInt(editPrice) : null,
          description: editDesc || null,
          owner_message: editMessage || null,
          kodawari_text: editKodawari || null,
          eating_tip: editTip || null,
        }),
      });
      if (!res.ok) {
        setError("メニューの保存に失敗しました");
        setIsSaving(false);
        return;
      }
      const data = await res.json();
      setMenus((prev) =>
        prev.map((m) => (m.id === editingId ? (data.menu as MenuRow) : m))
      );
      setEditingId(null);
    } catch {
      setError("ネットワークエラーが発生しました");
    }
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ページタイトル */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">食べてほしい一品</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AIインタビューから生成された「おすすめの一品」を管理できます
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/interview">
            <Plus className="h-4 w-4" />
            一品を追加
          </Link>
        </Button>
      </div>

      {/* エラー表示 */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* 説明カード */}
      <Card className="border-primary/20 bg-warm">
        <CardContent className="flex items-start gap-3 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">
              AIインタビューから自動生成されます
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              インタビューの「食べてほしい一品」フェーズでお話しいただいた内容から、あなたの想いを込めたメニュー紹介を自動で作成します。手動で編集することもできます。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 一品リスト */}
      {menus.length > 0 ? (
        <div className="space-y-4">
          {menus.map((menu) => (
            <Card key={menu.id} className="overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-primary/60 to-primary/20" />
              <CardContent className="p-4">
                {editingId === menu.id ? (
                  /* 編集モード */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary">
                        メニューを編集
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="mr-1 h-3 w-3" />
                        キャンセル
                      </Button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="edit-menu-name" className="text-xs font-medium text-muted-foreground">
                          メニュー名
                        </label>
                        <input
                          id="edit-menu-name"
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor="edit-menu-price" className="text-xs font-medium text-muted-foreground">
                          価格（円）
                        </label>
                        <input
                          id="edit-menu-price"
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          placeholder="例: 1200"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="edit-menu-desc" className="text-xs font-medium text-muted-foreground">
                        説明
                      </label>
                      <input
                        id="edit-menu-desc"
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-menu-message" className="text-xs font-medium text-muted-foreground">
                        店主のことば
                      </label>
                      <Textarea
                        id="edit-menu-message"
                        className="mt-1 min-h-[80px]"
                        value={editMessage}
                        onChange={(e) => setEditMessage(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-menu-kodawari" className="text-xs font-medium text-muted-foreground">
                        こだわり
                      </label>
                      <Textarea
                        id="edit-menu-kodawari"
                        className="mt-1 min-h-[60px]"
                        value={editKodawari}
                        onChange={(e) => setEditKodawari(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="edit-menu-tip" className="text-xs font-medium text-muted-foreground">
                        おいしい食べ方
                      </label>
                      <input
                        id="edit-menu-tip"
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                        value={editTip}
                        onChange={(e) => setEditTip(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={saveEdit} disabled={isSaving}>
                        {isSaving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        保存する
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* 表示モード */
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">{menu.name}</h3>
                          <Badge
                            variant={
                              menu.is_ai_generated ? "default" : "outline"
                            }
                            className="text-xs"
                          >
                            {menu.is_ai_generated ? (
                              <>
                                <Sparkles className="mr-1 h-3 w-3" />
                                AI生成
                              </>
                            ) : (
                              "手動追加"
                            )}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-3">
                          {menu.price && (
                            <span className="text-sm font-medium text-primary">
                              ¥{menu.price.toLocaleString()}
                            </span>
                          )}
                          {menu.description && (
                            <span className="text-xs text-muted-foreground">
                              {menu.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => startEdit(menu)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* オーナーメッセージ */}
                    {menu.owner_message && (
                      <div className="mt-3 rounded-lg border border-primary/10 bg-warm p-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <MessageCircle className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-medium text-primary">
                            お客さまに届くメッセージ
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/85">
                          {menu.owner_message}
                        </p>
                      </div>
                    )}

                    {/* こだわり・食べ方 */}
                    {(menu.kodawari_text || menu.eating_tip) && (
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {menu.kodawari_text && (
                          <span>
                            <strong>こだわり:</strong> {menu.kodawari_text}
                          </span>
                        )}
                        {menu.eating_tip && (
                          <span>
                            <strong>食べ方:</strong> {menu.eating_tip}
                          </span>
                        )}
                      </div>
                    )}

                    {/* タグ */}
                    {menu.kodawari_tags &&
                      (menu.kodawari_tags as string[]).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(menu.kodawari_tags as string[]).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 font-medium">
              まだ「食べてほしい一品」がありません
            </p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              AIインタビューを受けると、お話の中から自動で生成されます
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/interview">AIインタビューを受ける</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
