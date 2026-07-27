import {
  ASSETS,
  BASE_CLICK_POWER,
  CATEGORIES,
  CATEGORY_TIERS,
  CLICK_RATE_SHARE,
  COMPLETION_BONUS_FLOOR_PER_CLICK,
  COMPLETION_BONUS_SECONDS,
  GOAL_COUNT_PER_ASSET,
  GROUNDWORK_BASE_GOAL,
  GROUNDWORK_GOAL_GROWTH,
  GROUP_SYNERGY_TIERS,
  GROWTH_STAGE_THRESHOLDS,
  MAX_BACK_BUILDINGS,
  OWNED_PER_BACK_BUILDING,
} from "./assets";
import type { Asset, CategoryId, MultiplierTier } from "./types";

/**
 * ゲームの計算をすべて集約した純粋関数群。
 * React・localStorage・DOM に一切依存しない（テストしやすさと再利用のため）。
 */

/** 事業を `owned` 件保有しているときの、次の1件の取得コスト */
export function getCost(asset: Asset, owned: number): number {
  return Math.ceil(asset.baseCost * Math.pow(asset.costMultiplier, owned));
}

/**
 * その事業がショップで解放されているか。
 *
 * 既に1件以上保有しているものは常に解放済みとして扱う。
 * 解放条件の並びを変えたとき、旧セーブで「保有しているのにロック表示になり
 * 保有数が消えて見える」状態を防ぐため。
 */
export function isUnlocked(asset: Asset, owned: Record<string, number>): boolean {
  if ((owned[asset.id] ?? 0) > 0) return true;

  const req = asset.unlockRequirement;
  if (!req) return true;
  return (owned[req.assetId] ?? 0) >= req.count;
}

/** しきい値の降順テーブルから、条件を満たす最初の倍率を返す */
function resolveTier(tiers: MultiplierTier[], value: number): number {
  for (const tier of tiers) {
    if (value >= tier.threshold) return tier.multiplier;
  }
  return 1;
}

/** カテゴリID -> そのカテゴリの合計保有数 */
export function getCategoryCounts(
  owned: Record<string, number>
): Record<CategoryId, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0])) as Record<
    CategoryId,
    number
  >;

  for (const asset of ASSETS) {
    counts[asset.categoryId] += owned[asset.id] ?? 0;
  }
  return counts;
}

/** カテゴリID -> そのカテゴリにかかる生産倍率 */
export function getCategoryMultipliers(
  owned: Record<string, number>
): Record<CategoryId, number> {
  const counts = getCategoryCounts(owned);
  const result = {} as Record<CategoryId, number>;
  for (const category of CATEGORIES) {
    result[category.id] = resolveTier(CATEGORY_TIERS, counts[category.id]);
  }
  return result;
}

/** 1件以上保有しているカテゴリの種類数 */
export function getOwnedCategoryKinds(owned: Record<string, number>): number {
  const counts = getCategoryCounts(owned);
  return CATEGORIES.filter((c) => counts[c.id] > 0).length;
}

/** カテゴリの種類数から決まる、全体にかかるグループシナジー倍率 */
export function getGroupSynergyMultiplier(owned: Record<string, number>): number {
  return resolveTier(GROUP_SYNERGY_TIERS, getOwnedCategoryKinds(owned));
}

/**
 * 倍率をすべて掛けた、1件あたりの実効生産量(PT/s)。
 * 倍率は呼び出し側で使い回せるよう引数で受ける（毎行で再計算しないため）。
 */
export function getEffectiveProduction(
  asset: Asset,
  categoryMultipliers: Record<CategoryId, number>,
  groupMultiplier: number
): number {
  return (
    asset.baseProduction * categoryMultipliers[asset.categoryId] * groupMultiplier
  );
}

/**
 * 秒間収益(PT/s)の合計。カテゴリ倍率とグループシナジーを含む。
 * オフライン収益の計算もこの関数を通るので、表示と実際の加算が食い違わない。
 */
export function getTotalRate(
  assets: Asset[],
  owned: Record<string, number>
): number {
  const categoryMultipliers = getCategoryMultipliers(owned);
  const groupMultiplier = getGroupSynergyMultiplier(owned);

  return assets.reduce(
    (sum, asset) =>
      sum +
      (owned[asset.id] ?? 0) *
        getEffectiveProduction(asset, categoryMultipliers, groupMultiplier),
    0
  );
}

/**
 * 1クリックの獲得量。基礎値＋秒間収益の一定割合。
 * 経済に連動するので、放置収益が伸びてもクリックが無意味にならない。
 */
export function getClickPower(totalRate: number): number {
  return BASE_CLICK_POWER + totalRate * CLICK_RATE_SHARE;
}

/**
 * 次の竣工までに必要な着工ゲージのクリック数。
 * 竣工を重ねるごとに緩やかに増える。
 */
export function getGroundworkGoal(completions: number): number {
  return Math.ceil(
    GROUNDWORK_BASE_GOAL * Math.pow(GROUNDWORK_GOAL_GROWTH, completions)
  );
}

/**
 * 竣工ボーナスの獲得PT。
 * 基本は「秒間収益の COMPLETION_BONUS_SECONDS 秒ぶん」だが、
 * 秒間収益がまだ 0 に近い序盤でも意味を持つよう、必要クリック数に応じた下限を設ける。
 */
export function getCompletionBonus(totalRate: number, goalClicks: number): number {
  return Math.max(
    totalRate * COMPLETION_BONUS_SECONDS,
    goalClicks * COMPLETION_BONUS_FLOOR_PER_CLICK
  );
}

/**
 * グループ展開率(0〜1)。
 * 全事業を GOAL_COUNT_PER_ASSET 件ずつ保有すると 1 になる。
 */
export function getDevelopmentRate(owned: Record<string, number>): number {
  const total = ASSETS.reduce(
    (sum, a) => sum + Math.min(owned[a.id] ?? 0, GOAL_COUNT_PER_ASSET),
    0
  );
  return total / (ASSETS.length * GOAL_COUNT_PER_ASSET);
}

/**
 * 建物の成長段階（1〜3）。保有数が増えるとその建物自体が育つ。
 * 1 = 素の箱、2 = 高くなりアンテナが立つ、3 = さらに高く屋上設備が乗る。
 */
export function getGrowthStage(ownedCount: number): 1 | 2 | 3 {
  const [second, third] = GROWTH_STAGE_THRESHOLDS;
  if (ownedCount >= third) return 3;
  if (ownedCount >= second) return 2;
  return 1;
}

/** 主棟の背後に重ねる副棟の数。保有数の多さを密度で見せる */
export function getBackBuildingCount(ownedCount: number): number {
  if (ownedCount <= 0) return 0;
  return Math.min(
    MAX_BACK_BUILDINGS,
    Math.ceil(ownedCount / OWNED_PER_BACK_BUILDING) - 1
  );
}

const LARGE_UNITS = [
  { value: 1e16, suffix: "京" },
  { value: 1e12, suffix: "兆" },
  { value: 1e8, suffix: "億" },
  { value: 1e4, suffix: "万" },
] as const;

/** 末尾の 0 を落として小数を整える（1.50 -> "1.5", 2.00 -> "2"） */
function trimDecimal(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.?0+$/, "");
}

/**
 * PT の表示用フォーマット。
 * 1万未満はカンマ区切り、それ以上は 万/億/兆/京 に丸める。
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  const abs = Math.abs(value);

  if (abs < 100) return trimDecimal(value, 1);
  if (abs < 10_000) return Math.floor(value).toLocaleString("ja-JP");

  for (const unit of LARGE_UNITS) {
    if (abs >= unit.value) return trimDecimal(value / unit.value, 2) + unit.suffix;
  }
  return Math.floor(value).toLocaleString("ja-JP");
}

/** 倍率の表示用フォーマット（`×1.25` の数字部分） */
export function formatMultiplier(value: number): string {
  return trimDecimal(value, 2);
}

/** 経過秒数を「3時間12分」のような日本語表記にする */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if (h > 0) return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  if (m > 0) return s > 0 ? `${m}分${s}秒` : `${m}分`;
  return `${s}秒`;
}
