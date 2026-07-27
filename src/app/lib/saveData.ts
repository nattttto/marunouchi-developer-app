import { ASSETS } from "./assets";
import { getTotalRate } from "./gameLogic";
import type { GameState } from "./types";

/**
 * localStorage への保存・復元と、オフライン収益の計算。
 * ここだけが localStorage を触る。
 */

/** 保存キー。セーブ形式を壊す変更をしたら v2, v3... と上げる */
export const SAVE_KEY = "marunouchi-developer:save:v1";

/**
 * オフライン収益の上限（秒）。
 * これを超えて放置しても、この時間ぶんまでしか加算しない。
 * 数値バランスの調整ポイントなのでここで一元管理する。
 */
export const MAX_OFFLINE_SECONDS = 8 * 60 * 60;

/** これ未満の離脱時間ならオフライン収益の演出を出さない（秒） */
export const MIN_OFFLINE_SECONDS = 10;

export type OfflineEarnings = {
  /** 実際に収益計算に使った秒数（上限適用後） */
  seconds: number;
  /** 離脱していた実時間（秒。上限適用前） */
  elapsedSeconds: number;
  /** 加算された PT */
  points: number;
  /** 上限に達して打ち切られたか */
  capped: boolean;
};

/** まっさらな状態 */
export function createInitialState(): GameState {
  return {
    points: 0,
    totalEarned: 0,
    owned: Object.fromEntries(ASSETS.map((a) => [a.id, 0])),
    groundworkClicks: 0,
    completions: 0,
    lastSavedAt: Date.now(),
  };
}

/** 0以上の有限数に丸める。壊れた値・改ざんされた値の受け口 */
function toSafeNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

/**
 * 保存された JSON を GameState に正規化する。
 * 知らない事業IDは捨て、足りないIDは 0 で埋めるので、
 * 事業マスタを増減してもセーブデータが壊れない。
 */
function normalize(raw: unknown): GameState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Partial<GameState>;

  const owned: Record<string, number> = {};
  for (const asset of ASSETS) {
    owned[asset.id] = Math.floor(toSafeNumber(data.owned?.[asset.id], 0));
  }
  return {
    points: toSafeNumber(data.points, 0),
    totalEarned: toSafeNumber(data.totalEarned, 0),
    owned,
    groundworkClicks: Math.floor(toSafeNumber(data.groundworkClicks, 0)),
    completions: Math.floor(toSafeNumber(data.completions, 0)),
    lastSavedAt: toSafeNumber(data.lastSavedAt, Date.now()),
  };
}

/** セーブを読む。無い・壊れている場合は null */
export function loadSave(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    // 壊れたセーブは無かったことにして新規スタートさせる
    return null;
  }
}

/** セーブを書く。`lastSavedAt` は書き込み時刻で打ち直す */
export function writeSave(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    const payload: GameState = { ...state, lastSavedAt: Date.now() };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // 容量超過・プライベートモードなどは黙って諦める（進行は続行させる）
  }
}

/** セーブを消す（リセット用） */
export function clearSave(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // 消せなくても進行は続行させる
  }
}

/**
 * 離脱していた間の収益を計算する。
 * 収益率は「保存時の保有数」から求める（= 保存時の秒間収益）。
 * 演出を出すほどでもない場合は null を返す。
 */
export function calcOfflineEarnings(
  state: GameState,
  now: number = Date.now()
): OfflineEarnings | null {
  const elapsedSeconds = (now - state.lastSavedAt) / 1000;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < MIN_OFFLINE_SECONDS) {
    return null;
  }

  const seconds = Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS);
  const points = getTotalRate(ASSETS, state.owned) * seconds;
  if (points < 1) return null;

  return {
    seconds,
    elapsedSeconds,
    points,
    capped: elapsedSeconds > MAX_OFFLINE_SECONDS,
  };
}
