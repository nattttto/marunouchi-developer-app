"use client";

import { memo, useMemo } from "react";
import { BUILDINGS } from "../lib/buildings";
import { getSilhouetteCount } from "../lib/gameLogic";

type Props = {
  owned: Record<string, number>;
};

type Silhouette = {
  key: string;
  color: string;
  heightRatio: number;
  width: number;
};

/** シルエット1本の基準幅(px)。狭い画面では flex が自動で縮める */
const BASE_WIDTH = 18;

/**
 * 保有している建物を背景のスカイラインとして描く。
 * 保有数が増えるほど本数が増え、高いビルほど中央に寄るように並べる。
 */
function Skyline({ owned }: Props) {
  const silhouettes = useMemo(() => {
    // 背の高い順に作り、左右へ交互に振り分けると中央が高い山型になる
    const arranged: Silhouette[] = [];
    for (const building of [...BUILDINGS].reverse()) {
      const count = getSilhouetteCount(owned[building.id] ?? 0);
      for (let i = 0; i < count; i++) {
        const item: Silhouette = {
          key: `${building.id}-${i}`,
          color: building.color,
          // 同種でも少しずつ高さを変えて単調さを消す
          heightRatio: building.heightRatio * (1 - (i % 3) * 0.06),
          width: BASE_WIDTH * building.widthRatio,
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
          className="min-w-[3px] rounded-t-[2px] shadow-[0_0_16px_rgba(0,0,0,0.5)]"
          style={{
            width: `${s.width}px`,
            height: `${s.heightRatio * 100}%`,
            backgroundColor: s.color,
            // 窓明かりの点グリッド
            backgroundImage:
              "radial-gradient(rgba(255,214,130,0.5) 42%, transparent 46%)",
            backgroundSize: "7px 9px",
          }}
        />
      ))}
    </div>
  );
}

export default memo(Skyline);
