/**
 * ズーム段階ごとの地形シルエット。
 *
 * **画像素材は使わない**方針なので、文字列のドット絵で持つ。
 * 1文字が1マスではなく、キャンバスに合わせて拡大される背景なので、
 * 解像度は「輪郭がそれと分かる」程度で足りる。
 *
 * | 文字 | 意味 | 建てられるか |
 * |---|---|---|
 * | `#` | この段階で開発する陸 | ○ |
 * | `o` | 圏外の陸（まだ手が届かない隣の地方） | × |
 * | `~` | 水（海・湾・堀） | × |
 * | `*` | 緑地（皇居） | × |
 * | `B` | 既存の建物（東京駅） | × |
 * | `.` | 何も描かない（`sea` が true なら海のまま） | × |
 *
 * **街は必ずキャンバスの中央から広がる。** どの地形も中央が `#` になるように
 * 描いてある（丸の内・東京都の23区・関東の中央・東日本の関東・日本の関東・
 * 世界地図の日本、がすべて中央で重なる）。
 *
 * `o` があるおかげで、段階が上がるたびに「次に開発する地方」が
 * 色の違いとして見える。街がその境目で止まる理由も分かる。
 */

/** 地形に添える地名。位置はビットマップ上の列・行で指定する */
export type TerrainLabel = {
  text: string;
  col: number;
  row: number;
};

export type Terrain = {
  /**
   * 背景を海で塗るか。列島・世界地図は海の上に描く。
   *
   * 陸の地形（丸の内・東京都・関東）では、**ビットマップの外側へ縁の文字を延ばす**
   * フラグも兼ねる。地形は街が広がる正方形の範囲に合わせて置くので、
   * 横長の画面では左右に余りが出る。そこを延長しないと、東京湾が
   * 画面の途中で切れて「真ん中に四角い海がある」ように見えてしまう。
   */
  sea: boolean;
  rows: string[];
  /**
   * 地名ラベル。**canvas ではなく DOM で描く。**
   * ドット絵の解像度で文字を描くと潰れて読めないため。
   */
  labels: TerrainLabel[];
};

/**
 * 地形を組み立てる。**短い行は `fill` で右端まで埋める。**
 *
 * 全行を同じ長さで手書きすると、1文字ずれただけで地形が斜めに崩れる。
 * 意味のある左側だけ書いて、残りは埋めさせるほうが事故が少ない。
 */
function defineTerrain(spec: {
  sea?: boolean;
  /** 行の右側を埋める文字 */
  fill: string;
  /** 1行の長さ */
  width: number;
  rows: string[];
  labels: TerrainLabel[];
}): Terrain {
  return {
    sea: spec.sea ?? false,
    labels: spec.labels,
    rows: spec.rows.map((row) =>
      row.length >= spec.width
        ? row.slice(0, spec.width)
        : row + spec.fill.repeat(spec.width - row.length)
    ),
  };
}

/**
 * 丸の内。西（左）に皇居とお堀、東（右）に東京駅。
 * この2つに挟まれた区画が丸の内そのものなので、街はその間から育つ。
 */
const MARUNOUCHI = defineTerrain({
  fill: "#",
  width: 14,
  rows: [
    "****~",
    "****~",
    "****~",
    "****~#####B",
    "****~#####B",
    "****~#####B",
    "****~#####B",
    "****~#####B",
    "****~#####B",
    "****~#####B",
    "****~#####B",
    "****~",
    "****~",
    "****~",
  ],
  labels: [
    { text: "皇居", col: 1.5, row: 6 },
    { text: "東京駅", col: 10, row: 1.5 },
  ],
});

/**
 * 東京都。西へ細長く伸びる都域の東端（23区）が中央に来る。
 * 右下が東京湾、周りの `o` は埼玉・神奈川・千葉。
 */
const TOKYO = defineTerrain({
  fill: "o",
  width: 24,
  rows: [
    "",
    "",
    "",
    "",
    "oooooooooo####",
    "oooooooo######",
    "o#############",
    "o#############",
    "o#############",
    "oo############",
    "ooooo#########~~~~~~~~~~",
    "oooooooo######~~~~~~~~~~",
    "ooooooooo#####~~~~~~~~~~",
    "ooooooooooo###~~~~~~~~~~",
    "oooooooooooo~~~~~~~~~~~~",
    "ooooooooooo~~~~~~~~~~~~~",
  ],
  labels: [
    { text: "多摩", col: 3, row: 7.5 },
    { text: "23区", col: 11, row: 4.5 },
    { text: "東京湾", col: 17, row: 12 },
  ],
});

/**
 * 関東。中央が東京、下へ伸びる入り江が東京湾、その東の鉤形が房総半島。
 * 左と上の `o` は中部・東北の山地。
 */
const KANTO = defineTerrain({
  fill: "o",
  width: 36,
  rows: [
    "",
    "",
    "ooooooooo##########",
    "oooooooo#############",
    "ooooooo################",
    "oooooo##################",
    "ooooo###################~~~~~~~~~~~",
    "ooooo####################~~~~~~~~~~",
    "oooo#####################~~~~~~~~~~",
    "oooo#####################~~~~~~~~~~",
    "oooo#####################~~~~~~~~~~",
    "ooooo####################~~~~~~~~~~",
    "ooooo####################~~~~~~~~~~",
    "oooooo###################~~~~~~~~~~",
    "oooooo##################~~~~~~~~~~~",
    "ooooooo#########~~~######~~~~~~~~~~",
    "oooooooo########~~~~#####~~~~~~~~~~",
    "ooooooooo######~~~~~#####~~~~~~~~~~",
    "oooooooooo####~~~~~~#####~~~~~~~~~~",
    "ooooooooooo###~~~~~~#####~~~~~~~~~~",
    "oooooooooooo#~~~~~~~####~~~~~~~~~~~",
    "ooooooooooooo~~~~~~~###~~~~~~~~~~~~",
    "oooooooooooo~~~~~~~~##~~~~~~~~~~~~~",
    "ooooooooooo~~~~~~~~~~~~~~~~~~~~~~~~",
    "oooooooooo~~~~~~~~~~~~~~~~~~~~~~~~~",
    "ooooooooo~~~~~~~~~~~~~~~~~~~~~~~~~~",
  ],
  labels: [
    { text: "東京", col: 14, row: 12.5 },
    { text: "東京湾", col: 15.5, row: 19 },
    { text: "房総", col: 21, row: 18 },
    { text: "太平洋", col: 28, row: 8 },
  ],
});

/**
 * 東日本。北海道・東北・関東・中部までを開発対象にして、
 * 西日本（`o`）は次の段階まで手つかずにしておく。中央は関東。
 */
const EAST_JAPAN = defineTerrain({
  sea: true,
  fill: ".",
  width: 34,
  rows: [
    ".........................######",
    "......................##########",
    ".....................###########",
    ".....................##########",
    "......................######",
    ".......................####",
    "......................####",
    ".....................#####",
    "....................######",
    "...................######",
    "..................#######",
    ".................#######",
    "................########",
    "...............########",
    "..............#########",
    ".............#########",
    "............##########",
    "..........###########",
    ".........##########",
    "........#########",
    ".......########",
    "......#######",
    ".....######",
    "....ooo###",
    "...ooooo#",
    "..oooooo",
    "..ooooo",
    ".oooo",
    ".ooo",
    "oo",
  ],
  labels: [
    { text: "北海道", col: 24, row: 1 },
    { text: "東北", col: 20, row: 9 },
    { text: "関東", col: 15.5, row: 16.5 },
    { text: "西日本", col: 2, row: 25 },
  ],
});

/**
 * 日本列島。北海道を右上に、九州を左下に置いた北東〜南西の並び。
 *
 * 実際の列島より**太らせてある**。段階の収容数は陸のマス数で決まるので、
 * 写実的な細さだと日本段階がすぐ埋まってしまい、区画も細い線にしか見えない。
 */
const JAPAN = defineTerrain({
  sea: true,
  fill: ".",
  width: 28,
  rows: [
    "....................####",
    "..................########",
    ".................#########",
    ".................########",
    "..................#####",
    "..................####",
    ".................###",
    "................####",
    "...............#####",
    "...............#####",
    "..............#####",
    "..............#####",
    ".............#####",
    ".............#####",
    "............######",
    "...........######",
    "..........######",
    ".........######",
    "........######",
    "........#####",
    ".......#####",
    "......#####",
    ".....#####",
    "....#####",
    "...#####",
    "..#####",
    "..####...##",
    ".####...###",
    ".####....#",
    ".####",
    ".###",
    ".###",
    "..##",
    "..#",
  ],
  labels: [
    { text: "北海道", col: 19, row: 2 },
    { text: "関東", col: 17.5, row: 15 },
    { text: "九州", col: 4.5, row: 30 },
  ],
});

/**
 * 世界地図。**日本が中央に来るよう太平洋中心**に描いてある。
 * 左がユーラシアとアフリカ、右が南北アメリカ、中央下がオーストラリア。
 */
const WORLD = defineTerrain({
  sea: true,
  fill: ".",
  width: 44,
  rows: [
    "",
    ".....########.....................######",
    "...##############...............##########",
    "..################.............###########",
    "..#################...........###########",
    "...##################........###########",
    "....##################.......##########",
    ".....##################.......########",
    ".....#################........#######",
    "......###############.........######",
    "......##############..........#####",
    ".......###########....#.......####",
    ".......#########......##.......###",
    "........########......##...............###",
    "........#######.......#...............####",
    "........######........................####",
    "........#####......###.................####",
    "........#####.....####................####",
    "........####.......###.................###",
    "........####...........####...........###",
    "........###...........######..........###",
    "........###...........######..........##",
    ".........##............####...........##",
    ".........#..............##.............#",
    ".......................................#",
    "",
  ],
  labels: [
    { text: "ユーラシア", col: 6, row: 5 },
    { text: "北米", col: 33, row: 4 },
    { text: "南米", col: 38.5, row: 18 },
    { text: "豪州", col: 23, row: 20 },
  ],
});

export const TERRAINS: Record<string, Terrain | undefined> = {
  marunouchi: MARUNOUCHI,
  tokyo: TOKYO,
  kanto: KANTO,
  "east-japan": EAST_JAPAN,
  japan: JAPAN,
  world: WORLD,
};

/** 区画を建てられる地形文字 */
export const BUILDABLE = "#";

/** 建てられる文字の数。段階の収容数の計算に使う */
export function countBuildable(terrain: Terrain): number {
  let count = 0;
  for (const row of terrain.rows) {
    for (const char of row) if (char === BUILDABLE) count++;
  }
  return count;
}

/** ビットマップをキャンバスへ収めるときの拡大率と余白 */
export type TerrainLayout = {
  scale: number;
  offsetX: number;
  offsetY: number;
  cols: number;
  rows: number;
};

/**
 * 地形の収め方を1か所で決める。
 * 描画（`mapRender`）と、区画を置ける場所の判定（`mapScene`）が
 * 別々に計算すると、見えている陸と建てられる陸がずれる。
 *
 * **拡大率は短い辺（＝街が広がる正方形の範囲）で決める。**
 * キャンバスの幅で決めると、横長の画面でビットマップが巨大化して
 * 縦が切れ、皇居や湾が画面外へ出てしまう（実際に踏んだ）。
 */
export function getTerrainLayout(
  terrain: Terrain,
  width: number,
  height: number
): TerrainLayout {
  const cols = terrain.rows[0].length;
  const rows = terrain.rows.length;
  const scale = Math.min(width, height) / Math.max(cols, rows);

  return {
    scale,
    offsetX: (width - cols * scale) / 2,
    offsetY: (height - rows * scale) / 2,
    cols,
    rows,
  };
}

/** ビットマップの列・行 → キャンバス上の座標（文字の中心） */
export function terrainToCanvas(
  layout: TerrainLayout,
  col: number,
  row: number
): { x: number; y: number } {
  return {
    x: layout.offsetX + (col + 0.5) * layout.scale,
    y: layout.offsetY + (row + 0.5) * layout.scale,
  };
}

/**
 * ビットマップ上の文字を引く。
 *
 * 陸の地形（`sea: false`）では範囲外を**縁の文字で埋める**（clamp）。
 * 海の地形では範囲外は `.`（＝海）のままにする。
 */
export function charAt(terrain: Terrain, col: number, row: number): string {
  const rows = terrain.rows.length;
  const cols = terrain.rows[0].length;

  if (terrain.sea) {
    if (col < 0 || row < 0 || col >= cols || row >= rows) return ".";
    return terrain.rows[row][col];
  }

  const r = Math.min(rows - 1, Math.max(0, row));
  const c = Math.min(cols - 1, Math.max(0, col));
  return terrain.rows[r][c];
}

/** キャンバス上の座標がどの地形文字にあたるか */
export function terrainAt(
  terrain: Terrain,
  layout: TerrainLayout,
  x: number,
  y: number
): string {
  return charAt(
    terrain,
    Math.floor((x - layout.offsetX) / layout.scale),
    Math.floor((y - layout.offsetY) / layout.scale)
  );
}

/**
 * ビットマップを描くときに走査する範囲。
 * 陸の地形では、キャンバスの端まで縁を延ばすため範囲を広げる。
 */
export function terrainDrawRange(
  terrain: Terrain,
  layout: TerrainLayout,
  width: number,
  height: number
): { colFrom: number; colTo: number; rowFrom: number; rowTo: number } {
  if (terrain.sea) {
    return { colFrom: 0, colTo: layout.cols, rowFrom: 0, rowTo: layout.rows };
  }
  return {
    colFrom: Math.floor(-layout.offsetX / layout.scale),
    colTo: Math.ceil((width - layout.offsetX) / layout.scale),
    rowFrom: Math.floor(-layout.offsetY / layout.scale),
    rowTo: Math.ceil((height - layout.offsetY) / layout.scale),
  };
}
