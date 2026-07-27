"use client";

import { Settings } from "lucide-react";
import { formatMultiplier, formatNumber } from "../lib/gameLogic";

type Props = {
  points: number;
  totalRate: number;
  developmentRate: number;
  /** カテゴリの種類数から決まる全体倍率。1 のときは表示しない */
  groupMultiplier: number;
  onOpenSettings: () => void;
};

/** 画面上部の常時表示ヘッダー。所持PT・秒間収益・グループ展開率 */
export default function Hud({
  points,
  totalRate,
  developmentRate,
  groupMultiplier,
  onOpenSettings,
}: Props) {
  const percent = developmentRate * 100;

  return (
    <header className="border-line bg-surface shrink-0 border-b px-4 py-3">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-ink-mute text-[11px] tracking-widest">開発ポイント</p>
          <p className="tabular text-brick truncate text-3xl leading-tight font-bold">
            {formatNumber(points)}
            <span className="text-brick-ink/70 ml-1 text-base font-normal">PT</span>
          </p>
          <p className="tabular text-ink-mute truncate text-xs">
            毎秒 <span className="text-ink">{formatNumber(totalRate)}</span> PT
            {groupMultiplier > 1 && (
              <span className="text-sage-ink ml-1.5">
                シナジー ×{formatMultiplier(groupMultiplier)}
              </span>
            )}
          </p>
        </div>

        <div className="w-28 shrink-0 text-right">
          <p className="text-ink-mute text-[11px] tracking-widest">グループ展開率</p>
          <p className="tabular text-sage-ink text-lg font-bold">
            {percent.toFixed(1)}%
          </p>
          <div className="bg-line mt-1 h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-sage h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="設定を開く"
          className="border-line text-ink-soft hover:bg-canvas hover:text-ink shrink-0 rounded-lg border p-2 transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
