"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Skyline from "./Skyline";

type Props = {
  owned: Record<string, number>;
  clickPower: number;
  onClick: () => void;
};

type Floater = {
  id: number;
  x: number;
  y: number;
  value: number;
};

/** 同時に表示するフローティングテキストの上限（連打時の DOM 膨張を防ぐ） */
const MAX_FLOATERS = 14;

/** フローティングテキストが消えるまでの時間(ms)。CSS の float-up と揃える */
const FLOATER_LIFETIME_MS = 900;

/**
 * 中央の着工エリア。エリア全体がクリック対象で、
 * 背景にスカイライン、手前に建設クレーンが立っている。
 */
export default function ClickArea({ owned, clickPower, onClick }: Props) {
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const areaRef = useRef<HTMLButtonElement>(null);
  const nextIdRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  // アンマウント時に消し忘れのタイマーを片付ける
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick();

      const rect = areaRef.current?.getBoundingClientRect();
      // キーボード操作(Enter/Space)ではクリック座標が 0 になるので中央に出す
      const hasPointer = event.clientX !== 0 || event.clientY !== 0;
      const x = rect && hasPointer ? event.clientX - rect.left : (rect?.width ?? 0) / 2;
      const y = rect && hasPointer ? event.clientY - rect.top : (rect?.height ?? 0) / 2;

      const id = nextIdRef.current++;
      setFloaters((prev) => [...prev.slice(-(MAX_FLOATERS - 1)), { id, x, y, value: clickPower }]);

      const timer = window.setTimeout(() => {
        setFloaters((prev) => prev.filter((f) => f.id !== id));
        timersRef.current = timersRef.current.filter((t) => t !== timer);
      }, FLOATER_LIFETIME_MS);
      timersRef.current.push(timer);
    },
    [clickPower, onClick]
  );

  return (
    <button
      ref={areaRef}
      type="button"
      onClick={handleClick}
      aria-label={`着工する（+${clickPower} PT）`}
      className="group relative w-full flex-1 cursor-pointer overflow-hidden bg-gradient-to-b from-[#0d1730] via-[#122040] to-[#1b2c52] text-left"
    >
      {/* 夜空の光 */}
      <div className="skyline-glow pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-amber-400/15 to-transparent" />

      <Skyline owned={owned} />

      {/* 地面 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2 bg-[#050a14]" />

      {/* クリックの手応え。押している間だけ全体がわずかに光る */}
      <div className="pointer-events-none absolute inset-0 bg-amber-300/0 transition-colors duration-75 group-active:bg-amber-300/[0.07]" />

      <p className="pointer-events-none absolute inset-x-0 top-3 text-center text-xs tracking-[0.3em] text-slate-300/70">
        TAP TO BUILD
      </p>

      {floaters.map((f) => (
        <span
          key={f.id}
          className="float-up tabular pointer-events-none absolute z-10 text-xl font-bold text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
          style={{ left: f.x, top: f.y }}
        >
          +{f.value}
        </span>
      ))}
    </button>
  );
}
