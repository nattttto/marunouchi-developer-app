"use client";

import { Lock } from "lucide-react";
import { ASSETS, ASSET_MAP, CATEGORY_MAP } from "../lib/assets";
import { formatNumber } from "../lib/gameLogic";
import type { Asset } from "../lib/types";

type Props = {
  points: number;
  owned: Record<string, number>;
  costs: Record<string, number>;
  unlocked: Record<string, boolean>;
  /** 倍率込みの1件あたり生産量。ショップの表示はこの実効値に揃える */
  effectiveProduction: Record<string, number>;
  onBuy: (assetId: string) => void;
};

/** 事業取得リスト。縦スクロールで全事業をコストの安い順に表示する */
export default function Shop({
  points,
  owned,
  costs,
  unlocked,
  effectiveProduction,
  onBuy,
}: Props) {
  return (
    <section className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#080e1c]">
      <ul className="mx-auto w-full max-w-2xl divide-y divide-white/5">
        {ASSETS.map((asset) => (
          <ShopRow
            key={asset.id}
            asset={asset}
            owned={owned[asset.id] ?? 0}
            cost={costs[asset.id] ?? asset.baseCost}
            unlocked={unlocked[asset.id] ?? false}
            production={effectiveProduction[asset.id] ?? asset.baseProduction}
            points={points}
            onBuy={onBuy}
          />
        ))}
      </ul>
    </section>
  );
}

type RowProps = {
  asset: Asset;
  owned: number;
  cost: number;
  unlocked: boolean;
  production: number;
  points: number;
  onBuy: (assetId: string) => void;
};

function ShopRow({
  asset,
  owned,
  cost,
  unlocked,
  production,
  points,
  onBuy,
}: RowProps) {
  const affordable = unlocked && points >= cost;
  const category = CATEGORY_MAP[asset.categoryId];

  return (
    <li>
      <button
        type="button"
        disabled={!affordable}
        onClick={() => onBuy(asset.id)}
        className={[
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          affordable
            ? "cursor-pointer hover:bg-white/5 active:bg-white/10"
            : "cursor-not-allowed opacity-45",
        ].join(" ")}
      >
        {/* 色スウォッチ。保有数を兼ねる */}
        <span
          className="flex size-11 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: unlocked ? asset.color : "#243049" }}
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
            {asset.name}
          </span>

          {/* カテゴリタグ。どのカテゴリ倍率に効くかが一目で分かるようにする */}
          <span className="mt-0.5 flex items-center gap-1.5 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: unlocked ? category.color : "#33405c" }}
            />
            <span className="shrink-0 text-slate-500">{category.name}</span>
            {unlocked ? (
              <span className="tabular truncate text-slate-400">
                ／ 1件 +{formatNumber(production)} PT/s
                {owned > 0 && (
                  <span className="text-slate-500">
                    {" "}
                    ／ 計 {formatNumber(owned * production)} PT/s
                  </span>
                )}
              </span>
            ) : (
              <span className="truncate text-slate-500">
                ／ {describeUnlock(asset)}
              </span>
            )}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="text-[10px] tracking-widest text-slate-500">取得費</span>
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
function describeUnlock(asset: Asset): string {
  const req = asset.unlockRequirement;
  if (!req) return "未解放";
  const requiredName = ASSET_MAP[req.assetId]?.name ?? req.assetId;
  return `${requiredName}を${req.count}件で解放`;
}
