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

      {/* クレーン */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-2">
        <Crane />
      </div>

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

/** CSS アニメーションで揺れるタワークレーン */
function Crane() {
  return (
    <svg
      viewBox="0 0 220 190"
      className="h-44 w-auto max-w-full transition-transform duration-75 ease-out group-active:scale-95 sm:h-56"
      aria-hidden="true"
    >
      {/* 基礎 */}
      <rect x="96" y="168" width="30" height="14" rx="2" fill="#2a3550" />

      {/* マスト */}
      <rect x="104" y="52" width="14" height="118" fill="#f0b429" />
      <path
        d="M104 66 L118 84 M118 66 L104 84 M104 100 L118 118 M118 100 L104 118 M104 134 L118 152 M118 134 L104 152"
        stroke="#b9821b"
        strokeWidth="2.5"
        fill="none"
      />

      {/* 旋回するジブ（腕） */}
      <g className="crane-jib" style={{ transformOrigin: "111px 48px" }}>
        <rect x="44" y="42" width="140" height="9" rx="2" fill="#f0b429" />
        {/* カウンターウェイト */}
        <rect x="40" y="34" width="22" height="25" rx="2" fill="#8c6416" />
        {/* 頂部の支柱とテンションワイヤー */}
        <rect x="107" y="18" width="8" height="26" fill="#c9911f" />
        <path
          d="M111 20 L54 42 M111 20 L176 44"
          stroke="#b9821b"
          strokeWidth="2.5"
          fill="none"
        />
        {/* 吊り具 */}
        <g className="crane-hook">
          <line x1="168" y1="51" x2="168" y2="104" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="157" y="104" width="22" height="15" rx="2" fill="#94a3b8" />
        </g>
      </g>
    </svg>
  );
}
