/**
 * 開発中だけ有効にしたい機能のフラグ。
 * ビルド時に定数へ畳み込まれるので、本番バンドルからはデバッグ用のコードごと落ちる。
 */
export const IS_DEV = process.env.NODE_ENV !== "production";
