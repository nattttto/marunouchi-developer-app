import { MAP_ROAD_EVERY } from "./assets";
import type { MapScene, MapTile } from "./mapScene";

/**
 * 見下ろしマップをドット絵として canvas に描く。
 *
 * 論理解像度を小さく取り、CSS 側で `image-rendering: pixelated` を当てて
 * 拡大することでドット絵になる。画像素材は使わず、事業の色・敷地・高さから
 * 手続き的に生成しているので、事業を追加しても破綻しない。
 *
 * 真上から見ているので高さは描けない。**影の長さが高さを表す**唯一の手がかりで、
 * 光は左上から当たっている前提で右下へ影を落とす。
 *
 * 色は CSS 変数から読む（`readMapPalette`）。テーマを変えればマップも追従する。
 */

export type MapPalette = {
  ground: string;
  road: string;
  roadLine: string;
  /** 建物が落とす影 */
  shadow: string;
  /** 竣工でできた区画（事業色を持たない） */
  plot: string;
  /** 着工中の枠。主アクセント色 */
  accent: string;
};

const VAR_NAMES: Record<keyof MapPalette, string> = {
  ground: "--color-ground",
  road: "--color-road",
  roadLine: "--color-road-line",
  shadow: "--color-plot-shadow",
  plot: "--color-plot",
  accent: "--color-brick",
};

const FALLBACK = "#cfc3ae";

/** テーマの CSS 変数からマップの配色を読む */
export function readMapPalette(element: Element): MapPalette {
  const style = getComputedStyle(element);
  const palette = {} as MapPalette;
  for (const key of Object.keys(VAR_NAMES) as (keyof MapPalette)[]) {
    palette[key] = style.getPropertyValue(VAR_NAMES[key]).trim() || FALLBACK;
  }
  return palette;
}

type Rgb = [number, number, number];

function toRgb(color: string): Rgb {
  const hex = color.trim();
  if (hex.startsWith("#")) {
    const v =
      hex.length === 4
        ? hex
            .slice(1)
            .split("")
            .map((c) => c + c)
            .join("")
        : hex.slice(1);
    return [
      parseInt(v.slice(0, 2), 16),
      parseInt(v.slice(2, 4), 16),
      parseInt(v.slice(4, 6), 16),
    ];
  }
  const nums = hex.match(/[\d.]+/g);
  if (!nums) return [128, 128, 128];
  return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
}

function css([r, g, b]: Rgb): string {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

/** 明度だけ動かす。1 未満で暗く、1 より大きいと明るく */
function shade(color: string, factor: number): string {
  return css(toRgb(color).map((v) => Math.min(255, v * factor)) as Rgb);
}

/** 論理ピクセル単位の矩形。座標は必ず整数に丸めてドットのズレを防ぐ */
function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * 地面と道路。道路はマス目に合わせて等間隔に通す。
 * マス目そのものが見えると「区画に建てている」ことが伝わる。
 */
function drawGround(
  ctx: CanvasRenderingContext2D,
  scene: MapScene,
  palette: MapPalette
): void {
  px(ctx, 0, 0, scene.width, scene.height, palette.ground);

  const step = scene.cell * MAP_ROAD_EVERY;
  // 1マスが小さいと道路だけで画面が埋まるので、その段階では引かない
  if (step < 6) return;

  const thickness = scene.cell >= 6 ? 2 : 1;
  const half = Math.floor(thickness / 2);

  // マスの中心ではなく**境目**に通す。建物の下敷きになると道路が見えない
  const offsetX = (scene.originX + scene.cell / 2) % step;
  const offsetY = (scene.originY + scene.cell / 2) % step;

  for (let x = offsetX; x < scene.width; x += step) {
    px(ctx, x - half, 0, thickness, scene.height, palette.road);
  }
  for (let y = offsetY; y < scene.height; y += step) {
    px(ctx, 0, y - half, scene.width, thickness, palette.road);
  }

  if (thickness < 2) return;
  // センターライン。破線にして道路だと読めるようにする
  for (let x = offsetX; x < scene.width; x += step) {
    for (let y = 1; y < scene.height; y += 4) {
      px(ctx, x, y, 1, 2, palette.roadLine);
    }
  }
}

/** 影だけを先にまとめて落とす（本体より先に描かないと隣の屋上へ乗る） */
function drawShadow(
  ctx: CanvasRenderingContext2D,
  tile: MapTile,
  palette: MapPalette
): void {
  px(
    ctx,
    tile.x + tile.shadow,
    tile.y + tile.shadow,
    tile.size,
    tile.size,
    palette.shadow
  );
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  tile: MapTile,
  palette: MapPalette
): void {
  const color = tile.color ?? palette.plot;
  const { x, y, size } = tile;

  px(ctx, x, y, size, size, color);

  if (size < 3) return;

  // 北と西の縁が明るく、東の縁が暗い。この2本で屋上の面が起きて見える
  px(ctx, x, y, size, 1, shade(color, 1.12));
  px(ctx, x + size - 1, y, 1, size, shade(color, 0.86));

  if (tile.runway) {
    px(ctx, x + 1, y + Math.floor(size / 2), size - 2, 1, shade(color, 1.25));
    return;
  }

  if (size < 5) return;

  // 屋上設備。保有数が増えたことが上から見ても分かるようにする
  if (tile.stage >= 2) {
    px(ctx, x + 1, y + 1, 2, 2, shade(color, 0.8));
  }
  if (tile.stage >= 3) {
    px(ctx, x + size - 4, y + size - 3, 2, 2, shade(color, 0.74));
  }
}

/**
 * 着工中の区画。枠を先に立てて、ゲージの進みぶんだけ下から埋まる。
 * 竣工を待たずに、1タップごとに必ずここが動く。
 */
function drawPending(
  ctx: CanvasRenderingContext2D,
  scene: MapScene,
  palette: MapPalette
): void {
  const { x, y, size, progress } = scene.pending;
  if (size < 2) return;

  const filled = Math.round(size * progress);
  px(ctx, x, y + size - filled, size, filled, shade(palette.plot, 1.06));

  // 枠は上辺と左辺だけ。四方を囲うと小さいマスでは中が潰れる
  px(ctx, x, y, size, 1, palette.accent);
  px(ctx, x, y, 1, size, palette.accent);

  // クレーンのブーム。1マスが大きいときだけ立てる
  if (size >= 5) {
    px(ctx, x + 1, y - 2, 1, 2, palette.accent);
  }
}

/** シーンを canvas へ描く */
export function drawMap(
  ctx: CanvasRenderingContext2D,
  scene: MapScene,
  palette: MapPalette
): void {
  ctx.clearRect(0, 0, scene.width, scene.height);
  ctx.imageSmoothingEnabled = false;

  drawGround(ctx, scene, palette);
  // 影 → 本体 の2パス。1パスで描くと、渦巻きの順序の都合で
  // 後から置いた区画の影が隣の屋上に乗ってしまう
  for (const tile of scene.tiles) drawShadow(ctx, tile, palette);
  for (const tile of scene.tiles) drawTile(ctx, tile, palette);
  drawPending(ctx, scene, palette);
}
