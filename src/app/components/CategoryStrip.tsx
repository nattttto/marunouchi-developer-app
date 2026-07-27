"use client";

import { memo } from "react";
import { CATEGORIES, CATEGORY_TIERS } from "../lib/assets";
import { formatMultiplier } from "../lib/gameLogic";
import type { CategoryId } from "../lib/types";

type Props = {
  categoryCounts: Record<CategoryId, number>;
  categoryMultipliers: Record<CategoryId, number>;
};

/** あと何件でカテゴリ倍率が上がるか。上限に達していれば null */
function nextTier(count: number) {
  // CATEGORY_TIERS はしきい値の降順なので、後ろから見て最初に超えるものが次の目標
  for (let i = CATEGORY_TIERS.length - 1; i >= 0; i--) {
    const tier = CATEGORY_TIERS[i];
    if (count < tier.threshold) {
      return { remaining: tier.threshold - count, multiplier: tier.multiplier };
    }
  }
  return null;
}

/**
 * カテゴリごとの保有数と生産倍率を並べた帯。
 *
 * 横スクロールにするとスクロールバーが出て見栄えが悪く、
 * 隠れたカテゴリにも気づけないので、折り返して全カテゴリを常に見せる。
 * 狭い画面では2行になる。
 */
function CategoryStrip({ categoryCounts, categoryMultipliers }: Props) {
  return (
    <div className="shrink-0 border-b border-white/10 bg-[#0a1020]">
      <div className="mx-auto w-full max-w-2xl px-3 py-2">
        <ul className="flex flex-wrap items-center justify-center gap-1.5">
          {CATEGORIES.map((category) => {
            const count = categoryCounts[category.id];
            const multiplier = categoryMultipliers[category.id];
            const next = nextTier(count);

            return (
              <li
                key={category.id}
                title={
                  next
                    ? `あと${next.remaining}件で ×${formatMultiplier(next.multiplier)}`
                    : "カテゴリ倍率は上限に到達"
                }
                className={[
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap",
                  count > 0
                    ? "border-white/15 bg-white/5 text-slate-200"
                    : "border-white/5 text-slate-500",
                ].join(" ")}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: count > 0 ? category.color : "#33405c",
                  }}
                />
                <span>{category.shortName}</span>
                <span className="tabular text-slate-400">{count}</span>
                {multiplier > 1 && (
                  <span className="tabular font-semibold text-amber-300">
                    ×{formatMultiplier(multiplier)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default memo(CategoryStrip);
