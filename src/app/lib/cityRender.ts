import type { CityBuilding, CityScene } from "./cityScene";

/**
 * 街をドット絵として canvas に描く。
 *
 * 論理解像度を小さく取り、CSS 側で `image-rendering: pixelated` を当てて
 * 拡大することでドット絵になる。画像素材は使わず、事業の幅・高さ・形・色から
 * 手続き的に生成しているので、事業を追加しても破綻しない。
 *
 * 色は CSS 変数から読む（`readCityPalette`）。テーマを変えれば街の色も追従する。
 */

export type CityPalette = {
  ground: string;
  sidewalk: string;
  road: string;
  roadLine: string;
  tree: string;
  treeLight: string;
  trunk: string;
  lamp: string;
  lampHead: string;
  /** 奥の建物を溶かし込む色（地平線付近の空の色） */
  haze: string;
};

const VAR_NAMES: Record<keyof CityPalette, string> = {
  ground: "--color-ground",
  sidewalk: "--color-sidewalk",
  road: "--color-road",
  roadLine: "--color-road-line",
  tree: "--color-tree",
  treeLight: "--color-tree-light",
  trunk: "--color-trunk",
  lamp: "--color-lamp",
  lampHead: "--color-lamp-head",
  haze: "--color-sky-low",
};

const FALLBACK = "#cfc3ae";

/** テーマの CSS 変数から街の配色を読む */
export function readCityPalette(element: Element): CityPalette {
  const style = getComputedStyle(element);
  const palette = {} as CityPalette;
  for (const key of Object.keys(VAR_NAMES) as (keyof CityPalette)[]) {
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

/** 2色を t (0〜1) で混ぜる。奥の建物を空に溶かすのに使う */
function blend(from: string, to: string, t: number): string {
  const a = toRgb(from);
  const b = toRgb(to);
  return css([
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]);
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

/** 窓。縦に伸びる建物は点グリッド、横に長い施設は横帯で描き分ける */
function drawWindows(
  ctx: CanvasRenderingContext2D,
  b: CityBuilding,
  top: number
): void {
  const windowColor = shade(b.color, 0.62);

  if (b.shape === "lowrise" || b.shape === "airport") {
    for (let y = top + 2; y < b.baseY - 1; y += 3) {
      px(ctx, b.x + 1, y, b.width - 2, 1, windowColor);
    }
    return;
  }

  if (b.width < 5) {
    // 細い建物は1列だけ。無理に格子にすると潰れる
    for (let y = top + 2; y < b.baseY - 2; y += 4) {
      px(ctx, b.x + 1, y, 1, 2, windowColor);
    }
    return;
  }

  for (let y = top + 2; y < b.baseY - 2; y += 4) {
    for (let x = b.x + 2; x < b.x + b.width - 2; x += 3) {
      px(ctx, x, y, 1, 2, windowColor);
    }
  }
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  b: CityBuilding,
  palette: CityPalette
): void {
  const top = b.baseY - b.height;

  // 副棟。主棟より先に描いて背後に回す
  for (let i = 0; i < b.backCount; i++) {
    const offset = (i % 2 === 0 ? -1 : 1) * (2 + i * 2);
    const height = Math.round(b.height * (0.64 - i * 0.1));
    const width = Math.max(3, Math.round(b.width * 0.72));
    if (height < 3) continue;
    px(
      ctx,
      b.x + offset,
      b.baseY - height,
      width,
      height,
      blend(b.color, palette.haze, 0.3 + i * 0.12)
    );
  }

  px(ctx, b.x, top, b.width, b.height, b.color);
  // 屋上の明るい縁と、右側の陰。この2本でドット絵でも立体に見える
  px(ctx, b.x, top, b.width, 1, shade(b.color, 1.14));
  px(ctx, b.x + b.width - 1, top, 1, b.height, shade(b.color, 0.84));

  drawWindows(ctx, b, top);

  // 成長段階の装飾。保有数が増えたことが姿で分かるようにする
  if (b.stage >= 2 && b.shape !== "lowrise") {
    const mast = b.x + Math.floor(b.width / 2);
    px(ctx, mast, top - 4, 1, 4, shade(b.color, 0.7));
    px(ctx, mast - 1, top - 5, 3, 1, "#c0684d");
  }
  if (b.stage >= 3) {
    px(ctx, b.x + 1, top - 3, Math.min(4, b.width - 2), 3, shade(b.color, 0.82));
    if (b.width >= 8) {
      px(ctx, b.x + b.width - 5, top - 2, 3, 2, shade(b.color, 0.82));
    }
  }

  // 空港は管制塔を1本立てて他の低層と見分ける
  if (b.shape === "airport") {
    const tower = b.x + b.width - 3;
    px(ctx, tower, top - 7, 1, 7, shade(b.color, 0.8));
    px(ctx, tower - 1, top - 9, 3, 2, shade(b.color, 0.68));
  }
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  palette: CityPalette
): void {
  px(ctx, x + 1, baseY - 2, 1, 2, palette.trunk);
  px(ctx, x, baseY - 6, 3, 4, palette.tree);
  px(ctx, x, baseY - 7, 3, 1, palette.treeLight);
}

function drawLamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  palette: CityPalette
): void {
  px(ctx, x, baseY - 8, 1, 8, palette.lamp);
  px(ctx, x - 1, baseY - 9, 3, 1, palette.lampHead);
}

/** シーンを canvas へ描く。空は CSS のグラデーションに任せ、地面から下だけ塗る */
export function drawCity(
  ctx: CanvasRenderingContext2D,
  scene: CityScene,
  palette: CityPalette
): void {
  ctx.clearRect(0, 0, scene.width, scene.height);
  ctx.imageSmoothingEnabled = false;

  const back = scene.buildings.filter((b) => b.layer === "back");
  const front = scene.buildings.filter((b) => b.layer === "front");

  // 奥の地面。空に溶かして遠くに見せる
  px(
    ctx,
    0,
    scene.backGroundY,
    scene.width,
    scene.height - scene.backGroundY,
    blend(palette.ground, palette.haze, 0.45)
  );
  for (const b of back) drawBuilding(ctx, b, palette);

  // 手前の地面
  px(ctx, 0, scene.groundY, scene.width, scene.height - scene.groundY, palette.ground);
  for (const b of front) drawBuilding(ctx, b, palette);

  // 歩道と道路
  const roadTop = scene.groundY + 2;
  px(ctx, 0, scene.groundY, scene.width, 1, palette.sidewalk);
  px(ctx, 0, roadTop, scene.width, scene.height - roadTop, palette.road);
  for (let x = 2; x < scene.width; x += 8) {
    px(ctx, x, roadTop + 2, 4, 1, palette.roadLine);
  }

  // 街路樹と街灯。等間隔に置くと人工的すぎるので、木3本ごとに街灯を混ぜる
  let slot = 0;
  for (let x = 3; x < scene.width - 3; x += 13) {
    if (slot % 3 === 2) drawLamp(ctx, x, scene.groundY + 1, palette);
    else drawTree(ctx, x, scene.groundY + 1, palette);
    slot++;
  }
}
