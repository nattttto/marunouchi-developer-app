"use client";

import { memo, useEffect, useRef, useState } from "react";
import { drawCity, readCityPalette } from "../lib/cityRender";
import { buildCityScene } from "../lib/cityScene";

type Props = {
  owned: Record<string, number>;
};

/**
 * CSS ピクセル ÷ この値 = canvas の論理ピクセル。
 * 大きいほどドットが粗くなる。3 で「ドット絵」として読める粗さになる。
 */
const PIXEL_SCALE = 3;

/**
 * 保有している事業を街として描く canvas。
 *
 * 論理解像度を container のサイズから毎回決め直しているので、
 * 画面幅が変わってもドットが正方形のまま保たれる（CSS で引き伸ばさない）。
 */
function PixelCity({ owned }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const logicalWidth = Math.max(1, Math.round(size.width / PIXEL_SCALE));
    const logicalHeight = Math.max(1, Math.round(size.height / PIXEL_SCALE));
    canvas.width = logicalWidth;
    canvas.height = logicalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawCity(
      ctx,
      buildCityScene(owned, logicalWidth, logicalHeight),
      readCityPalette(canvas)
    );
  }, [owned, size]);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="h-full w-full [image-rendering:pixelated]"
      />
    </div>
  );
}

export default memo(PixelCity);
