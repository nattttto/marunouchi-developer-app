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

三菱地所グループの多角事業（オフィス／商業・ホテル／住宅／インフラ・物流／設計・サービス／海外）
を21種の「事業」として保有していくのがテーマ。

### 画面構成

縦1画面（`h-[100dvh]`）を4段に分けた固定レイアウト。ページ全体はスクロールしない。

```
Hud            … 所持PT / 秒間収益 / グループシナジー / グループ展開率 / 設定ボタン
CategoryStrip  … カテゴリ別の保有数と倍率。ここだけ横スクロールする
ClickArea      … 着工エリア（クリック対象）。背景に Skyline、手前にクレーン
Shop           … 事業取得リスト。ここだけ縦スクロールする
```

### Key Files

| Path | Purpose |
|------|---------|
| `src/app/lib/types.ts` | **正となる型**：`Asset`, `Category`, `CategoryId`, `AssetShape`, `GameState` |
| `src/app/lib/assets.ts` | 事業マスタ（21種）・カテゴリ定義・倍率テーブル・バランス定数。数値調整は基本ここだけ |
| `src/app/lib/gameLogic.ts` | **計算の中心**：コスト・倍率・秒間収益・解放判定・展開率・表示フォーマット。React/DOM/localStorage に依存しない純粋関数のみ |
| `src/app/lib/saveData.ts` | localStorage の読み書きとオフライン収益の計算。**localStorage を触るのはここだけ** |
| `src/app/hooks/useGame.ts` | `useReducer` による状態遷移＋ゲームループ＋自動セーブ＋導出値の計算 |
| `src/app/page.tsx` | 全体の組み立て |

型名は `Building` ではなく **`Asset`**。CM事業や投資マネジメントのような建物でない事業も
同じリストに載るため。ファイルも `assets.ts`（旧 `buildings.ts` は削除済み）。

### 状態管理

`GameState`（`points` / `totalEarned` / `owned` / `clickPower` / `lastSavedAt`）が状態のすべてで、
これがそのままセーブ形式になる。

- 状態遷移は `useGame.ts` の `reducer` に集約。`click` / `buy` / `tick` / `grant` / `load` / `reset` の6アクションのみ
- reducer は純粋関数。**購入の可否判定（解放済みか・PTが足りるか）も reducer 内で必ず再チェックする**。
  UI の disabled はあくまで見た目で、それだけを信頼しない
- 保有数から求まる値（コスト・解放状態・倍率・実効生産量・秒間収益）は state に持たず、
  `useGame` の `derived`（`useMemo`）で `owned` から導出する。二重管理でズレるのを防ぐため
- **倍率は1回だけ計算して使い回す**。21事業ぶん個別に再計算しない

### 生産量の倍率（カテゴリ倍率とグループシナジー）

素の生産量に2種類の倍率が掛かる。定義は `assets.ts` の `CATEGORY_TIERS` / `GROUP_SYNERGY_TIERS`。

- **カテゴリ倍率**：同カテゴリの合計保有数で決まり、そのカテゴリの事業にだけ掛かる（5件 ×1.25 → 15件 ×1.5 → 30件 ×2 → 50件 ×3）
- **グループシナジー**：1件以上保有している**カテゴリの種類数**で決まり、全体に掛かる（2種 ×1.1 → 6種 ×1.75）

```
実効生産量 = baseProduction × カテゴリ倍率 × グループシナジー
秒間収益   = Σ (保有数 × 実効生産量)
```

しきい値テーブルは**降順**で持ち、`resolveTier` が最初に条件を満たしたものを採用する。
順序を崩すと低いほうの倍率が先に当たってしまうので、追加時は降順を維持すること。

ショップの表示は素の値ではなく**実効値**に揃えてある（倍率が効いていることが分かるように）。

### ゲームループ

`setInterval(100ms)` で `Date.now()` の差分を取り、`tick` に経過秒数を渡す。
固定値ではなく実時間の差分を使うので、タブが非アクティブになって間引かれても収益を取りこぼさない。

### セーブとオフライン収益

- 保存キーは `marunouchi-developer:save:v1`。**セーブ形式を壊す変更をしたら v2 に上げる**
- 自動セーブは5秒ごと＋`visibilitychange`(hidden)＋`pagehide`＋アンマウント時
- 読み込み時は `normalize()` を必ず通す。知らない事業IDは捨て、足りないIDは0で埋めるので、
  **事業マスタを増減してもセーブデータが壊れない**（8種→21種の拡張も無改修で移行できた）。
  壊れた JSON は黙って捨てて新規スタートさせる
- オフライン収益 = 「保存時の保有数から求めた秒間収益」×「経過秒数」。
  倍率も含む（`getTotalRate` を通すので表示と実際の加算が食い違わない）。
  上限は `MAX_OFFLINE_SECONDS`（8時間）
- SSR との食い違いを避けるため、`loaded` が true になるまでゲーム本体を描画しない

**`isUnlocked` は「1件以上保有していれば常に解放済み」を先に判定する。**
解放条件の並びを変えたとき、旧セーブで「保有しているのにロック表示になり保有数が消えて見える」
状態を防ぐため（実際に起きた不具合）。

### スカイライン描画

`Asset.shape` で描き分ける。

| shape | 見た目 | 例 |
|---|---|---|
| `tower` | 高く細い、窓の点グリッド | 丸ビル、1251 Avenue |
| `midrise` | 中層、窓の点グリッド | ザ・パークハウス、ロイヤルパークホテル |
| `lowrise` | 低く横長、横帯のファサード | 御殿場アウトレット、ロジクロス |
| `airport` | さらに低く横長＋管制塔1本 | 高松空港 |
| `none` | **描画しない**（収益のみ） | CM事業、プロパティマネジメント |

事業が21種あるため、個別上限（`MAX_SILHOUETTES_PER_ASSET`）だけでは横に潰れる。
**上位（コストの高い）事業から積んで `MAX_TOTAL_SILHOUETTES` で打ち切る**ので、
下位の事業は自然に消えて主力事業が前に出る。並びは左右交互に振って中央が高い山型にしている。

### 数値バランス

すべて `assets.ts` に集約：

- 事業ごとの `baseCost` / `costMultiplier` / `baseProduction`
- `CATEGORY_TIERS` / `GROUP_SYNERGY_TIERS`（倍率のしきい値）
- `GOAL_COUNT_PER_ASSET`（展開率100%に必要な1事業あたりの保有数 = 10）
- `OWNED_PER_SILHOUETTE` / `MAX_SILHOUETTES_PER_ASSET` / `MAX_TOTAL_SILHOUETTES`

コストは `baseCost × costMultiplier ^ 保有数`（Cookie Clicker 方式）を `Math.ceil` した値。
`ASSETS` は**コストの安い順に並べる**（ショップの表示順がそのままこの順序）。
解放条件はいずれも「1つ前の事業を1件保有」で、進行のゲートは実質コストが担っている。

カテゴリ名はゲームとしての分かりやすさを優先した括りで、三菱地所の公式セグメント区分
（コマーシャル不動産／住宅／海外／投資マネジメント／設計監理・不動産サービス）とは一致しない。

### 表示フォーマット

`formatNumber()` は 1万未満をカンマ区切り、それ以上を 万/億/兆/京 に丸める。
倍率は `formatMultiplier()`（`×1.25` の数字部分）。
桁が変わるたびに数字がガタつかないよう、カウンター類には `.tabular`（`font-variant-numeric: tabular-nums`）を付ける。

### UI

Tailwind CSS v4（`globals.css` の `@import "tailwindcss"` のみ。設定ファイルは無し）。
ダークテーマ固定。外部UIライブラリは `lucide-react` のみ。

`Asset.color` はカテゴリごとに色系統を揃えてある（オフィス=青、商業・ホテル=橙、住宅=緑、
インフラ=鋼、設計・サービス=紫、海外=金）。スカイラインを見てどの事業が伸びているか
分かるようにするため。`Category.color` はタグとチップ用の代表色。

アニメーション（クレーンの揺れ・`+N` のフローティング・夜景の明滅）は `globals.css` の
`@keyframes` に置いてある。`prefers-reduced-motion: reduce` で無効化する分岐も同ファイル内にある。

## 未実装（後日拡張の想定）

- アップグレード（クリック収益・事業ごとの生産倍率）。`GameState.clickPower` は器だけ用意済み
- オンラインランキング、実績/バッジ、サウンド
- 複数購入（x10 / max）
