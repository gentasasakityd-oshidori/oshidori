"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Recommendation = {
  id: string;
  reason: string;
  shop: {
    name: string;
    slug: string;
    image_url: string;
    area: string;
    category: string;
  };
};

type Props = {
  recommendations: Recommendation[];
};

export function DailyRecommendation({ recommendations }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          今日のおすすめ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {recommendations.map((rec) => (
            <Link
              key={rec.id}
              href={`/shops/${rec.shop.slug}`}
              className="flex shrink-0 items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-accent"
              style={{ minWidth: "200px" }}
            >
              {rec.shop.image_url ? (
                <Image
                  src={rec.shop.image_url}
                  alt={rec.shop.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                  {rec.shop.name[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{rec.shop.name}</p>
                <p className="text-xs text-muted-foreground">{rec.shop.area}</p>
                {rec.reason && (
                  <p className="mt-0.5 text-xs text-primary line-clamp-1">{rec.reason}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
