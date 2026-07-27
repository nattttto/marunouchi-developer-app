import type { Asset, Category, CategoryId, MultiplierTier } from "./types";

/**
 * 事業カテゴリと事業マスタ。バランス調整は基本このファイルだけで済むようにしてある。
 *
 * カテゴリ名はゲームとしての分かりやすさを優先した括りで、
 * 三菱地所の公式セグメント区分（コマーシャル不動産／住宅／海外／投資マネジメント／
 * 設計監理・不動産サービス）とは一致しない。
 */

export const CATEGORIES: Category[] = [
  { id: "office", name: "オフィス", shortName: "オフィス", color: "#688cbf" },
  { id: "retail", name: "商業・ホテル", shortName: "商業", color: "#c2764a" },
  { id: "residence", name: "住宅", shortName: "住宅", color: "#5f9e72" },
  { id: "infra", name: "インフラ・物流", shortName: "インフラ", color: "#8b96a3" },
  { id: "service", name: "設計・サービス", shortName: "設計", color: "#8f6fc9" },
  { id: "overseas", name: "海外", shortName: "海外", color: "#c2a04a" },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, Category>;

/**
 * 事業マスタ。コストの安い順に並べ、1つ前の事業を1件保有すると次が解放される。
 * 進行のゲートは実質コストが担っている。
 *
 * `color` はカテゴリごとに色系統を揃えてある（オフィス=青、商業・ホテル=橙、
 * 住宅=緑、インフラ=鋼、設計・サービス=紫、海外=金）。
 * スカイラインを見たときにどの事業が伸びているか分かるようにするため。
 */
export const ASSETS: Asset[] = [
  {
    id: "uchisaiwaicho",
    name: "内幸町ビル",
    categoryId: "office",
    baseCost: 15,
    costMultiplier: 1.15,
    baseProduction: 0.1,
    shape: "tower",
    color: "#3c4a63",
    heightRatio: 0.26,
    widthRatio: 0.9,
  },
  {
    id: "cm-business",
    name: "CM事業",
    categoryId: "service",
    baseCost: 60,
    costMultiplier: 1.15,
    baseProduction: 0.45,
    shape: "none",
    color: "#8f6fc9",
    heightRatio: 0,
    widthRatio: 0,
    unlockRequirement: { assetId: "uchisaiwaicho", count: 1 },
  },
  {
    id: "tokyo-building",
    name: "東京ビルディング",
    categoryId: "office",
    baseCost: 100,
    costMultiplier: 1.15,
    baseProduction: 0.8,
    shape: "tower",
    color: "#47597a",
    heightRatio: 0.36,
    widthRatio: 1.0,
    unlockRequirement: { assetId: "cm-business", count: 1 },
  },
  {
    id: "park-habio",
    name: "ザ・パークハビオ",
    categoryId: "residence",
    baseCost: 260,
    costMultiplier: 1.15,
    baseProduction: 2.2,
    shape: "midrise",
    color: "#5f9e72",
    heightRatio: 0.3,
    widthRatio: 1.0,
    unlockRequirement: { assetId: "tokyo-building", count: 1 },
  },
  {
    id: "mitsubishi-building",
    name: "三菱ビル",
    categoryId: "office",
    baseCost: 500,
    costMultiplier: 1.16,
    baseProduction: 4,
    shape: "tower",
    color: "#526a91",
    heightRatio: 0.45,
    widthRatio: 1.1,
    unlockRequirement: { assetId: "park-habio", count: 1 },
  },
  {
    id: "jec-design",
    name: "三菱地所設計",
    categoryId: "service",
    baseCost: 1_100,
    costMultiplier: 1.16,
    baseProduction: 9,
    shape: "none",
    color: "#a184d9",
    heightRatio: 0,
    widthRatio: 0,
    unlockRequirement: { assetId: "mitsubishi-building", count: 1 },
  },
  {
    id: "park-house",
    name: "ザ・パークハウス",
    categoryId: "residence",
    baseCost: 1_800,
    costMultiplier: 1.16,
    baseProduction: 14,
    shape: "midrise",
    color: "#45805a",
    heightRatio: 0.42,
    widthRatio: 1.1,
    unlockRequirement: { assetId: "jec-design", count: 1 },
  },
  {
    id: "otemachi-park",
    name: "大手町パークビルディング",
    categoryId: "office",
    baseCost: 3_000,
    costMultiplier: 1.16,
    baseProduction: 20,
    shape: "tower",
    color: "#5d7ba8",
    heightRatio: 0.57,
    widthRatio: 1.2,
    unlockRequirement: { assetId: "park-house", count: 1 },
  },
  {
    id: "logicross",
    name: "ロジクロス（物流施設）",
    categoryId: "infra",
    baseCost: 6_500,
    costMultiplier: 1.16,
    baseProduction: 42,
    shape: "lowrise",
    color: "#78838f",
    heightRatio: 0.14,
    widthRatio: 2.4,
    unlockRequirement: { assetId: "otemachi-park", count: 1 },
  },
  {
    id: "marunouchi-park",
    name: "丸の内パークビルディング",
    categoryId: "office",
    baseCost: 15_000,
    costMultiplier: 1.17,
    baseProduction: 100,
    shape: "tower",
    color: "#688cbf",
    heightRatio: 0.68,
    widthRatio: 1.2,
    unlockRequirement: { assetId: "logicross", count: 1 },
  },
  {
    id: "mark-is",
    name: "MARK IS みなとみらい",
    categoryId: "retail",
    baseCost: 32_000,
    costMultiplier: 1.17,
    baseProduction: 205,
    shape: "lowrise",
    color: "#c2764a",
    heightRatio: 0.3,
    widthRatio: 1.9,
    unlockRequirement: { assetId: "marunouchi-park", count: 1 },
  },
  {
    id: "shin-marubiru",
    name: "新丸ビル",
    categoryId: "office",
    baseCost: 80_000,
    costMultiplier: 1.18,
    baseProduction: 500,
    shape: "tower",
    color: "#739dd6",
    heightRatio: 0.79,
    widthRatio: 1.3,
    unlockRequirement: { assetId: "mark-is", count: 1 },
  },
  {
    id: "royal-park-hotel",
    name: "ロイヤルパークホテル",
    categoryId: "retail",
    baseCost: 170_000,
    costMultiplier: 1.18,
    baseProduction: 1_050,
    shape: "midrise",
    color: "#d89257",
    heightRatio: 0.62,
    widthRatio: 1.2,
    unlockRequirement: { assetId: "shin-marubiru", count: 1 },
  },
  {
    id: "marubiru",
    name: "丸ビル",
    categoryId: "office",
    baseCost: 400_000,
    costMultiplier: 1.19,
    baseProduction: 2_500,
    shape: "tower",
    color: "#86b0e3",
    heightRatio: 0.9,
    widthRatio: 1.35,
    unlockRequirement: { assetId: "royal-park-hotel", count: 1 },
  },
  {
    id: "gotemba-outlet",
    name: "御殿場プレミアム・アウトレット",
    categoryId: "retail",
    baseCost: 850_000,
    costMultiplier: 1.19,
    baseProduction: 5_200,
    shape: "lowrise",
    color: "#b3633c",
    heightRatio: 0.16,
    widthRatio: 2.2,
    unlockRequirement: { assetId: "marubiru", count: 1 },
  },
  {
    id: "otemachi-tower",
    name: "大手町タワー(EX)",
    categoryId: "office",
    baseCost: 2_000_000,
    costMultiplier: 1.2,
    baseProduction: 12_000,
    shape: "tower",
    color: "#9dc4f0",
    heightRatio: 1,
    widthRatio: 1.4,
    unlockRequirement: { assetId: "gotemba-outlet", count: 1 },
  },
  {
    id: "takamatsu-airport",
    name: "高松空港",
    categoryId: "infra",
    baseCost: 4_500_000,
    costMultiplier: 1.2,
    baseProduction: 27_000,
    shape: "airport",
    color: "#96a1ad",
    heightRatio: 0.1,
    widthRatio: 2.6,
    unlockRequirement: { assetId: "otemachi-tower", count: 1 },
  },
  {
    id: "property-management",
    name: "三菱地所プロパティマネジメント",
    categoryId: "service",
    baseCost: 11_000_000,
    costMultiplier: 1.2,
    baseProduction: 65_000,
    shape: "none",
    color: "#7a5cb0",
    heightRatio: 0,
    widthRatio: 0,
    unlockRequirement: { assetId: "takamatsu-airport", count: 1 },
  },
  {
    id: "ny-1251",
    name: "1251 Avenue of the Americas",
    categoryId: "overseas",
    baseCost: 26_000_000,
    costMultiplier: 1.21,
    baseProduction: 155_000,
    shape: "tower",
    color: "#c2a04a",
    heightRatio: 0.88,
    widthRatio: 1.35,
    unlockRequirement: { assetId: "property-management", count: 1 },
  },
  {
    id: "london-8bishopsgate",
    name: "8 Bishopsgate（ロンドン）",
    categoryId: "overseas",
    baseCost: 65_000_000,
    costMultiplier: 1.21,
    baseProduction: 380_000,
    shape: "tower",
    color: "#d4b45f",
    heightRatio: 0.94,
    widthRatio: 1.3,
    unlockRequirement: { assetId: "ny-1251", count: 1 },
  },
  {
    id: "asia-development",
    name: "アジア開発事業",
    categoryId: "overseas",
    baseCost: 160_000_000,
    costMultiplier: 1.22,
    baseProduction: 920_000,
    shape: "tower",
    color: "#ab8b38",
    heightRatio: 0.72,
    widthRatio: 1.25,
    unlockRequirement: { assetId: "london-8bishopsgate", count: 1 },
  },
];

/** 事業ID -> Asset の逆引き */
export const ASSET_MAP: Record<string, Asset> = Object.fromEntries(
  ASSETS.map((a) => [a.id, a])
);

/**
 * カテゴリ倍率。同カテゴリの合計保有数が増えると、そのカテゴリの生産量に掛かる。
 * しきい値の降順で持ち、最初に条件を満たしたものを採用する。
 */
export const CATEGORY_TIERS: MultiplierTier[] = [
  { threshold: 50, multiplier: 3 },
  { threshold: 30, multiplier: 2 },
  { threshold: 15, multiplier: 1.5 },
  { threshold: 5, multiplier: 1.25 },
];

/**
 * グループシナジー。保有しているカテゴリの「種類数」で全体の生産量に掛かる。
 * 一点集中より多角化のほうが最終的に強くなる、というバランスの根拠になっている。
 */
export const GROUP_SYNERGY_TIERS: MultiplierTier[] = [
  { threshold: 6, multiplier: 1.75 },
  { threshold: 5, multiplier: 1.5 },
  { threshold: 4, multiplier: 1.35 },
  { threshold: 3, multiplier: 1.2 },
  { threshold: 2, multiplier: 1.1 },
];

/** 「グループ展開率 100%」に必要な1事業あたりの保有数 */
export const GOAL_COUNT_PER_ASSET = 10;

/** スカイラインに描く1事業あたりの最大本数 */
export const MAX_SILHOUETTES_PER_ASSET = 4;

/**
 * スカイライン全体の最大本数。
 * 事業が21種に増えたので個別上限だけでは描画が潰れる。
 * 超過ぶんは下位の事業から間引き、上位の事業が前に出るようにしてある。
 */
export const MAX_TOTAL_SILHOUETTES = 40;

/** 何件保有するごとにスカイラインの描画本数を1本増やすか */
export const OWNED_PER_SILHOUETTE = 3;
