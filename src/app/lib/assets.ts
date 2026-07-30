import type {
  Asset,
  Category,
  CategoryId,
  MapStage,
  MultiplierTier,
} from "./types";

/**
 * 事業カテゴリと事業マスタ。バランス調整は基本このファイルだけで済むようにしてある。
 *
 * カテゴリ名はゲームとしての分かりやすさを優先した括りで、
 * 三菱地所の公式セグメント区分（コマーシャル不動産／住宅／海外／投資マネジメント／
 * 設計監理・不動産サービス）とは一致しない。
 */

export const CATEGORIES: Category[] = [
  { id: "office", name: "オフィス", shortName: "オフィス", color: "#667d97" },
  { id: "retail", name: "商業・ホテル", shortName: "商業", color: "#c0684d" },
  { id: "residence", name: "住宅", shortName: "住宅", color: "#6e8f72" },
  { id: "infra", name: "インフラ・物流", shortName: "インフラ", color: "#918977" },
  { id: "service", name: "設計・サービス", shortName: "設計", color: "#977896" },
  { id: "overseas", name: "海外", shortName: "海外", color: "#ae8c4a" },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, Category>;

/**
 * 事業マスタ。コストの安い順に並べ、1つ前の事業を1件保有すると次が解放される。
 * 進行のゲートは実質コストが担っている。
 *
 * `color` はカテゴリごとに色系統を揃えてある（オフィス=青灰、商業・ホテル=テラコッタ、
 * 住宅=セージ、インフラ=石、設計・サービス=藤、海外=真鍮）。
 * マップを見たときにどの事業が伸びているか色で分かるようにするため。
 *
 * **明るい背景の上に描くので、上位の事業ほど濃い色にしてある。**
 * 暗い背景のときとは明度の向きが逆なので、テーマを変えるときは合わせて反転させること。
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
    color: "#a9b4c2",
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
    shape: "lowrise",
    color: "#a98ba8",
    heightRatio: 0.1,
    widthRatio: 1.6,
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
    color: "#98a6b8",
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
    color: "#8fae8c",
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
    color: "#8798ad",
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
    shape: "lowrise",
    color: "#977896",
    heightRatio: 0.16,
    widthRatio: 1.7,
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
    color: "#6e8f72",
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
    color: "#768aa2",
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
    color: "#a8a093",
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
    color: "#667d97",
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
    color: "#c0684d",
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
    color: "#56708c",
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
    color: "#c98a6a",
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
    color: "#476381",
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
    color: "#a85b42",
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
    color: "#3a5876",
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
    color: "#918977",
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
    shape: "midrise",
    color: "#856584",
    heightRatio: 0.34,
    widthRatio: 1.2,
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
    color: "#c2a05e",
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
    color: "#ae8c4a",
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
    color: "#96793c",
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

/** 1クリックの基礎獲得量 */
export const BASE_CLICK_POWER = 1;

/**
 * 1クリックで得られる秒間収益の割合。
 * 固定値だと放置収益が指数的に伸びた時点でクリックが無意味になるため、
 * クリック収益を経済に連動させて「常に秒間収益の数秒ぶん」の価値を保たせる。
 */
export const CLICK_RATE_SHARE = 0.02;

/** 着工ゲージの初期必要クリック数 */
export const GROUNDWORK_BASE_GOAL = 25;

/** 竣工1回ごとに必要クリック数へ掛かる倍率 */
export const GROUNDWORK_GOAL_GROWTH = 1.15;

/** 竣工ボーナスで得られる秒間収益の秒数 */
export const COMPLETION_BONUS_SECONDS = 180;

/**
 * 竣工ボーナスの下限（必要クリック数 × この値）。
 * 秒間収益がまだ 0 に近い序盤でもボーナスが意味を持つようにするため。
 */
export const COMPLETION_BONUS_FLOOR_PER_CLICK = 3;

/** 「グループ展開率 100%」に必要な1事業あたりの保有数 */
export const GOAL_COUNT_PER_ASSET = 10;

/**
 * 建物が育つ保有数のしきい値。[第2段階, 第3段階]。
 * 本数が増えるだけでは投資した実感が薄いので、建物そのものを育てる。
 */
export const GROWTH_STAGE_THRESHOLDS = [5, 10] as const;

/**
 * 竣工でできた区画の ID。事業ではないので `ASSET_MAP` には無い。
 * `GameState.placements` にこの ID で並び、マップでは無地の区画として描かれる。
 */
export const COMPLETION_TILE_ID = "_completion";

/**
 * マップのズーム段階。区画が `gridRadius` まで広がると次の段階へ引く。
 *
 * 段階が上がる瞬間に1区画の大きさが一気に縮み、画面に余白ができる。
 * 連続でジワジワ縮めると自分が広げている感覚が薄れるので、
 * **節目で1回だけガクッと引く**形にしてある。
 *
 * `gridRadius` は画面に収まる区画の半径。**収容数（何区画で次へ引くか）は持たない。**
 * 区画は陸にしか建たないので、`mapScene.getStageCapacity` が地形の陸のマス数から
 * 計算する。半径を大きくすると1マスが細かくなり、同じ地形でも入る数が増える。
 * つまり**進行の長さを決めるつまみは `gridRadius`**。
 *
 * 事業のコスト倍率は 1.15〜1.22（1件買うごとに指数的に上がる）で、1事業あたり
 * 数十件が現実的な上限。21事業ぶんで見て世界まで届く値にしてあるが、
 * 通しで遊んだデータがまだ無いので、ここは要調整。
 */
export const MAP_STAGES: MapStage[] = [
  { id: "marunouchi", name: "丸の内", unitLabel: "1棟", gridRadius: 6 },
  { id: "tokyo", name: "東京都", unitLabel: "1街区", gridRadius: 20 },
  { id: "kanto", name: "関東", unitLabel: "1市", gridRadius: 26 },
  { id: "east-japan", name: "東日本", unitLabel: "1都市", gridRadius: 44 },
  { id: "japan", name: "日本", unitLabel: "1都市", gridRadius: 60 },
  { id: "world", name: "世界", unitLabel: "1都市", gridRadius: 76 },
];

/** 何マスごとに道路を通すか */
export const MAP_ROAD_EVERY = 4;
