"use client";

import { Lock } from "lucide-react";
import { BUILDINGS, BUILDING_MAP } from "../lib/buildings";
import { formatNumber } from "../lib/gameLogic";
import type { Building } from "../lib/types";

type Props = {
  points: number;
  owned: Record<string, number>;
  costs: Record<string, number>;
  unlocked: Record<string, boolean>;
  onBuy: (buildingId: string) => void;
};

/** 建物購入リスト。縦スクロールで全建物を表示する */
export default function Shop({ points, owned, costs, unlocked, onBuy }: Props) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#080e1c]">
      <ul className="mx-auto w-full max-w-2xl divide-y divide-white/5">
        {BUILDINGS.map((building) => (
          <ShopRow
            key={building.id}
            building={building}
            owned={owned[building.id] ?? 0}
            cost={costs[building.id] ?? building.baseCost}
            unlocked={unlocked[building.id] ?? false}
            points={points}
            onBuy={onBuy}
          />
        ))}
      </ul>
    </section>
  );
}

type RowProps = {
  building: Building;
  owned: number;
  cost: number;
  unlocked: boolean;
  points: number;
  onBuy: (buildingId: string) => void;
};

function ShopRow({ building, owned, cost, unlocked, points, onBuy }: RowProps) {
  const affordable = unlocked && points >= cost;
  const disabled = !affordable;

  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onBuy(building.id)}
        className={[
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          affordable
            ? "cursor-pointer hover:bg-white/5 active:bg-white/10"
            : "cursor-not-allowed opacity-45",
        ].join(" ")}
      >
        {/* 色スウォッチ */}
        <span
          className="relative flex size-11 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: unlocked ? building.color : "#243049" }}
        >
          {unlocked ? (
            <span className="tabular text-sm font-bold text-white/90 drop-shadow">
              {owned}
            </span>
          ) : (
            <Lock size={16} className="text-slate-400" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-100">
            {building.name}
          </span>
          {unlocked ? (
            <span className="tabular block text-xs text-slate-400">
              1棟 +{formatNumber(building.baseProduction)} PT/s
              {owned > 0 && (
                <span className="text-slate-500">
                  {" "}
                  ／ 計 {formatNumber(owned * building.baseProduction)} PT/s
                </span>
              )}
            </span>
          ) : (
            <span className="block text-xs text-slate-500">
              {describeUnlock(building)}
            </span>
          )}
        </span>

        <span className="shrink-0 text-right">
          <span className="text-[10px] tracking-widest text-slate-500">建設費</span>
          <span
            className={[
              "tabular block text-sm font-bold",
              affordable ? "text-amber-300" : "text-slate-400",
            ].join(" ")}
          >
            {formatNumber(cost)} PT
          </span>
        </span>
      </button>
    </li>
  );
}

/** 未解放の行に出す解放条件の文言 */
function describeUnlock(building: Building): string {
  const req = building.unlockRequirement;
  if (!req) return "未解放";
  const requiredName = BUILDING_MAP[req.buildingId]?.name ?? req.buildingId;
  return `${requiredName}を${req.count}棟保有で解放`;
}
