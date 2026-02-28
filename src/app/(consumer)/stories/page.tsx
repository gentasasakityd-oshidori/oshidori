import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPublishedStories } from "@/lib/queries";

export default async function StoriesPage() {
  const allStories = await getPublishedStories();

  return (
    <section className="px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ストーリー</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            飲食店オーナーの想いとこだわりが詰まったストーリー
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allStories.map((story) => (
            <Card
              key={story.id}
              className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="h-40 bg-gradient-to-br from-warm to-secondary" />
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {story.shop.area}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {story.shop.category}
                  </Badge>
                </div>
                <h3 className="mt-2 font-semibold leading-snug">
                  <Link
                    href={`/shops/${story.shop.slug}`}
                    className="hover:text-primary"
                  >
                    {story.title}
                  </Link>
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {story.shop.name} / {story.shop.owner_name}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {story.summary}
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    推し
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    共感
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
