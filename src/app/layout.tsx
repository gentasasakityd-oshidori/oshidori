import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "オシドリ | 推しの飲食店と出会う",
    template: "%s | オシドリ",
  },
  description:
    '飲食人の"好き"と"こだわり"が、お客さんの共感を通じて価値になる。飲食店と消費者の新しい関係をつくるプラットフォーム。',
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "オシドリ",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJP.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
