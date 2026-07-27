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
    <header className="shrink-0 border-b border-white/10 bg-[#0b1224]/80 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-widest text-slate-400">開発ポイント</p>
          <p className="tabular truncate text-3xl leading-tight font-bold text-amber-300">
            {formatNumber(points)}
            <span className="ml-1 text-base font-medium text-amber-200/70">PT</span>
          </p>
          <p className="tabular truncate text-xs text-slate-400">
            毎秒 <span className="text-slate-200">{formatNumber(totalRate)}</span> PT
            {groupMultiplier > 1 && (
              <span className="ml-1.5 text-sky-300">
                シナジー ×{formatMultiplier(groupMultiplier)}
              </span>
            )}
          </p>
        </div>

        <div className="w-28 shrink-0 text-right">
          <p className="text-[11px] tracking-widest text-slate-400">グループ展開率</p>
          <p className="tabular text-lg font-semibold text-sky-300">
            {percent.toFixed(1)}%
          </p>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-300 transition-[width] duration-500"
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="設定を開く"
          className="shrink-0 rounded-lg border border-white/10 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
