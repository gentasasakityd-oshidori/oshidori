"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Utensils } from "lucide-react";

export type MenuSearchResult = {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  photo_url: string | null;
  kodawari_text: string | null;
  kodawari_tags: string[] | null;
  key_ingredients: string[] | null;
  menu_story: string | null;
  shop: {
    slug: string;
    name: string;
    area: string;
    category: string;
    image_url: string | null;
  };
};

export function MenuCard({ menu }: { menu: MenuSearchResult }) {
  const imageUrl = menu.photo_url || menu.shop.image_url || "/placeholder-menu.png";

  return (
    <Link
      href={`/shops/${menu.shop.slug}`}
      className="group block overflow-hidden rounded-xl border bg-white transition-all hover:shadow-md hover:border-primary/30"
    >
      {/* 画像 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        <Image
          src={imageUrl}
          alt={menu.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {menu.price != null && (
          <div className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2.5 py-1 text-sm font-bold text-[#E06A4E] shadow-sm backdrop-blur-sm">
            ¥{menu.price.toLocaleString()}
          </div>
        )}
      </div>

      {/* コンテンツ */}
      <div className="p-3">
        <h3 className="text-sm font-bold text-[#2C3E50] line-clamp-1">
          {menu.name}
        </h3>

        {/* こだわりタグ */}
        {menu.kodawari_tags && Array.isArray(menu.kodawari_tags) && menu.kodawari_tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(menu.kodawari_tags as string[]).slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-full bg-orange-50 px-1.5 py-0.5 text-[10px] text-[#E06A4E]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 説明（1行） */}
        {(menu.kodawari_text || menu.description) && (
          <p className="mt-1 text-xs text-gray-500 line-clamp-1">
            {menu.kodawari_text || menu.description}
          </p>
        )}

        {/* 店名 + エリア */}
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
          <Utensils className="h-3 w-3 shrink-0" />
          <span className="truncate font-medium">{menu.shop.name}</span>
          <span className="shrink-0">·</span>
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{menu.shop.area}</span>
        </div>
      </div>
    </Link>
  );
}
