import type { Building } from "./types";

/**
 * 建物マスタ。仕様書 3.2 の表がそのまま入っている。
 * 数値はバランス調整の対象なので、変更するのは基本ここだけで済むようにしてある。
 *
 * 解放条件はいずれも「1つ前の建物を1棟保有」。
 * コスト自体が強い進行ゲートになっているので、条件はゆるくしてある。
 */
export const BUILDINGS: Building[] = [
  {
    id: "uchisaiwaicho",
    name: "内幸町ビル",
    baseCost: 15,
    costMultiplier: 1.15,
    baseProduction: 0.1,
    color: "#46536b",
    heightRatio: 0.26,
    widthRatio: 0.9,
  },
  {
    id: "tokyo-building",
    name: "東京ビルディング",
    baseCost: 100,
    costMultiplier: 1.15,
    baseProduction: 0.8,
    color: "#55688a",
    heightRatio: 0.36,
    widthRatio: 1.0,
    unlockRequirement: { buildingId: "uchisaiwaicho", count: 1 },
  },
  {
    id: "mitsubishi-building",
    name: "三菱ビル",
    baseCost: 500,
    costMultiplier: 1.16,
    baseProduction: 4,
    color: "#5f7fa6",
    heightRatio: 0.45,
    widthRatio: 1.1,
    unlockRequirement: { buildingId: "tokyo-building", count: 1 },
  },
  {
    id: "otemachi-park",
    name: "大手町パークビルディング",
    baseCost: 3_000,
    costMultiplier: 1.16,
    baseProduction: 20,
    color: "#4f8fa0",
    heightRatio: 0.57,
    widthRatio: 1.2,
    unlockRequirement: { buildingId: "mitsubishi-building", count: 1 },
  },
  {
    id: "marunouchi-park",
    name: "丸の内パークビルディング",
    baseCost: 15_000,
    costMultiplier: 1.17,
    baseProduction: 100,
    color: "#4f9c86",
    heightRatio: 0.68,
    widthRatio: 1.2,
    unlockRequirement: { buildingId: "otemachi-park", count: 1 },
  },
  {
    id: "shin-marubiru",
    name: "新丸ビル",
    baseCost: 80_000,
    costMultiplier: 1.18,
    baseProduction: 500,
    color: "#8f9c5a",
    heightRatio: 0.79,
    widthRatio: 1.3,
    unlockRequirement: { buildingId: "marunouchi-park", count: 1 },
  },
  {
    id: "marubiru",
    name: "丸ビル",
    baseCost: 400_000,
    costMultiplier: 1.19,
    baseProduction: 2_500,
    color: "#c2a04a",
    heightRatio: 0.9,
    widthRatio: 1.35,
    unlockRequirement: { buildingId: "shin-marubiru", count: 1 },
  },
  {
    id: "otemachi-tower",
    name: "大手町タワー(EX)",
    baseCost: 2_000_000,
    costMultiplier: 1.2,
    baseProduction: 12_000,
    color: "#a074d6",
    heightRatio: 1,
    widthRatio: 1.4,
    unlockRequirement: { buildingId: "marubiru", count: 1 },
  },
];

/** 建物ID -> Building の逆引き */
export const BUILDING_MAP: Record<string, Building> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b])
);

/** 「丸の内エリア開発率 100%」に必要な1種類あたりの保有数 */
export const GOAL_COUNT_PER_BUILDING = 10;

/** スカイラインに描く1種類あたりの最大本数（描画の破綻防止） */
export const MAX_SILHOUETTES_PER_BUILDING = 5;

/** 何棟保有するごとにスカイラインの描画本数を1本増やすか */
export const OWNED_PER_SILHOUETTE = 3;
