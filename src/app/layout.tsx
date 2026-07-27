import type { Metadata, Viewport } from "next";
import "./globals.css";

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
      <body className="antialiased">
        {/*
          Zen Maru Gothic は public/fonts に自前ホストしている。
          next/font/google はビルド時に Google から 244 個のスライスを取りに行き、
          Vercel のビルドで取得に失敗して落ちたため使わない（CLAUDE.md 参照）。

          import せず link で読むのは意図的。この CSS は 212KB あるうえ内容が変わらないので、
          アプリの CSS バンドルに混ぜると更新のたびに再ダウンロードさせることになる。
          別ファイルなら長期キャッシュが効く。React が <head> へ巻き上げる。
        */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link
          rel="stylesheet"
          href="/fonts/zen-maru-gothic.css"
          precedence="high"
        />
        {children}
      </body>
    </html>
  );
}
