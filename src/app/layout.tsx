import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "丸の内デベロッパー",
  description:
    "クリックして開発ポイントを稼ぎ、丸の内のビル群を建てていく放置クリッカーゲーム。",
};

export const viewport: Viewport = {
  themeColor: "#070c18",
  // 連打時の意図しないピンチズームを防ぐ
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${notoSansJp.variable} antialiased`}>{children}</body>
    </html>
  );
}
