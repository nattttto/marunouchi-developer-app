/**
 * ゲーム全体で使う型定義。ここが唯一の正とする。
 */

/** 事業カテゴリのID */
export type CategoryId =
  | "office"
  | "retail"
  | "residence"
  | "infra"
  | "service"
  | "overseas";

/** 事業カテゴリ（オフィス、商業・ホテル、住宅…） */
export type Category = {
  id: CategoryId;
  /** 表示名 */
  name: string;
  /** 幅が限られる場所（カテゴリ帯）で使う短縮名。折り返し行数を抑えるため */
  shortName: string;
  /** タグやチップに使う代表色 */
  color: string;
};

/**
 * 街での描き方。マップは真上からの見下ろしなので、高さではなく
 * **敷地の広さ**と**影の長さ**で描き分ける。
 *
 * | shape | 見下ろしでの姿 |
 * |---|---|
 * | `tower` | 敷地は小さく、影が長い（＝高い） |
 * | `midrise` | 中くらいの敷地、影は中くらい |
 * | `lowrise` | 敷地が広く平たい。影は短い |
 * | `airport` | 一番広く、滑走路の帯が1本入る |
 *
 * 無形の事業（CM事業・設計・PM）も低層の事務所として描く。
 * 「買ったのに街に何も現れない」のは達成感を削ぐので、描かない事業は作らない。
 */
export type AssetShape = "tower" | "midrise" | "lowrise" | "airport";

/**
 * マップのズーム段階。区画が外へ広がりきると次の段階へ引く。
 *
 * `gridRadius` は「その段階で画面に収まる区画の半径」（中心から何マスぶんか）。
 * 段階が上がるたびに1区画の意味が大きくなり（1棟 → 1街区 → 1都市）、
 * 画面には余白ができるので、そこをまた埋めていくことになる。
 */
export type MapStage = {
  id: string;
  /** 段階名。到達時のテロップとラベルに使う */
  name: string;
  /** 1区画が表すもの（「1区画 = 1棟」の右側） */
  unitLabel: string;
  /** この段階で画面に収まる区画の半径（マス） */
  gridRadius: number;
  /**
   * この段階に居られる区画数の上限。超えると次の段階へ引く。
   *
   * 区画は陸にしか建たないので、`gridRadius` からは決まらない
   * （同じ広さでも、陸が細い地形ほど入る数は少ない）。目で見て調整する値。
   */
  capacity: number;
};

/** 保有できる事業・施設1種類ぶんの静的データ（定数。実行中に変化しない） */
export type Asset = {
  /** 内部ID。セーブデータのキーになるので変更禁止 */
  id: string;
  /** 表示名 */
  name: string;
  /** 所属する事業カテゴリ。カテゴリ倍率の集計単位になる */
  categoryId: CategoryId;
  /** 0件保有時の取得コスト(PT) */
  baseCost: number;
  /** 1件取得するごとにコストへ掛かる倍率 */
  costMultiplier: number;
  /** 1件あたりの生産量(PT/s)。倍率がかかる前の素の値 */
  baseProduction: number;
  /** 街での描き方 */
  shape: AssetShape;
  /** スウォッチと街の描画に使う色 */
  color: string;
  /** 街での高さ比（0〜1。1 が一番高い事業） */
  heightRatio: number;
  /** 街での幅比（1.0 = 基準幅） */
  widthRatio: number;
  /** 解放条件。未指定なら最初から解放 */
  unlockRequirement?: {
    assetId: string;
    count: number;
  };
};

/** 保有数のしきい値と、そこで到達する倍率の対 */
export type MultiplierTier = {
  /** この数以上で `multiplier` に到達する */
  threshold: number;
  multiplier: number;
};

/**
 * セーブ・復元されるゲーム状態のすべて。
 *
 * 1クリックの獲得量はここに持たない。秒間収益から導出する（`getClickPower`）ので、
 * 保存すると二重管理になる。
 */
export type GameState = {
  /** 所持PT */
  points: number;
  /** 累計獲得PT（実績・展開率の表示用） */
  totalEarned: number;
  /** 事業ID -> 保有数 */
  owned: Record<string, number>;
  /**
   * マップに置いた区画を**取得順に**並べたもの。中身は事業ID、
   * 竣工でできた区画は `COMPLETION_TILE_ID`。
   *
   * 保有数（`owned`）から毎回組み立てると、安い事業を買い足すたびに
   * 途中へ挿入されて後ろの区画が全部ずれる。「並べ替えない」を守るには
   * 置いた順そのものを持つしかない。
   *
   * 経済の計算に使うのはあくまで `owned` 側。こちらは並び順の記録で、
   * 読み込み時に `owned` / `completions` と数を突き合わせて正規化する。
   */
  placements: string[];
  /** 現在の着工ゲージに溜まっているクリック数 */
  groundworkClicks: number;
  /** 竣工した回数。次のゲージの必要クリック数を決める */
  completions: number;
  /** 最終保存時刻(epoch ms)。オフライン収益の計算に使う */
  lastSavedAt: number;
};
