import type { MetadataRoute } from "next";
import { getPublishedShops } from "@/lib/queries";

const SITE_URL = "https://oshidori.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/home`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/stories`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/for-shops`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  // Dynamic shop pages
  let shopPages: MetadataRoute.Sitemap = [];
  try {
    const shops = await getPublishedShops();
    shopPages = shops.map((shop) => ({
      url: `${SITE_URL}/shops/${shop.slug}`,
      lastModified: new Date(shop.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Supabase unavailable - return static pages only
  }

  return [...staticPages, ...shopPages];
}
