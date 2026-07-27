"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { ASSETS, ASSET_MAP } from "../lib/assets";
import { IS_DEV } from "../lib/env";
import {
  getCategoryCounts,
  getCategoryMultipliers,
  getClickPower,
  getCompletionBonus,
  getCost,
  getEffectiveProduction,
  getGroundworkGoal,
  getGroupSynergyMultiplier,
  getTotalRate,
  isUnlocked,
} from "../lib/gameLogic";
import {
  calcOfflineEarnings,
  clearSave,
  createInitialState,
  loadSave,
  writeSave,
  type OfflineEarnings,
} from "../lib/saveData";
import type { GameState } from "../lib/types";

/** ゲームループの刻み(ms)。表示が滑らかに見える程度に細かくする */
const TICK_MS = 100;

/** 自動セーブの間隔(ms) */
const AUTOSAVE_MS = 5_000;

type Action =
  | { type: "load"; state: GameState }
  | { type: "click" }
  | { type: "buy"; assetId: string }
  | { type: "tick"; seconds: number }
  | { type: "grant"; points: number }
  | { type: "devGrantAll" }
  | { type: "reset" };

/** 状態遷移はすべてここ。副作用を持たない純粋関数 */
function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "load":
      return action.state;

    /**
     * クリック1回。獲得量は秒間収益から導出する。
     * あわせて着工ゲージを1進め、目標に達したら竣工ボーナスをまとめて加算する。
     */
    case "click": {
      const rate = getTotalRate(ASSETS, state.owned);
      const gain = getClickPower(rate);
      const clicks = state.groundworkClicks + 1;
      const goal = getGroundworkGoal(state.completions);

      if (clicks < goal) {
        return {
          ...state,
          points: state.points + gain,
          totalEarned: state.totalEarned + gain,
          groundworkClicks: clicks,
        };
      }

      const bonus = getCompletionBonus(rate, goal);
      return {
        ...state,
        points: state.points + gain + bonus,
        totalEarned: state.totalEarned + gain + bonus,
        groundworkClicks: 0,
        completions: state.completions + 1,
      };
    }

    case "tick": {
      const gained = getTotalRate(ASSETS, state.owned) * action.seconds;
      if (gained <= 0) return state;
      return {
        ...state,
        points: state.points + gained,
        totalEarned: state.totalEarned + gained,
      };
    }

    case "grant":
      return {
        ...state,
        points: state.points + action.points,
        totalEarned: state.totalEarned + action.points,
      };

    case "buy": {
      const asset = ASSET_MAP[action.assetId];
      if (!asset) return state;
      if (!isUnlocked(asset, state.owned)) return state;

      const count = state.owned[asset.id] ?? 0;
      const cost = getCost(asset, count);
      if (state.points < cost) return state;

      return {
        ...state,
        points: state.points - cost,
        owned: { ...state.owned, [asset.id]: count + 1 },
      };
    }

    /**
     * 開発用。全事業を1件ずつ、コストも解放条件も無視して増やす。
     * 1回押せば全事業が解放され、押した回数ぶん保有数が積める
     * （倍率のしきい値やスカイラインの描画を確認するため）。
     */
    case "devGrantAll": {
      const owned = { ...state.owned };
      for (const asset of ASSETS) {
        owned[asset.id] = (owned[asset.id] ?? 0) + 1;
      }
      return { ...state, owned };
    }

    case "reset":
      return createInitialState();
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, null, createInitialState);
  /** localStorage の読み込みが済むまで true にならない（SSR とのズレを防ぐ） */
  const [loaded, setLoaded] = useState(false);
  const [offline, setOffline] = useState<OfflineEarnings | null>(null);

  // 保存用に最新の state を保持しておく（interval のクロージャ対策）
  const stateRef = useRef(state);
  stateRef.current = state;

  // 初回マウント時にセーブを復元し、オフライン収益を加算する
  useEffect(() => {
    const saved = loadSave();
    if (saved) {
      dispatch({ type: "load", state: saved });
      const earnings = calcOfflineEarnings(saved);
      if (earnings) {
        dispatch({ type: "grant", points: earnings.points });
        setOffline(earnings);
      }
    }
    setLoaded(true);
  }, []);

  // 秒間収益を加算するゲームループ。実時間の差分で按分するので
  // タブが非アクティブになって間引かれても取りこぼさない
  useEffect(() => {
    if (!loaded) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const seconds = (now - last) / 1000;
      last = now;
      if (seconds > 0) dispatch({ type: "tick", seconds });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [loaded]);

  // 自動セーブ。定期実行に加えて、離脱の瞬間にも必ず書く
  useEffect(() => {
    if (!loaded) return;
    const save = () => writeSave(stateRef.current);

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") save();
    };

    const id = window.setInterval(save, AUTOSAVE_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", save);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [loaded]);

  /**
   * 保有数から導出される値はまとめてここで計算する。
   * state に持たせると二重管理でズレるため。
   * 倍率は全事業で共有するので、1回だけ求めて使い回す。
   */
  const derived = useMemo(() => {
    const { owned } = state;
    const categoryMultipliers = getCategoryMultipliers(owned);
    const groupMultiplier = getGroupSynergyMultiplier(owned);

    const costs: Record<string, number> = {};
    const unlocked: Record<string, boolean> = {};
    const effectiveProduction: Record<string, number> = {};

    for (const asset of ASSETS) {
      costs[asset.id] = getCost(asset, owned[asset.id] ?? 0);
      unlocked[asset.id] = isUnlocked(asset, owned);
      effectiveProduction[asset.id] = getEffectiveProduction(
        asset,
        categoryMultipliers,
        groupMultiplier
      );
    }

    const totalRate = getTotalRate(ASSETS, owned);
    const groundworkGoal = getGroundworkGoal(state.completions);

    return {
      categoryCounts: getCategoryCounts(owned),
      categoryMultipliers,
      groupMultiplier,
      costs,
      unlocked,
      effectiveProduction,
      totalRate,
      clickPower: getClickPower(totalRate),
      groundworkGoal,
      completionBonus: getCompletionBonus(totalRate, groundworkGoal),
    };
  }, [state]);

  const click = useCallback(() => dispatch({ type: "click" }), []);

  const buy = useCallback(
    (assetId: string) => dispatch({ type: "buy", assetId }),
    []
  );

  const reset = useCallback(() => {
    clearSave();
    dispatch({ type: "reset" });
    setOffline(null);
  }, []);

  const dismissOffline = useCallback(() => setOffline(null), []);

  // 開発用。本番では呼ばれても何もしない（ボタン自体も描画されない）
  const devGrantAll = useCallback(() => {
    if (!IS_DEV) return;
    dispatch({ type: "devGrantAll" });
  }, []);

  const devGrantPoints = useCallback((points: number) => {
    if (!IS_DEV) return;
    dispatch({ type: "grant", points });
  }, []);

  return {
    state,
    loaded,
    offline,
    ...derived,
    click,
    buy,
    reset,
    dismissOffline,
    devGrantAll,
    devGrantPoints,
  };
}
