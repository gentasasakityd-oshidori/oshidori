import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Noto_Sans_JP } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const SITE_URL = "https://oshidori.vercel.app";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f97316",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "オシドリ | こだわりの飲食店と出会う",
    template: "%s | オシドリ",
  },
  description:
    '飲食人の"好き"と"こだわり"が、お客さんの共感を通じて価値になる。飲食店と消費者の新しい関係をつくるプラットフォーム。',
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "オシドリ",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "オシドリ",
      url: SITE_URL,
      description:
        "飲食人の想いと消費者の共感をつなぐプラットフォーム",
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "オシドリ",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/explore?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ];

  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body className={`${notoSansJP.variable} font-sans antialiased`}>
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
