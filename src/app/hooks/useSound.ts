"use client";

import { useCallback, useEffect, useState } from "react";
import { loadMuted, writeMuted } from "../lib/saveData";
import { setMuted } from "../lib/sound";

/**
 * 消音設定と、音源モジュールの橋渡し。
 *
 * 音を鳴らす関数（`playTap` など）は `lib/sound.ts` から直接呼ぶ。
 * 鳴らす側は消音かどうかを気にしなくてよく、状態を配って回る必要もない。
 * このフックが持つのは**トグルの表示に要る state だけ**。
 */
export function useSound() {
  const [muted, setMutedState] = useState(false);

  // localStorage は SSR で読めないので、マウント後に反映する
  useEffect(() => {
    const saved = loadMuted();
    setMutedState(saved);
    setMuted(saved);
  }, []);

  const toggleMuted = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      setMuted(next);
      writeMuted(next);
      return next;
    });
  }, []);

  return { muted, toggleMuted };
}
