/**
 * ゲーム全体で使う型定義。ここが唯一の正とする。
 */

/** 事業カテゴリのID */
export type CategoryId =
  | "office"
  | "retail"
  | "residence"
  | "infra"
  | "service"
  | "overseas";

/** 事業カテゴリ（オフィス、商業・ホテル、住宅…） */
export type Category = {
  id: CategoryId;
  /** 表示名 */
  name: string;
  /** タグやチップに使う代表色 */
  color: string;
};

/**
 * スカイラインでの描き方。
 * `none` はCM事業や投資マネジメントのような無形の事業で、収益だけ生んで描画されない。
 */
export type AssetShape = "tower" | "midrise" | "lowrise" | "airport" | "none";

/** 保有できる事業・施設1種類ぶんの静的データ（定数。実行中に変化しない） */
export type Asset = {
  /** 内部ID。セーブデータのキーになるので変更禁止 */
  id: string;
  /** 表示名 */
  name: string;
  /** 所属する事業カテゴリ。カテゴリ倍率の集計単位になる */
  categoryId: CategoryId;
  /** 0件保有時の取得コスト(PT) */
  baseCost: number;
  /** 1件取得するごとにコストへ掛かる倍率 */
  costMultiplier: number;
  /** 1件あたりの生産量(PT/s)。倍率がかかる前の素の値 */
  baseProduction: number;
  /** スカイラインでの描き方 */
  shape: AssetShape;
  /** スウォッチとスカイラインに使う色 */
  color: string;
  /** スカイライン描画時の高さ比（0〜1。エリア高さに対する割合） */
  heightRatio: number;
  /** スカイライン描画時の幅比（1.0 = 基準幅） */
  widthRatio: number;
  /** 解放条件。未指定なら最初から解放 */
  unlockRequirement?: {
    assetId: string;
    count: number;
  };
};

/** 保有数のしきい値と、そこで到達する倍率の対 */
export type MultiplierTier = {
  /** この数以上で `multiplier` に到達する */
  threshold: number;
  multiplier: number;
};

/** セーブ・復元されるゲーム状態のすべて */
export type GameState = {
  /** 所持PT */
  points: number;
  /** 累計獲得PT（実績・展開率の表示用） */
  totalEarned: number;
  /** 事業ID -> 保有数 */
  owned: Record<string, number>;
  /** 1クリックあたりの獲得量 */
  clickPower: number;
  /** 最終保存時刻(epoch ms)。オフライン収益の計算に使う */
  lastSavedAt: number;
};
