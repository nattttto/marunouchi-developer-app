# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # 開発サーバー (Turbopack, http://localhost:3000)
npm run build      # 本番ビルド
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

テストフレームワークは未導入。

## Architecture

**Next.js 15 App Router** の単一画面クリッカーゲーム。サーバー・DB・認証は一切使わず、
進行状況は `localStorage` にのみ保存する。ページは `/` の1本だけ。

### 画面構成

縦1画面（`h-[100dvh]`）を3段に分けた固定レイアウト。ページ全体はスクロールしない。

```
Hud        … 所持PT / 秒間収益 / 丸の内開発率 / 設定ボタン
ClickArea  … 着工エリア（クリック対象）。背景に Skyline、手前にクレーン
Shop       … 建物購入リスト。ここだけ縦スクロールする
```

### Key Files

| Path | Purpose |
|------|---------|
| `src/app/lib/types.ts` | **正となる型**：`Building`, `GameState` |
| `src/app/lib/buildings.ts` | 建物マスタ（8種）とバランス定数。数値調整は基本ここだけ |
| `src/app/lib/gameLogic.ts` | **計算の中心**：コスト・秒間収益・解放判定・開発率・表示フォーマット。React/DOM/localStorage に依存しない純粋関数のみ |
| `src/app/lib/saveData.ts` | localStorage の読み書きとオフライン収益の計算。**localStorage を触るのはここだけ** |
| `src/app/hooks/useGame.ts` | `useReducer` による状態遷移＋ゲームループ＋自動セーブ |
| `src/app/page.tsx` | 全体の組み立て |

### 状態管理

`GameState`（`points` / `totalEarned` / `owned` / `clickPower` / `lastSavedAt`）が状態のすべてで、
これがそのままセーブ形式になる。

- 状態遷移は `useGame.ts` の `reducer` に集約。`click` / `buy` / `tick` / `grant` / `load` / `reset` の6アクションのみ
- reducer は純粋関数。**購入の可否判定（解放済みか・PTが足りるか）も reducer 内で必ず再チェックする**。
  UI の disabled はあくまで見た目で、それだけを信頼しない
- 保有数から求まる値（コスト・解放状態・秒間収益）は state に持たず、`useMemo` で `owned` から導出する。
  二重管理でズレるのを防ぐため

### ゲームループ

`setInterval(100ms)` で `Date.now()` の差分を取り、`tick` に経過秒数を渡す。
固定値ではなく実時間の差分を使うので、タブが非アクティブになって間引かれても収益を取りこぼさない。

### セーブとオフライン収益

- 保存キーは `marunouchi-developer:save:v1`。**セーブ形式を壊す変更をしたら v2 に上げる**
- 自動セーブは5秒ごと＋`visibilitychange`(hidden)＋`pagehide`＋アンマウント時
- 読み込み時は `normalize()` を必ず通す。知らない建物IDは捨て、足りないIDは0で埋めるので、
  建物マスタを増減してもセーブデータが壊れない。壊れた JSON は黙って捨てて新規スタートさせる
- オフライン収益 = 「保存時の保有数から求めた秒間収益」×「経過秒数」。
  上限は `MAX_OFFLINE_SECONDS`（8時間）。放置し続けても頭打ちにするためのバランス調整点
- SSR との食い違いを避けるため、`loaded` が true になるまでゲーム本体を描画しない

### 数値バランス

すべて `buildings.ts` に集約：

- 建物ごとの `baseCost` / `costMultiplier` / `baseProduction`
- `GOAL_COUNT_PER_BUILDING`（開発率100%に必要な1種あたりの保有数 = 10）
- `OWNED_PER_SILHOUETTE` / `MAX_SILHOUETTES_PER_BUILDING`（スカイライン描画の密度と上限）

コストは `baseCost × costMultiplier ^ 保有数`（Cookie Clicker 方式）を `Math.ceil` した値。
解放条件はいずれも「1つ前の建物を1棟保有」で、進行のゲートは実質コストが担っている。

### 表示フォーマット

`formatNumber()` は 1万未満をカンマ区切り、それ以上を 万/億/兆/京 に丸める。
桁が変わるたびに数字がガタつかないよう、カウンター類には `.tabular`（`font-variant-numeric: tabular-nums`）を付ける。

### UI

Tailwind CSS v4（`globals.css` の `@import "tailwindcss"` のみ。設定ファイルは無し）。
ダークテーマ固定。外部UIライブラリは `lucide-react` のみ。

アニメーション（クレーンの揺れ・`+N` のフローティング・夜景の明滅）は `globals.css` の
`@keyframes` に置いてある。`prefers-reduced-motion: reduce` で無効化する分岐も同ファイル内にある。

## 未実装（後日拡張の想定）

- アップグレード（クリック収益・建物ごとの生産倍率）。`GameState.clickPower` は器だけ用意済み
- オンラインランキング、実績/バッジ、サウンド
- 複数購入（x10 / max）
