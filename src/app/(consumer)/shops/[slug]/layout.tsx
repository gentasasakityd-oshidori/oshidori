import type { Metadata } from "next";
import { getShopBySlug } from "@/lib/queries";

const SITE_URL = "https://oshidori.vercel.app";

/** ISR: 1時間ごとに再生成 */
export const revalidate = 3600;

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);

  if (!shop) {
    return {
      title: "お店が見つかりません",
      description: "お探しの飲食店は見つかりませんでした。",
    };
  }

  const mainStory = shop.stories[0];
  const description =
    mainStory?.summary ??
    shop.description ??
    `${shop.owner_name}が営む${shop.area}の${shop.category}「${shop.name}」のストーリー`;

  const ogImage = shop.image_url ?? undefined;
  const shopUrl = `${SITE_URL}/shops/${shop.slug}`;

  return {
    title: shop.name,
    description,
    openGraph: {
      title: `${shop.name} | オシドリ`,
      description,
      url: shopUrl,
      type: "article",
      ...(ogImage ? { images: [{ url: ogImage, alt: shop.name }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: `${shop.name} | オシドリ`,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    alternates: {
      canonical: shopUrl,
    },
  };
}

export default async function ShopDetailLayout({ params, children }: Props) {
  const { slug } = await params;
  const shop = await getShopBySlug(slug);

  // Schema.org Restaurant structured data
  const jsonLd = shop
    ? {
        "@context": "https://schema.org",
        "@type": "Restaurant",
        name: shop.name,
        description:
          shop.stories[0]?.summary ??
          shop.description ??
          `${shop.area}の${shop.category}`,
        url: `${SITE_URL}/shops/${shop.slug}`,
        ...(shop.image_url ? { image: shop.image_url } : {}),
        ...(shop.address
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: shop.address,
                addressLocality: shop.area,
                addressCountry: "JP",
              },
            }
          : {}),
        ...(shop.phone ? { telephone: shop.phone } : {}),
        ...(typeof shop.hours === "string"
          ? { openingHours: shop.hours }
          : {}),
        servesCuisine: shop.category,
        ...(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const s = shop as any;
          const bl = s.budget_label_dinner || s.budget_label_lunch;
          if (!bl) return {};
          return {
            priceRange: bl === "casual" ? "¥"
              : bl === "everyday" ? "¥¥"
              : bl === "weekend" ? "¥¥¥"
              : "¥¥¥¥",
          };
        })(),
        ...(shop._count.oshi + shop._count.empathy > 0
          ? {
              interactionStatistic: [
                {
                  "@type": "InteractionCounter",
                  interactionType: "https://schema.org/LikeAction",
                  userInteractionCount: shop._count.oshi,
                },
                {
                  "@type": "InteractionCounter",
                  interactionType: "https://schema.org/ReactAction",
                  userInteractionCount: shop._count.empathy,
                },
              ],
            }
          : {}),
        ...(shop.menus.length > 0
          ? {
              hasMenu: {
                "@type": "Menu",
                hasMenuSection: {
                  "@type": "MenuSection",
                  name: "食べてほしい一品",
                  hasMenuItem: shop.menus.slice(0, 5).map((menu) => ({
                    "@type": "MenuItem",
                    name: menu.name,
                    ...(menu.description
                      ? { description: menu.description }
                      : {}),
                    ...(menu.price
                      ? {
                          offers: {
                            "@type": "Offer",
                            price: String(menu.price),
                            priceCurrency: "JPY",
                          },
                        }
                      : {}),
                  })),
                },
              },
            }
          : {}),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
