/**
 * ゲーム全体で使う型定義。ここが唯一の正とする。
 */

/** 建物1種類ぶんの静的データ（定数。実行中に変化しない） */
export type Building = {
  /** 内部ID。セーブデータのキーになるので変更禁止 */
  id: string;
  /** 表示名 */
  name: string;
  /** 0棟保有時の購入コスト(PT) */
  baseCost: number;
  /** 1棟買うごとにコストへ掛かる倍率 */
  costMultiplier: number;
  /** 1棟あたりの生産量(PT/s) */
  baseProduction: number;
  /** スカイライン描画とショップのスウォッチに使う色 */
  color: string;
  /** スカイライン描画時の高さ比（0〜1。エリア高さに対する割合） */
  heightRatio: number;
  /** スカイライン描画時の幅比（1.0 = 基準幅） */
  widthRatio: number;
  /** 解放条件。未指定なら最初から解放 */
  unlockRequirement?: {
    buildingId: string;
    count: number;
  };
};

/** セーブ・復元されるゲーム状態のすべて */
export type GameState = {
  /** 所持PT */
  points: number;
  /** 累計獲得PT（実績・開発率の表示用） */
  totalEarned: number;
  /** 建物ID -> 保有数 */
  owned: Record<string, number>;
  /** 1クリックあたりの獲得量 */
  clickPower: number;
  /** 最終保存時刻(epoch ms)。オフライン収益の計算に使う */
  lastSavedAt: number;
};
