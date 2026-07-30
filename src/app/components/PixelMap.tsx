"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { COMPLETION_TILE_ID } from "../lib/assets";
import { drawMap, drawPlacementFlash, readMapPalette } from "../lib/mapRender";
import { buildMapScene } from "../lib/mapScene";

type Props = {
  /** 取得順に並んだ区画（`GameState.placements`） */
  placements: string[];
  /** 成長段階を決めるための保有数 */
  owned: Record<string, number>;
  /** 現在の着工ゲージに溜まっているクリック数 */
  groundworkClicks: number;
  /** 竣工までに必要なクリック数 */
  groundworkGoal: number;
};

/**
 * CSS ピクセル ÷ この値 = canvas の論理ピクセル。
 * 大きいほどドットが粗くなる。3 で「ドット絵」として読める粗さになる。
 */
const PIXEL_SCALE = 3;

/** 区画が増えたときの光の長さ(ms) */
const FLASH_MS = 520;

/**
 * 保有している事業を見下ろしのマップとして描く canvas。
 *
 * 論理解像度を container のサイズから毎回決め直しているので、
 * 画面幅が変わってもドットが正方形のまま保たれる（CSS で引き伸ばさない）。
 *
 * **地名だけは canvas ではなく DOM で重ねる。** ドット絵の解像度で文字を描くと
 * 潰れて読めないため。位置はシーンが持つ論理座標を百分率へ直して合わせる。
 */
function PixelMap({
  placements,
  owned,
  groundworkClicks,
  groundworkGoal,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  /** 前回の区画数。増えていれば、その1つが今回置かれたもの */
  const placedRef = useRef(placements.length);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;

    // 同じサイズで再描画しないよう、変化したときだけ state を更新する
    const measure = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    };

    // ResizeObserver の通知はレンダリングステップで配信されるので、
    // タブが描画されていない状況では届かないことがある。
    // 初回は同期で測っておく（初期表示が1フレーム速くなる利点もある）。
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 描画とラベルの両方がシーンを要るので、render の中で組んでおく
  const scene = useMemo(() => {
    if (size.width === 0 || size.height === 0) return null;
    return buildMapScene(
      placements,
      owned,
      { clicks: groundworkClicks, goal: groundworkGoal },
      Math.max(1, Math.round(size.width / PIXEL_SCALE)),
      Math.max(1, Math.round(size.height / PIXEL_SCALE))
    );
  }, [placements, owned, groundworkClicks, groundworkGoal, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;

    canvas.width = scene.width;
    canvas.height = scene.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const palette = readMapPalette(canvas);

    // **マップ本体は必ず同期で描く。** requestAnimationFrame はタブが描画されて
    // いないと発火しないので、これを描画の起点にするとマップごと消える（実際に踏んだ）。
    // rAF は光の演出を重ねるためだけに使う
    drawMap(ctx, scene, palette);

    const grew = scene.tiles.length > placedRef.current;
    placedRef.current = scene.tiles.length;

    const placed = grew ? scene.tiles[scene.tiles.length - 1] : undefined;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!placed || reduceMotion) return;

    // 光っている間だけ回す。止まっている間はフレームを消費しない
    const strong = placed.id === COMPLETION_TILE_ID;
    const start = performance.now();
    let frame = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FLASH_MS);
      drawMap(ctx, scene, palette);
      drawPlacementFlash(ctx, placed, t, strong, palette);
      if (t < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [scene]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="h-full w-full [image-rendering:pixelated]"
      />

      {scene?.labels.map((label) => (
        <span
          key={label.text}
          className="text-ink-soft bg-canvas/55 absolute -translate-x-1/2 -translate-y-1/2 rounded px-1 text-[10px] tracking-wider whitespace-nowrap"
          style={{
            left: `${(label.x / scene.width) * 100}%`,
            top: `${(label.y / scene.height) * 100}%`,
          }}
        >
          {label.text}
        </span>
      ))}
    </div>
  );
}

export default memo(PixelMap);
