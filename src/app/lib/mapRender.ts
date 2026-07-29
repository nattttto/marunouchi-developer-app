import { MAP_ROAD_EVERY } from "./assets";
import type { MapScene, MapTile } from "./mapScene";
import { getTerrainLayout, TERRAINS } from "./mapTerrain";

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
  /** 海・湾 */
  water: string;
  /** 緑地（皇居） */
  park: string;
};

const VAR_NAMES: Record<keyof MapPalette, string> = {
  ground: "--color-ground",
  road: "--color-road",
  roadLine: "--color-road-line",
  shadow: "--color-plot-shadow",
  plot: "--color-plot",
  accent: "--color-brick",
  water: "--color-water",
  park: "--color-park",
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
 * 地形シルエットを敷く。
 *
 * 1文字ぶんの矩形は「次の文字の開始位置」との差で幅を出す。
 * それぞれ独立に丸めると、拡大率が整数でないときに1pxの隙間が並んでしまう。
 */
function drawTerrain(
  ctx: CanvasRenderingContext2D,
  scene: MapScene,
  palette: MapPalette
): void {
  const terrain = TERRAINS[scene.stage.id];
  if (!terrain) return;

  const { scale, offsetX, offsetY, cols, rows } = getTerrainLayout(
    terrain,
    scene.width,
    scene.height
  );

  const colors: Record<string, string> = {
    "#": palette.ground,
    "~": palette.water,
    "*": palette.park,
  };

  for (let r = 0; r < rows; r++) {
    const top = Math.round(offsetY + r * scale);
    const bottom = Math.round(offsetY + (r + 1) * scale);
    for (let c = 0; c < cols; c++) {
      const color = colors[terrain.rows[r][c]];
      if (!color) continue;
      const left = Math.round(offsetX + c * scale);
      const right = Math.round(offsetX + (c + 1) * scale);
      px(ctx, left, top, right - left, bottom - top, color);
    }
  }
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
  const terrain = TERRAINS[scene.stage.id];

  // 海の上に描く段階（列島・世界地図）は、地面ではなく海で埋める
  px(
    ctx,
    0,
    0,
    scene.width,
    scene.height,
    terrain?.sea ? palette.water : palette.ground
  );
  drawTerrain(ctx, scene, palette);

  // 道路は街として見えている段階だけ。列島や世界地図に街区の道路は引かない
  if (terrain?.sea) return;

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

/** クレーンのブームが伸びる向き（右→下→左→上） */
const CRANE_DIRECTIONS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const;

/**
 * 着工中の区画。更地に杭を打ち、ゲージの進みぶんだけ躯体が下から立ち上がる。
 * 竣工を待たずに、1タップごとに必ずここが動く。
 */
function drawPending(
  ctx: CanvasRenderingContext2D,
  scene: MapScene,
  palette: MapPalette
): void {
  const { x, y, size, progress, craneFacing } = scene.pending;
  if (size < 2) return;

  // 更地。まだ何も無いことが分かるよう、地面より少し明るく均す
  px(ctx, x, y, size, size, shade(palette.plot, 1.12));

  // 躯体。下から立ち上がる
  const filled = Math.round(size * progress);
  px(ctx, x, y + size - filled, size, filled, shade(palette.plot, 0.92));

  // 足場の横棒。躯体の上に2px おきで引くと組み上がっていく途中に見える
  if (size >= 5) {
    for (let line = y + size - filled + 1; line < y + size - 1; line += 2) {
      px(ctx, x, line, size, 1, shade(palette.plot, 0.78));
    }
  }

  // 縄張り。上辺と左辺だけにする。四方を囲うと小さいマスでは中が潰れる
  px(ctx, x, y, size, 1, palette.accent);
  px(ctx, x, y, 1, size, palette.accent);

  if (size < 4) return;

  // クレーン。マストは左上に立て、ブームは1タップごとに向きを変える
  const [dx, dy] = CRANE_DIRECTIONS[craneFacing];
  const mastX = x + 1;
  const mastY = y - 1;
  const reach = Math.max(2, Math.round(size * 0.7));

  px(ctx, mastX, mastY, 1, 2, palette.accent);
  px(
    ctx,
    dx < 0 ? mastX - reach : mastX,
    dy < 0 ? mastY - reach : mastY,
    dx === 0 ? 1 : reach,
    dy === 0 ? 1 : reach,
    palette.accent
  );
}

/**
 * 区画が増えた瞬間の光。区画から四角い波が広がって消える。
 *
 * @param t 0（発生）〜1（消滅）
 * @param strong 竣工のときだけ true。購入より一段強く出す
 */
export function drawPlacementFlash(
  ctx: CanvasRenderingContext2D,
  plot: { x: number; y: number; size: number },
  t: number,
  strong: boolean,
  palette: MapPalette
): void {
  // 後半の段階では区画が数px以下になる。波まで小さくすると見えないので下限を置く
  const base = Math.max(plot.size, 6);
  const spread = base * (strong ? 2 : 1.2) * t;
  const alpha = (strong ? 1 : 0.7) * (1 - t);
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // 置かれた区画そのものを一瞬光らせる。
  // 1マスが数pxしかない後半でも、波だけでは何が増えたのか分からないため
  px(ctx, plot.x, plot.y, plot.size, plot.size, shade(palette.accent, 1.25));

  const x = plot.x - spread;
  const y = plot.y - spread;
  const side = plot.size + spread * 2;
  // 塗り潰さず外周1pxだけ。中の区画を隠さずに広がりだけを見せる
  px(ctx, x, y, side, 1, palette.accent);
  px(ctx, x, y + side - 1, side, 1, palette.accent);
  px(ctx, x, y, 1, side, palette.accent);
  px(ctx, x + side - 1, y, 1, side, palette.accent);

  ctx.restore();
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
