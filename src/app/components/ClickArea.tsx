"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAP_STAGES } from "../lib/assets";
import { formatNumber } from "../lib/gameLogic";
import { resolveStageIndex } from "../lib/mapScene";
import { playArrival, playCompletion, playTap } from "../lib/sound";
import PixelMap from "./PixelMap";

type Props = {
  owned: Record<string, number>;
  /** 取得順に並んだ区画（`GameState.placements`） */
  placements: string[];
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

/** 段階到達のテロップが出ている時間(ms)。CSS の telop-in と揃える */
const TELOP_MS = 1800;

/**
 * 中央の着工エリア。エリア全体がクリック対象で、背景に見下ろしのマップが広がる。
 * 上部に着工ゲージを出し、溜まりきったクリックで竣工ボーナスが入る。
 */
export default function ClickArea({
  owned,
  placements,
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

  const stageIndex = resolveStageIndex(placements.length);
  /** 段階が上がった直後だけ入る。ズームアウトとテロップの両方に使う */
  const [arrival, setArrival] = useState<{ index: number; zoomFrom: number } | null>(
    null
  );
  const prevStageRef = useRef(stageIndex);

  useEffect(() => {
    const from = prevStageRef.current;
    prevStageRef.current = stageIndex;
    if (stageIndex <= from) return;

    // 1マスの大きさは (半径×2+2) に反比例する。その比がそのまま引きの量になる
    const span = (i: number) => MAP_STAGES[i].gridRadius * 2 + 2;
    setArrival({ index: stageIndex, zoomFrom: span(stageIndex) / span(from) });
    playArrival();

    const timer = window.setTimeout(() => setArrival(null), TELOP_MS);
    return () => window.clearTimeout(timer);
  }, [stageIndex]);

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

      if (completing) playCompletion();
      else playTap((groundworkClicks + 1) / groundworkGoal);

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
      className="bg-ground group relative w-full flex-1 cursor-pointer overflow-hidden text-left"
    >
      {/*
        地面・地形・区画まで canvas 側で描く。
        段階が上がったときの「引き」だけは canvas を描き直さず、
        CSS の transform で外側から縮める（描画は既に新しい縮尺で済んでいる）。
      */}
      <div
        className={`absolute inset-0 ${arrival ? "zoom-out" : ""}`}
        style={
          arrival
            ? ({ "--zoom-from": arrival.zoomFrom } as React.CSSProperties)
            : undefined
        }
      >
        <PixelMap
          placements={placements}
          owned={owned}
          groundworkClicks={groundworkClicks}
          groundworkGoal={groundworkGoal}
        />
      </div>

      {/*
        今どの縮尺を見ているのか。到達演出は一瞬で消えるので、
        常時出しておかないと「何の地図なのか」が分からなくなる。
      */}
      <span className="border-line bg-canvas/80 text-ink pointer-events-none absolute bottom-2 left-2 rounded-lg border px-2 py-1 text-[11px] leading-tight">
        <span className="font-bold">{MAP_STAGES[stageIndex].name}</span>
        <span className="text-ink-mute ml-1.5">
          1区画 = {MAP_STAGES[stageIndex].unitLabel}
        </span>
      </span>

      {arrival && (
        <span className="telop text-brick-ink bg-canvas/85 pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-5 py-2 text-lg font-bold whitespace-nowrap">
          {MAP_STAGES[arrival.index].name}へ広がった
        </span>
      )}

      {/*
        着工ゲージ。背の高いビルと重なると読めなくなるので、
        上部から暗いスクリムをかけて文字のコントラストを確保する。
      */}
      <div className="from-canvas via-canvas/80 pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b to-transparent px-4 pt-3 pb-8">
        {/* 左上のまとめ買いトグルとぶつかるので、中央寄せにはしない */}
        <p className="tabular text-ink pr-1 text-right text-xs">
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

      {/* 指を置いた場所に返す波紋。数字より先に、触れた実感を返すのが役目 */}
      {floaters.map((f) => (
        <span
          key={`ripple-${f.id}`}
          aria-hidden="true"
          className={`ripple border-brick pointer-events-none absolute rounded-full border-2 ${
            f.bonus === null ? "h-10 w-10" : "h-16 w-16"
          }`}
          style={{ left: f.x, top: f.y }}
        />
      ))}

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
