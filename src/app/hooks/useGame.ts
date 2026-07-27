"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { BUILDINGS, BUILDING_MAP } from "../lib/buildings";
import { getCost, getTotalRate, isUnlocked } from "../lib/gameLogic";
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
  | { type: "buy"; buildingId: string }
  | { type: "tick"; seconds: number }
  | { type: "grant"; points: number }
  | { type: "reset" };

/** 状態遷移はすべてここ。副作用を持たない純粋関数 */
function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "load":
      return action.state;

    case "click":
      return {
        ...state,
        points: state.points + state.clickPower,
        totalEarned: state.totalEarned + state.clickPower,
      };

    case "tick": {
      const gained = getTotalRate(BUILDINGS, state.owned) * action.seconds;
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
      const building = BUILDING_MAP[action.buildingId];
      if (!building) return state;
      if (!isUnlocked(building, state.owned)) return state;

      const count = state.owned[building.id] ?? 0;
      const cost = getCost(building, count);
      if (state.points < cost) return state;

      return {
        ...state,
        points: state.points - cost,
        owned: { ...state.owned, [building.id]: count + 1 },
      };
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

  const totalRate = useMemo(
    () => getTotalRate(BUILDINGS, state.owned),
    [state.owned]
  );

  /** 建物ID -> 次の1棟のコスト。保有数が変わったときだけ再計算する */
  const costs = useMemo(() => {
    const result: Record<string, number> = {};
    for (const building of BUILDINGS) {
      result[building.id] = getCost(building, state.owned[building.id] ?? 0);
    }
    return result;
  }, [state.owned]);

  /** 建物ID -> 解放済みか */
  const unlocked = useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const building of BUILDINGS) {
      result[building.id] = isUnlocked(building, state.owned);
    }
    return result;
  }, [state.owned]);

  const click = useCallback(() => dispatch({ type: "click" }), []);

  const buy = useCallback(
    (buildingId: string) => dispatch({ type: "buy", buildingId }),
    []
  );

  const reset = useCallback(() => {
    clearSave();
    dispatch({ type: "reset" });
    setOffline(null);
  }, []);

  const dismissOffline = useCallback(() => setOffline(null), []);

  return {
    state,
    loaded,
    totalRate,
    costs,
    unlocked,
    offline,
    click,
    buy,
    reset,
    dismissOffline,
  };
}
