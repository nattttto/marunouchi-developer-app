import { ASSETS, FRONT_ROW_CAPACITY } from "./assets";
import { getBackBuildingCount, getGrowthStage } from "./gameLogic";
import type { Asset, AssetShape } from "./types";

/**
 * 保有状況から「街の配置」を組み立てる純粋関数。
 * canvas にも DOM にも依存しないので、描画側と切り離してテストできる。
 *
 * 設計の要点：
 * - **間引かない。** 保有している事業はすべて街に出す。育てたものが消えるのは
 *   積み上げた感覚と真逆になる（以前は上限を超えると下位から間引いていた）
 * - **並べ替えない。** 区画は常に取得順（＝コストの安い順）で左から並ぶ。
 *   買うたびに街の形が変わると、同じ街を育てている感覚が持てない
 * - 手前の列に入りきらない下位の事業は、奥の列へ下げて小さく淡く描く。
 *   消さずに奥行きへ逃がすことで、街の密度と歴史を同時に見せる
 */

/** 手前の列の建物1棟あたりの基準幅（論理px） */
const BASE_PLOT_WIDTH = 13;

/** 区画の最小幅（論理px） */
const MIN_PLOT_WIDTH = 5;

/** 区画どうしの間隔（論理px） */
const PLOT_GAP = 2;

/** 奥の列の縮小率 */
const BACK_SCALE = 0.62;

/** 奥の列を地平線側へ持ち上げる量（論理px） */
const BACK_RISE = 9;

/** 道路の高さ（論理px） */
export const ROAD_HEIGHT = 7;

/**
 * 建物の高さに掛ける余裕。
 * 成長段階3（×1.36）でちょうど上限に届くようにしてある。
 * これが無いと一番高い事業だけ成長が頭打ちで見えなくなる。
 */
const HEIGHT_HEADROOM = 0.72;

/**
 * 建物の上に空けておく余白（論理px）。
 * アンテナや屋上設備は建物の天面より上に描くので、その分を確保しないと
 * 一番高い事業の段階3で装飾が画面外に切れる。
 */
const DECORATION_SPACE = 11;

/** 成長段階ごとの高さ倍率 */
const STAGE_HEIGHT: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.18, 3: 1.36 };

export type CityBuilding = {
  assetId: string;
  /** 区画の左端（論理px） */
  x: number;
  /** 主棟の幅（論理px） */
  width: number;
  /** 主棟の高さ（論理px） */
  height: number;
  /** 建物の足元のY（論理px） */
  baseY: number;
  color: string;
  shape: AssetShape;
  stage: 1 | 2 | 3;
  /** 背後に重ねる副棟の数 */
  backCount: number;
  layer: "back" | "front";
};

export type CityScene = {
  width: number;
  height: number;
  /** 手前の地面のY */
  groundY: number;
  /** 奥の地面のY */
  backGroundY: number;
  roadHeight: number;
  /** 奥→手前の順に並んだ建物。この順に描けば重なりが正しくなる */
  buildings: CityBuilding[];
};

/** 1列ぶんの区画を横に並べる */
function layoutRow(
  assets: Asset[],
  owned: Record<string, number>,
  canvasWidth: number,
  baseY: number,
  layer: "back" | "front",
  scale: number
): CityBuilding[] {
  if (assets.length === 0) return [];

  const widths = assets.map((a) =>
    Math.max(MIN_PLOT_WIDTH, Math.round(BASE_PLOT_WIDTH * a.widthRatio * scale))
  );
  const total =
    widths.reduce((sum, w) => sum + w, 0) + PLOT_GAP * (assets.length - 1);
  const available = Math.max(1, canvasWidth - 2);

  let xs: number[];
  if (total <= available) {
    // 収まるときは中央寄せ
    let x = Math.round((canvasWidth - total) / 2);
    xs = widths.map((w) => {
      const at = x;
      x += w + PLOT_GAP;
      return at;
    });
  } else {
    // 収まらないときは詰めて少し重ねる。密集した街として読める
    const advance =
      assets.length > 1
        ? (available - widths[widths.length - 1]) / (assets.length - 1)
        : 0;
    xs = assets.map((_, i) => Math.round(1 + i * advance));
  }

  const maxHeight = Math.max(3, baseY - DECORATION_SPACE);

  return assets.map((asset, i) => {
    const count = owned[asset.id] ?? 0;
    const stage = getGrowthStage(count);
    // scale は幅だけでなく高さにも掛ける。奥の列を低くしないと遠近が出ない
    const height = Math.round(
      asset.heightRatio * maxHeight * HEIGHT_HEADROOM * STAGE_HEIGHT[stage] * scale
    );

    return {
      assetId: asset.id,
      x: xs[i],
      width: widths[i],
      height: Math.min(Math.max(3, height), maxHeight),
      baseY,
      color: asset.color,
      shape: asset.shape,
      stage,
      backCount: getBackBuildingCount(count),
      layer,
    };
  });
}

/** 保有状況とキャンバスの論理サイズから街の配置を作る */
export function buildCityScene(
  owned: Record<string, number>,
  width: number,
  height: number
): CityScene {
  const groundY = Math.max(4, height - ROAD_HEIGHT - 1);
  const backGroundY = Math.max(3, groundY - BACK_RISE);

  // ASSETS はコストの安い順なので、この順序がそのまま取得順になる
  const ownedAssets = ASSETS.filter((a) => (owned[a.id] ?? 0) > 0);
  const splitAt = Math.max(0, ownedAssets.length - FRONT_ROW_CAPACITY);
  const back = ownedAssets.slice(0, splitAt);
  const front = ownedAssets.slice(splitAt);

  return {
    width,
    height,
    groundY,
    backGroundY,
    roadHeight: ROAD_HEIGHT,
    buildings: [
      ...layoutRow(back, owned, width, backGroundY, "back", BACK_SCALE),
      ...layoutRow(front, owned, width, groundY, "front", 1),
    ],
  };
}
