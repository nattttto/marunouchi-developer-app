"use client";

import { memo, useMemo } from "react";
import { ASSETS, MAX_TOTAL_SILHOUETTES } from "../lib/assets";
import { getSilhouetteCount } from "../lib/gameLogic";
import type { AssetShape } from "../lib/types";

type Props = {
  owned: Record<string, number>;
};

type Silhouette = {
  key: string;
  color: string;
  shape: AssetShape;
  heightRatio: number;
  width: number;
};

/** シルエット1本の基準幅(px)。狭い画面では flex が自動で縮める */
const BASE_WIDTH = 18;

/** 空港の管制塔の高さ(px) */
const CONTROL_TOWER_HEIGHT = 24;

/** 窓明かりの点グリッド。縦に伸びる建物用 */
const WINDOW_GRID = "radial-gradient(rgba(255,214,130,0.5) 42%, transparent 46%)";

/** 横に長い施設（アウトレット・物流・空港）用の横帯 */
const FACADE_BANDS =
  "repeating-linear-gradient(to bottom, rgba(255,220,160,0.34) 0 2px, transparent 2px 8px)";

function surfaceStyle(shape: AssetShape): React.CSSProperties {
  if (shape === "lowrise" || shape === "airport") {
    return { backgroundImage: FACADE_BANDS };
  }
  return { backgroundImage: WINDOW_GRID, backgroundSize: "7px 9px" };
}

/**
 * 保有している事業を背景のスカイラインとして描く。
 *
 * 事業が21種あるため全部を上限まで描くと横に潰れる。
 * そこで上位（＝コストの高い）事業から順に積み、`MAX_TOTAL_SILHOUETTES` で打ち切る。
 * 結果として下位の事業は自然に消え、主力事業が前に出る。
 *
 * `shape: "none"` のCM事業や投資マネジメントは描画対象にならない。
 */
function Skyline({ owned }: Props) {
  const silhouettes = useMemo(() => {
    // 背の高い（＝上位の）事業から作り、左右へ交互に振り分けると中央が高い山型になる
    const arranged: Silhouette[] = [];

    for (const asset of [...ASSETS].reverse()) {
      if (asset.shape === "none") continue;

      const count = getSilhouetteCount(owned[asset.id] ?? 0);
      for (let i = 0; i < count; i++) {
        if (arranged.length >= MAX_TOTAL_SILHOUETTES) return arranged;

        const item: Silhouette = {
          key: `${asset.id}-${i}`,
          color: asset.color,
          shape: asset.shape,
          // 同種でも少しずつ高さを変えて単調さを消す
          heightRatio: asset.heightRatio * (1 - (i % 3) * 0.06),
          width: BASE_WIDTH * asset.widthRatio,
        };
        if (arranged.length % 2 === 0) arranged.push(item);
        else arranged.unshift(item);
      }
    }
    return arranged;
  }, [owned]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-full items-end justify-center gap-[2px] px-3">
      {silhouettes.map((s) => (
        <div
          key={s.key}
          className="relative min-w-[3px]"
          style={{ width: `${s.width}px`, height: `${s.heightRatio * 100}%` }}
        >
          {/* 空港は低い横長のターミナルなので、管制塔を1本立てて見分けられるようにする */}
          {s.shape === "airport" && (
            <span
              className="absolute bottom-full left-1/2 w-[3px] -translate-x-1/2 rounded-t-full"
              style={{ height: CONTROL_TOWER_HEIGHT, backgroundColor: s.color }}
            />
          )}
          <div
            className={[
              "h-full w-full shadow-[0_0_16px_rgba(0,0,0,0.5)]",
              s.shape === "tower" || s.shape === "midrise" ? "rounded-t-[2px]" : "",
            ].join(" ")}
            style={{ backgroundColor: s.color, ...surfaceStyle(s.shape) }}
          />
        </div>
      ))}
    </div>
  );
}

export default memo(Skyline);
