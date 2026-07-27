"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatNumber } from "../lib/gameLogic";
import Skyline from "./Skyline";

type Props = {
  owned: Record<string, number>;
  /** 1クリックの獲得量（秒間収益から導出された値） */
  clickPower: number;
  /** 現在の着工ゲージに溜まっているクリック数 */
  groundworkClicks: number;
  /** 竣工までに必要なクリック数 */
  groundworkGoal: number;
  /** 次の竣工で得られるボーナスPT */
  completionBonus: number;
  onClick: () => void;
};

type Floater = {
  id: number;
  x: number;
  y: number;
  value: number;
  /** 竣工したクリックなら、そのボーナス額。通常のクリックなら null */
  bonus: number | null;
};

/** 同時に表示するフローティングテキストの上限（連打時の DOM 膨張を防ぐ） */
const MAX_FLOATERS = 14;

/** フローティングテキストが消えるまでの時間(ms)。CSS の float-up と揃える */
const FLOATER_LIFETIME_MS = 900;

/**
 * 中央の着工エリア。エリア全体がクリック対象で、背景にスカイラインが伸びる。
 * 上部に着工ゲージを出し、溜まりきったクリックで竣工ボーナスが入る。
 */
export default function ClickArea({
  owned,
  clickPower,
  groundworkClicks,
  groundworkGoal,
  completionBonus,
  onClick,
}: Props) {
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

      // props はクリック前の状態なので、このクリックで竣工するかを先に判定できる
      const completing = groundworkClicks + 1 >= groundworkGoal;

      const id = nextIdRef.current++;
      setFloaters((prev) => [
        ...prev.slice(-(MAX_FLOATERS - 1)),
        { id, x, y, value: clickPower, bonus: completing ? completionBonus : null },
      ]);

      const timer = window.setTimeout(() => {
        setFloaters((prev) => prev.filter((f) => f.id !== id));
        timersRef.current = timersRef.current.filter((t) => t !== timer);
      }, FLOATER_LIFETIME_MS);
      timersRef.current.push(timer);
    },
    [clickPower, completionBonus, groundworkClicks, groundworkGoal, onClick]
  );

  const progress = Math.min(100, (groundworkClicks / groundworkGoal) * 100);
  const remaining = Math.max(0, groundworkGoal - groundworkClicks);

  return (
    <button
      ref={areaRef}
      type="button"
      onClick={handleClick}
      aria-label={`着工する（+${formatNumber(clickPower)} PT、竣工まであと${remaining}回）`}
      className="from-sky-top via-sky-mid to-sky-low group relative w-full flex-1 cursor-pointer overflow-hidden bg-gradient-to-b text-left"
    >
      {/* 地平線あたりの陽だまり */}
      <div className="daylight from-brick/15 pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t to-transparent" />

      <Skyline owned={owned} />

      {/* 地面 */}
      <div className="bg-ground pointer-events-none absolute inset-x-0 bottom-0 h-2" />

      {/*
        着工ゲージ。背の高いビルと重なると読めなくなるので、
        上部から暗いスクリムをかけて文字のコントラストを確保する。
      */}
      <div className="from-canvas via-canvas/80 pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b to-transparent px-4 pt-3 pb-8">
        <p className="tabular text-ink text-center text-xs">
          1タップ{" "}
          <span className="text-brick-ink font-bold">
            +{formatNumber(clickPower)}
          </span>{" "}
          PT
        </p>

        <div className="mx-auto mt-2 w-full max-w-sm">
          <div className="text-ink-mute flex items-baseline justify-between text-[10px]">
            <span className="tracking-widest">着工ゲージ</span>
            <span className="tabular">
              {groundworkClicks} / {groundworkGoal}
            </span>
          </div>
          <div className="bg-line-strong mt-1 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-brick h-full rounded-full transition-[width] duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="tabular text-ink-mute mt-1 text-right text-[10px]">
            竣工で +{formatNumber(completionBonus)} PT
          </p>
        </div>
      </div>

      {floaters.map((f) => (
        <span
          key={f.id}
          className="float-up pointer-events-none absolute z-10 flex flex-col items-center"
          style={{ left: f.x, top: f.y }}
        >
          <span className="tabular text-brick-ink text-xl font-bold drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">
            +{formatNumber(f.value)}
          </span>
          {f.bonus !== null && (
            <span className="tabular text-sage-ink mt-0.5 text-base font-bold whitespace-nowrap drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">
              竣工！ +{formatNumber(f.bonus)}
            </span>
          )}
        </span>
      ))}
    </button>
  );
}
