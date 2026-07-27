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
CategoryStrip  … カテゴリ別の保有数と倍率。折り返し表示（狭い画面で2行）
ClickArea      … 着工エリア（クリック対象）。背景に Skyline
Shop           … 事業取得リスト。ここだけ縦スクロールする
```

`CategoryStrip` は**横スクロールにしない**。スクロールバーが出て見栄えが悪く、
隠れたカテゴリに気づけないため、`flex-wrap` で折り返して全6カテゴリを常に見せる。
幅を詰めるため帯の中では `Category.shortName`（「商業」「インフラ」「設計」）を使う。

クリックの手応えは、押している間だけ着工エリア全体がわずかに光る形（`group-active`）。
以前あったクレーンのイラストは削除済み。

### Key Files

| Path | Purpose |
|------|---------|
| `src/app/lib/types.ts` | **正となる型**：`Asset`, `Category`, `CategoryId`, `AssetShape`, `GameState` |
| `src/app/lib/assets.ts` | 事業マスタ（21種）・カテゴリ定義・倍率テーブル・バランス定数。数値調整は基本ここだけ |
| `src/app/lib/gameLogic.ts` | **計算の中心**：コスト・倍率・秒間収益・解放判定・展開率・表示フォーマット。React/DOM/localStorage に依存しない純粋関数のみ |
| `src/app/lib/saveData.ts` | localStorage の読み書きとオフライン収益の計算。**localStorage を触るのはここだけ** |
| `src/app/lib/env.ts` | `IS_DEV`（開発中だけ有効にする機能のフラグ） |
| `src/app/lib/cityScene.ts` | 保有状況から街の配置を組み立てる純粋関数。canvas に依存しない |
| `src/app/lib/cityRender.ts` | 街をドット絵として canvas に描く。色は CSS 変数から読む |
| `src/app/components/PixelCity.tsx` | 上2つを繋ぐ canvas コンポーネント |
| `src/app/hooks/useGame.ts` | `useReducer` による状態遷移＋ゲームループ＋自動セーブ＋導出値の計算 |
| `src/app/page.tsx` | 全体の組み立て |

型名は `Building` ではなく **`Asset`**。CM事業や投資マネジメントのような建物でない事業も
同じリストに載るため。ファイルも `assets.ts`（旧 `buildings.ts` は削除済み）。

### 状態管理

`GameState`（`points` / `totalEarned` / `owned` / `groundworkClicks` / `completions` /
`lastSavedAt`）が状態のすべてで、これがそのままセーブ形式になる。

**1クリックの獲得量は `GameState` に持たない。** 秒間収益から `getClickPower` で導出する。

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

### クリック収益と着工ゲージ

クリッカーで一番壊れやすいのは「放置収益が指数的に伸びて手動クリックが即座に無意味になる」点。
それを避けるための仕組みが2つ入っている。定数は `assets.ts`。

**1. クリック収益を経済に連動させる**

```
1クリックの獲得量 = BASE_CLICK_POWER + 秒間収益 × CLICK_RATE_SHARE   (= 1 + 秒間収益 × 2%)
```

固定値の加算だと指数的な放置収益に勝てないため、割合で連動させて
「常に秒間収益の数秒ぶん」の価値を保たせる。

**2. 着工ゲージ → 竣工ボーナス**

クリックするたび `groundworkClicks` が1増え、`getGroundworkGoal(completions)` に達すると
竣工ボーナスをまとめて加算してゲージをリセットし、`completions` を1増やす。
必要クリック数は竣工ごとに `GROUNDWORK_GOAL_GROWTH`（×1.15）で緩やかに増える。

```
竣工ボーナス = max(秒間収益 × COMPLETION_BONUS_SECONDS, 必要クリック数 × COMPLETION_BONUS_FLOOR_PER_CLICK)
```

**下限（第2項）が重要。** 秒間収益がまだ 0 に近い最序盤は第1項が 0 になり、
一番クリックしてほしい時間帯にボーナスが無意味になってしまう。

連打を強制するコンボ倍率系は入れていない（モバイルで指が疲れて離脱を招くため）。
クリック回数がそのまま進捗になる形にしてある。

竣工の演出は `ClickArea` 側で判定する。**props はクリック前の状態を持っているので、
`groundworkClicks + 1 >= groundworkGoal` でそのクリックが竣工かを事前に判定できる。**
reducer の結果を effect で監視する必要はない。

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

### Dev-only デバッグ機能

`lib/env.ts` の `IS_DEV`（`process.env.NODE_ENV !== "production"`）で制御する。
設定モーダルの「DEV ONLY」ブロックに2つのボタンがある。

- **全事業 +1（無料・解放）**：`devGrantAll` アクション。コストと解放条件を無視して全21事業を1件ずつ増やす。
  1回押せば全事業が解放され、押した回数ぶん保有数が積めるので、倍率のしきい値やスカイラインの確認に使える
- **PT +1兆**：`grant` アクションを再利用して所持PTを増やす

`IS_DEV` はビルド時に定数へ畳み込まれるので、本番バンドルからはこのブロックごと消える
（`.next/static` に「DEV ONLY」の文字列が残らないことを確認済み）。
`useGame` 側のコールバックも `IS_DEV` でガードしてある。

### 街の描画（ドット絵）

`PixelCity.tsx`（canvas）＋ `cityScene.ts`（配置＝純粋関数）＋ `cityRender.ts`（描画）の3層。
論理解像度を小さく取り、CSS 側で `image-rendering: pixelated` を当てて拡大するとドット絵になる。
**画像素材は使わない。** 事業の幅・高さ・形・色から手続き的に生成しているので、
事業を追加しても破綻しない。

配置の3原則（「街を育てている感」を出すための土台。崩さないこと）:

1. **間引かない。** 保有している事業はすべて街に出す。
   以前は上限を超えると下位の事業から間引いていたが、育てたものが消えるのは
   積み上げた感覚と真逆だった
2. **並べ替えない。** 区画は常に取得順（＝コストの安い順）で左から並ぶ。
   買うたびに街の形が変わると、同じ街を育てている感覚が持てない
3. **手前の列（`FRONT_ROW_CAPACITY` = 10）から溢れた下位の事業は、奥の列へ下げる。**
   消さずに奥行きへ逃がす。奥の列は幅・高さともに `BACK_SCALE` 倍で、
   色は空の色（`--color-sky-low`）へ寄せて遠くに見せる

**建物は保有数で育つ。** `getGrowthStage` が 5件で段階2（高さ×1.18＋アンテナ）、
10件で段階3（高さ×1.36＋屋上設備）を返す。本数が増えるだけでは投資した実感が薄いので、
建物そのものを育てるのが主役。加えて `getBackBuildingCount` が主棟の背後に副棟を重ね、
保有数の多さを密度でも見せる。

`Asset.shape` で描き分ける。

| shape | 見た目 | 例 |
|---|---|---|
| `tower` | 高く細い、窓の点グリッド | 丸ビル、1251 Avenue |
| `midrise` | 中層、窓の点グリッド | ザ・パークハウス、ロイヤルパークホテル |
| `lowrise` | 低く横長、横帯のファサード | 御殿場アウトレット、ロジクロス、CM事業 |
| `airport` | さらに低く横長＋管制塔1本 | 高松空港 |

**描画しない事業は作らない。** 無形のCM事業や設計も低層の事務所として街に出す。
買ったのに街に何も現れないのは達成感を削ぐため（以前は `shape: "none"` で描画対象外だった）。

`DECORATION_SPACE` は建物の上に空ける余白。アンテナや屋上設備は天面より上に描くので、
これが無いと一番高い事業の段階3で装飾が画面外に切れる（実際に切れていた）。

canvas の論理サイズは container の実寸から毎回決め直す。**初回は `ResizeObserver` を待たず
同期で測る。** ResizeObserver の通知はレンダリングステップで配信されるため、
タブが描画されていない状況では届かず、何も描画されないことがある（実際に踏んだ）。

### 数値バランス

すべて `assets.ts` に集約：

- 事業ごとの `baseCost` / `costMultiplier` / `baseProduction`
- `CATEGORY_TIERS` / `GROUP_SYNERGY_TIERS`（倍率のしきい値）
- `BASE_CLICK_POWER` / `CLICK_RATE_SHARE`（クリック収益）
- `GROUNDWORK_BASE_GOAL` / `GROUNDWORK_GOAL_GROWTH` / `COMPLETION_BONUS_SECONDS` /
  `COMPLETION_BONUS_FLOOR_PER_CLICK`（着工ゲージと竣工ボーナス）
- `GOAL_COUNT_PER_ASSET`（展開率100%に必要な1事業あたりの保有数 = 10）
- `GROWTH_STAGE_THRESHOLDS` / `FRONT_ROW_CAPACITY` / `MAX_BACK_BUILDINGS` /
  `OWNED_PER_BACK_BUILDING`（街の見せ方）

コストは `baseCost × costMultiplier ^ 保有数`（Cookie Clicker 方式）を `Math.ceil` した値。
`ASSETS` は**コストの安い順に並べる**（ショップの表示順がそのままこの順序）。
解放条件はいずれも「1つ前の事業を1件保有」で、進行のゲートは実質コストが担っている。

カテゴリ名はゲームとしての分かりやすさを優先した括りで、三菱地所の公式セグメント区分
（コマーシャル不動産／住宅／海外／投資マネジメント／設計監理・不動産サービス）とは一致しない。

### 表示フォーマット

`formatNumber()` は 1万未満をカンマ区切り、それ以上を 万/億/兆/京 に丸める。
倍率は `formatMultiplier()`（`×1.25` の数字部分）。
桁が変わるたびに数字がガタつかないよう、カウンター類には `.tabular`（`font-variant-numeric: tabular-nums`）を付ける。

### UI とテーマ

Tailwind CSS v4（`globals.css` の `@import "tailwindcss"` のみ。設定ファイルは無し）。
外部UIライブラリは `lucide-react` のみ。

**配色は `globals.css` の `@theme` に集約する。コンポーネントで色を直書きしない。**
`bg-canvas` `text-ink` `text-brick-ink` のようにユーティリティとして使えるので、
テーマを変えるときは原則この表だけ差し替える。

現在のテーマは「ソフトライト」：生成りの地（`canvas`）に、テラコッタ（`brick`＝主アクセント。
PT・コスト・ゲージ）とセージ（`sage`＝副アクセント。展開率・シナジー）。

塗り用と文字用を分けてある。`brick` は塗りと大きい数字用、`brick-ink` は小さい文字用で、
明るい地の上でコントラスト比 4.5:1 を確保できる明度にしてある。`ink-mute` も同様に
10〜11px のラベルで AA を満たす `#736c5e` に留めてあるので、これ以上明るくしないこと。

### フォント（自前ホスト。next/font は使わない）

Zen Maru Gothic は `public/fonts/zen-maru-gothic/` に woff2 を置き、
`public/fonts/zen-maru-gothic.css` の `@font-face` から参照している。
`layout.tsx` が `<link rel="stylesheet">` で読む。

**`next/font/google` に戻してはいけない。** 日本語フォントは unicode-range ごとに
244 個のスライスに分割されており、`next/font/google` はビルド時にその全部を
fonts.gstatic.com へ取りに行く。Vercel のビルドで 78 件が取得に失敗し、
Turbopack が `Module not found: '@vercel/turbopack-next/internal/font/google/font'`
として落とした（レート制限とみられる）。再試行しても再発した。
自前ホストにしてビルドを外部非依存にするのが唯一の恒久対策だった。

`import` せず `<link>` で読むのも意図的。この CSS は 212KB あり内容が変わらないので、
アプリの CSS バンドルに混ぜると更新のたびに再ダウンロードさせることになる。
別ファイルなら長期キャッシュが効く。ESLint の `@next/next/no-css-tags` は
この理由で個別に抑制してある。

ブラウザは 244 個すべてではなく、使っている文字を含むスライスだけ取得する
（実測で 33 ファイル・407KB。next/font のときと同じ挙動）。

**再生成手順**（ウェイトを変える・フォントを差し替えるとき）:

1. `https://fonts.googleapis.com/css2?family=...&display=swap` を
   **モダンブラウザの User-Agent で**取得する（UA を偽装しないと woff2 が返らない）
2. CSS 中の `https://fonts.gstatic.com/s/<family>/<version>/` を
   `/fonts/<family>/` へ置換し、`public/fonts/<family>.css` として保存
3. 元の URL の woff2 をすべて `public/fonts/<family>/` へダウンロード
4. ライセンス（OFL）を同じディレクトリに置く。再配布にあたるので必須

日本語フォントはウェイトごとにスライスが増える。Zen Maru Gothic は実際に使う
400 と 700 だけにしてある。`font-medium`(500) を使うとフォールバックするので注意。

`Asset.color` はカテゴリごとに色系統を揃えてある（オフィス=青灰、商業・ホテル=テラコッタ、
住宅=セージ、インフラ=石、設計・サービス=藤、海外=真鍮）。スカイラインを見てどの事業が
伸びているか分かるようにするため。`Category.color` はタグとチップ用の代表色。

**明るい背景なので、上位の事業ほど濃い色にしてある。** 暗いテーマに戻すときは明度の向きを
反転させること。同じ理由で、スカイラインの窓は「光る点」ではなく「暗く落ちる点」
（`Skyline.tsx` の `WINDOW_GRID`）。

ショップのスウォッチは事業色をそのまま敷くと白抜き文字が読めないので、`color-mix` で
淡い塗り・濃い文字に振り分けている。一番淡い事業色でも 6.9:1 を確保している。

アニメーション（`+N` のフローティング・地平線の陽の揺らぎ）は `globals.css` の
`@keyframes` に置いてある。`prefers-reduced-motion: reduce` で無効化する分岐も同ファイル内にある。

## 未実装（後日拡張の想定）

- 購入型のアップグレード。クリック収益は経済連動なので、固定値の加算ではなく
  `CLICK_RATE_SHARE` の係数を上げる形にしないと機能しない
- ゴールデンクッキー相当のランダム出現ボーナス（一時バフ）
- オンラインランキング、実績/バッジ、サウンド
- 複数購入（x10 / max）
