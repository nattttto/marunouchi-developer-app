import { ASSET_MAP, MAP_STAGES } from "./assets";
import { getGrowthStage } from "./gameLogic";
import {
  getTerrainLayout,
  terrainAt,
  TERRAINS,
  type Terrain,
  type TerrainLayout,
} from "./mapTerrain";
import type { AssetShape, MapStage } from "./types";

/**
 * 保有状況から「見下ろしマップの配置」を組み立てる純粋関数。
 * canvas にも DOM にも依存しないので、描画側と切り離してテストできる。
 *
 * 設計の要点：
 * - **中心から渦巻き（スパイラル）に外へ置く。** 丸の内から広がっていく形になり、
 *   一度置いた区画は二度と動かない
 * - **間引かない・並べ替えない。** 区画の並びは `GameState.placements`（取得順）が
 *   そのまま index になる。安い事業を買い足しても既存の区画はずれない
 * - **ズームは段階ごとに1回だけ引く。** 連続で縮めると自分が広げている感覚が薄れる
 */

/** 区画1つぶんの余白の割合（1マスに対して、建物が占めない外周） */
const PLOT_INSET = 0.22;

/** shape ごとの敷地の広さ。真上から見たときの占有率 */
const SHAPE_FOOTPRINT: Record<AssetShape, number> = {
  tower: 0.72,
  midrise: 0.84,
  lowrise: 1,
  airport: 1,
};

/** 成長段階ごとに敷地へ足す割合。保有数が増えると区画そのものが太る */
const STAGE_GROWTH: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.08, 3: 1.16 };

/**
 * 着工中の区画の最小サイズ（論理px）。
 *
 * 段階が上がると1マスは数px以下まで縮むが、着工中の区画だけはここまで縮めない。
 * クレーンも足場も潰れてしまい、**タップしても画面が変わらなくなる**ため。
 * マスより大きくなるぶんには「今ここを開発している」というピンとして読める。
 */
const MIN_PENDING_SIZE = 5;

export type MapTile = {
  /** 事業ID。竣工でできた区画は `COMPLETION_TILE_ID` */
  id: string;
  /** 建物の左上（論理px） */
  x: number;
  y: number;
  /** 建物の一辺（論理px） */
  size: number;
  /** 事業色。竣工区画は null（描画側でパレットの色を使う） */
  color: string | null;
  /** 影の長さ（論理px）。見下ろしでは影の長さが高さを表す */
  shadow: number;
  /** 保有数から決まる成長段階 */
  stage: 1 | 2 | 3;
  /** 滑走路の帯を引くか（空港） */
  runway: boolean;
};

/** 次に建つ区画（着工中）。タップのたびにここが育つ */
export type PendingPlot = {
  x: number;
  y: number;
  size: number;
  /** 着工ゲージの進み具合(0〜1) */
  progress: number;
  /**
   * クレーンの向き(0〜3)。**1タップごとに必ず変わる**のはここだけ。
   *
   * 躯体の高さは区画の1辺（数px）を必要クリック数で割ったぶんしか伸びないので、
   * 数タップに1回しかドットが動かない。タップの手応えを毎回返すために、
   * 向きだけは1タップ1回転させる。
   */
  craneFacing: 0 | 1 | 2 | 3;
};

export type MapScene = {
  width: number;
  height: number;
  /** 1マスの大きさ（論理px）。段階が上がると小さくなる */
  cell: number;
  /** マス目の中心（論理px） */
  originX: number;
  originY: number;
  stage: MapStage;
  stageIndex: number;
  tiles: MapTile[];
  pending: PendingPlot;
};

/**
 * スパイラル上の index から座標（マス）を求める。
 *
 * index 0 が中心で、そこから右→下→左→上と外向きに巻いていく。
 * 半径 r のリングは index (2r-1)^2 〜 (2r+1)^2-1 を占める。
 * 逐次でたどらず閉じた式で出すので、何番目でも O(1) で引ける。
 */
export function spiralAt(index: number): { gx: number; gy: number } {
  if (index <= 0) return { gx: 0, gy: 0 };

  let r = Math.floor((Math.sqrt(index) + 1) / 2);
  // 平方根の丸め誤差でリングを1つ跨ぐことがあるので、両側から詰める
  while ((2 * r + 1) ** 2 <= index) r++;
  while (r > 0 && (2 * r - 1) ** 2 > index) r--;

  const p = index - (2 * r - 1) ** 2;
  if (p <= 2 * r - 1) return { gx: r, gy: 1 - r + p };
  if (p <= 4 * r - 1) return { gx: r - (p - 2 * r + 1), gy: r };
  if (p <= 6 * r - 1) return { gx: -r, gy: r - (p - 4 * r + 1) };
  return { gx: -r + (p - 6 * r + 1), gy: -r };
}

/** `count` 個の区画を置いたときに必要なリングの半径 */
export function ringRadiusFor(count: number): number {
  if (count <= 1) return 0;
  const { gx, gy } = spiralAt(count - 1);
  return Math.max(Math.abs(gx), Math.abs(gy));
}

/**
 * 区画数からズーム段階を決める。
 * 着工中の区画も数に入れる（次の1つでリングが増えるなら、先に引いておく）。
 */
export function resolveStageIndex(count: number): number {
  const index = MAP_STAGES.findIndex((s) => count <= s.capacity);
  return index === -1 ? MAP_STAGES.length - 1 : index;
}

/**
 * その座標に区画を置けるか。
 *
 * 地形のある段階では**陸にしか建てない**。海を避けて広がるので、
 * 日本や世界の形そのものがビルで埋まっていく。
 * 皇居（`*`）も避ける。開発しない場所があるほうが街として自然に見える。
 */
function isBuildable(
  terrain: Terrain | undefined,
  layout: TerrainLayout | undefined,
  x: number,
  y: number
): boolean {
  if (!terrain || !layout) return true;
  return terrainAt(terrain, layout, x, y) === "#";
}

/** 建物1つぶんの大きさと影の長さを、事業と保有数から決める */
function plotOf(id: string, owned: Record<string, number>, cell: number) {
  const asset = ASSET_MAP[id];
  const inner = cell * (1 - PLOT_INSET);

  if (!asset) {
    // 竣工区画。事業ではないので控えめな正方形にしておく
    return { size: Math.max(1, inner * 0.7), shadow: 1, stage: 1 as const };
  }

  const stage = getGrowthStage(owned[asset.id] ?? 0);
  const size = inner * SHAPE_FOOTPRINT[asset.shape] * STAGE_GROWTH[stage];

  return {
    size: Math.max(1, Math.min(cell, size)),
    // 高い事業ほど影が長い。見下ろしで高さを伝える唯一の手がかり
    shadow: Math.max(1, Math.round(1 + asset.heightRatio * (cell >= 6 ? 2 : 1))),
    stage,
  };
}

/**
 * 保有状況とキャンバスの論理サイズからマップの配置を作る。
 *
 * @param placements 取得順に並んだ区画（`GameState.placements`）
 * @param owned      成長段階を決めるための保有数
 * @param groundwork 着工ゲージの状態
 */
export function buildMapScene(
  placements: string[],
  owned: Record<string, number>,
  groundwork: { clicks: number; goal: number },
  width: number,
  height: number
): MapScene {
  const stageIndex = resolveStageIndex(placements.length);
  const stage = MAP_STAGES[stageIndex];

  // 段階の半径ぶんが必ず画面に収まるようにマス目を決める。
  // 短いほうの辺で割るので、縦横どちらでも切れない
  const cell = Math.min(width, height) / (stage.gridRadius * 2 + 2);
  const originX = width / 2;
  const originY = height / 2;

  const terrain = TERRAINS[stage.id];
  const layout = terrain ? getTerrainLayout(terrain, width, height) : undefined;

  /**
   * 渦巻きを進めながら、置ける（＝陸の）マスを1つ返す。
   * 陸を探して延々と回り続けないよう、走査の上限を切ってある。
   * 上限に達したら海の上でも置く（＝その段階を埋め尽くした状態）。
   */
  let cursor = 0;
  const limit = (stage.gridRadius * 2 + 3) ** 2 * 2;
  const nextCell = () => {
    for (let scanned = 0; scanned < limit; scanned++) {
      const at = spiralAt(cursor++);
      const x = originX + at.gx * cell;
      const y = originY + at.gy * cell;
      if (isBuildable(terrain, layout, x, y)) return { x, y };
    }
    const at = spiralAt(cursor++);
    return { x: originX + at.gx * cell, y: originY + at.gy * cell };
  };

  const tiles: MapTile[] = [];
  for (const id of placements) {
    const { x, y } = nextCell();
    const { size, shadow, stage: growth } = plotOf(id, owned, cell);
    const asset = ASSET_MAP[id];

    tiles.push({
      id,
      x: x - size / 2,
      y: y - size / 2,
      size,
      color: asset?.color ?? null,
      shadow,
      stage: growth,
      runway: asset?.shape === "airport" && size >= 5,
    });
  }

  const next = nextCell();
  const pendingSize = Math.max(MIN_PENDING_SIZE, cell * (1 - PLOT_INSET) * 0.8);

  return {
    width,
    height,
    cell,
    originX,
    originY,
    stage,
    stageIndex,
    tiles,
    pending: {
      x: next.x - pendingSize / 2,
      y: next.y - pendingSize / 2,
      size: pendingSize,
      progress:
        groundwork.goal > 0
          ? Math.min(1, Math.max(0, groundwork.clicks / groundwork.goal))
          : 0,
      craneFacing: (Math.max(0, Math.floor(groundwork.clicks)) % 4) as 0 | 1 | 2 | 3,
    },
  };
}
