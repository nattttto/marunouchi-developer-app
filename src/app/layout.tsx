import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

// 角の丸いゴシック。生成りの配色とあわせて全体の当たりを柔らかくする。
// 日本語フォントはウェイトごとにサブセットが増えて重いので、実際に使う2種だけ読む。
const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "丸の内デベロッパー",
  description:
    "クリックして開発ポイントを稼ぎ、丸の内のビル群を建てていく放置クリッカーゲーム。",
};

export const viewport: Viewport = {
  themeColor: "#f7f3ec",
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
      <body className={`${zenMaruGothic.variable} antialiased`}>{children}</body>
    </html>
  );
}
