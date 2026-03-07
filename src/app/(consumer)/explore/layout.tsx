import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お店を探す",
  description:
    "エリア・ジャンル・予算帯で、こだわりの飲食店を探そう。店主の想いが詰まったストーリーから、あなたの推し店が見つかります。",
  openGraph: {
    title: "お店を探す | オシドリ",
    description:
      "エリア・ジャンル・予算帯で、こだわりの飲食店を探そう。店主の想いが詰まったストーリーから、あなたの推し店が見つかります。",
    url: "https://oshidori.vercel.app/explore",
    type: "website",
  },
  alternates: {
    canonical: "https://oshidori.vercel.app/explore",
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
