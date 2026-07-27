import {
  BUILDINGS,
  GOAL_COUNT_PER_BUILDING,
  MAX_SILHOUETTES_PER_BUILDING,
  OWNED_PER_SILHOUETTE,
} from "./buildings";
import type { Building } from "./types";

/**
 * ゲームの計算をすべて集約した純粋関数群。
 * React・localStorage・DOM に一切依存しない（テストしやすさと再利用のため）。
 */

/** 建物を `owned` 棟保有しているときの、次の1棟の購入コスト */
export function getCost(building: Building, owned: number): number {
  return Math.ceil(building.baseCost * Math.pow(building.costMultiplier, owned));
}

/** 全建物の秒間収益(PT/s)の合計 */
export function getTotalRate(
  buildings: Building[],
  owned: Record<string, number>
): number {
  return buildings.reduce(
    (sum, b) => sum + (owned[b.id] ?? 0) * b.baseProduction,
    0
  );
}

/** その建物がショップで解放されているか */
export function isUnlocked(
  building: Building,
  owned: Record<string, number>
): boolean {
  const req = building.unlockRequirement;
  if (!req) return true;
  return (owned[req.buildingId] ?? 0) >= req.count;
}

/**
 * 丸の内エリア開発率(0〜1)。
 * 全建物を GOAL_COUNT_PER_BUILDING 棟ずつ保有すると 1 になる。
 */
export function getDevelopmentRate(owned: Record<string, number>): number {
  const total = BUILDINGS.reduce(
    (sum, b) => sum + Math.min(owned[b.id] ?? 0, GOAL_COUNT_PER_BUILDING),
    0
  );
  return total / (BUILDINGS.length * GOAL_COUNT_PER_BUILDING);
}

/** スカイラインに描く本数（保有数から算出、上限あり） */
export function getSilhouetteCount(ownedCount: number): number {
  if (ownedCount <= 0) return 0;
  return Math.min(
    Math.ceil(ownedCount / OWNED_PER_SILHOUETTE),
    MAX_SILHOUETTES_PER_BUILDING
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
