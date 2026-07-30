"use client";

import { Lock } from "lucide-react";
import { ASSETS, ASSET_MAP, CATEGORY_MAP } from "../lib/assets";
import { formatNumber } from "../lib/gameLogic";
import { playBuy } from "../lib/sound";
import type { Asset } from "../lib/types";

type Props = {
  points: number;
  owned: Record<string, number>;
  costs: Record<string, number>;
  unlocked: Record<string, boolean>;
  /** 倍率込みの1件あたり生産量。ショップの表示はこの実効値に揃える */
  effectiveProduction: Record<string, number>;
  /** まとめ買いの単位。`costs` はこの件数ぶんの合計になっている */
  quantity: number;
  onBuy: (assetId: string) => void;
};

/** 事業取得リスト。縦スクロールで全事業をコストの安い順に表示する */
export default function Shop({
  points,
  owned,
  costs,
  unlocked,
  effectiveProduction,
  quantity,
  onBuy,
}: Props) {
  return (
    <section className="bg-surface-alt min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <ul className="divide-line mx-auto w-full max-w-2xl divide-y">
        {ASSETS.map((asset) => (
          <ShopRow
            key={asset.id}
            asset={asset}
            owned={owned[asset.id] ?? 0}
            cost={costs[asset.id] ?? asset.baseCost}
            unlocked={unlocked[asset.id] ?? false}
            production={effectiveProduction[asset.id] ?? asset.baseProduction}
            points={points}
            quantity={quantity}
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
  quantity: number;
  onBuy: (assetId: string) => void;
};

function ShopRow({
  asset,
  owned,
  cost,
  unlocked,
  production,
  points,
  quantity,
  onBuy,
}: RowProps) {
  const affordable = unlocked && points >= cost;
  const category = CATEGORY_MAP[asset.categoryId];

  return (
    <li>
      <button
        type="button"
        disabled={!affordable}
        onClick={() => {
          playBuy();
          onBuy(asset.id);
        }}
        className={[
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          affordable
            ? "hover:bg-canvas active:bg-line/60 cursor-pointer"
            : "cursor-not-allowed opacity-45",
        ].join(" ")}
      >
        {/*
          色スウォッチ。保有数を兼ねる。
          明るい地では事業色をそのまま敷くと白抜き文字が読めないので、
          color-mix で淡い塗り・濃い文字に振り分けてコントラストを確保する。
        */}
        <span
          className="border-line flex size-11 shrink-0 items-center justify-center rounded-md border"
          style={
            unlocked
              ? {
                  backgroundColor: `color-mix(in srgb, ${asset.color} 22%, white)`,
                  borderColor: `color-mix(in srgb, ${asset.color} 45%, white)`,
                  // 一番淡い事業色でも WCAG AA を満たすよう、文字は黒寄りに振る
                  color: `color-mix(in srgb, ${asset.color} 45%, black)`,
                }
              : undefined
          }
        >
          {unlocked ? (
            <span className="tabular text-sm font-bold">{owned}</span>
          ) : (
            <Lock size={16} className="text-ink-mute" />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="text-ink block truncate text-sm font-bold">
            {asset.name}
          </span>

          {/* カテゴリタグ。どのカテゴリ倍率に効くかが一目で分かるようにする */}
          <span className="mt-0.5 flex items-center gap-1.5 text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: unlocked ? category.color : "#cfc3ae" }}
            />
            <span className="text-ink-mute shrink-0">{category.name}</span>
            {unlocked ? (
              <span className="tabular text-ink-soft truncate">
                ／ 1件 +{formatNumber(production)} PT/s
                {owned > 0 && (
                  <span className="text-ink-mute">
                    {" "}
                    ／ 計 {formatNumber(owned * production)} PT/s
                  </span>
                )}
              </span>
            ) : (
              <span className="text-ink-mute truncate">
                ／ {describeUnlock(asset)}
              </span>
            )}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="text-ink-mute text-[10px] tracking-widest">
            取得費
            {quantity > 1 && (
              <span className="text-brick-ink tabular ml-1 font-bold">
                ×{quantity}
              </span>
            )}
          </span>
          <span
            className={[
              "tabular block text-sm font-bold",
              affordable ? "text-brick-ink" : "text-ink-mute",
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
