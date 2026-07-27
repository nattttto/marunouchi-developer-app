"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  formatDuration,
  formatMultiplier,
  formatNumber,
  getOwnedCategoryKinds,
} from "../lib/gameLogic";
import { CATEGORIES } from "../lib/assets";
import { IS_DEV } from "../lib/env";
import { MAX_OFFLINE_SECONDS } from "../lib/saveData";
import type { GameState } from "../lib/types";

/** 開発用「PT追加」ボタンで一度に足す量 */
const DEV_POINTS_GRANT = 1e12;

type Props = {
  state: GameState;
  totalRate: number;
  groupMultiplier: number;
  clickPower: number;
  onReset: () => void;
  onClose: () => void;
  onDevGrantAll: () => void;
  onDevGrantPoints: (points: number) => void;
};

/** 設定メニュー。累計の確認と「最初からやり直す」 */
export default function SettingsModal({
  state,
  totalRate,
  groupMultiplier,
  clickPower,
  onReset,
  onClose,
  onDevGrantAll,
  onDevGrantPoints,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  const totalAssets = Object.values(state.owned).reduce((a, b) => a + b, 0);
  const categoryKinds = getOwnedCategoryKinds(state.owned);

  const handleReset = () => {
    onReset();
    setConfirming(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101a33] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">設定</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <dl className="mt-5 space-y-2 text-sm">
          <Stat label="累計獲得PT" value={`${formatNumber(state.totalEarned)} PT`} />
          <Stat label="秒間収益" value={`${formatNumber(totalRate)} PT/s`} />
          <Stat label="保有事業数" value={`${totalAssets} 件`} />
          <Stat
            label="展開カテゴリ"
            value={`${categoryKinds} / ${CATEGORIES.length} 種`}
          />
          <Stat
            label="グループシナジー"
            value={`×${formatMultiplier(groupMultiplier)}`}
          />
          <Stat label="1タップ" value={`${formatNumber(clickPower)} PT`} />
          <Stat label="竣工回数" value={`${state.completions} 回`} />
        </dl>

        <div className="mt-5 space-y-2 rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-slate-400">
          <p>
            同じカテゴリを増やすとそのカテゴリの生産量が上がり、扱うカテゴリの種類が
            増えると全体の生産量が上がります。一点集中よりも多角化のほうが伸びます。
          </p>
          <p>
            1タップの獲得量は秒間収益に連動して増えます。タップを重ねると着工ゲージが
            溜まり、満たすたびに竣工ボーナスが入ります。
          </p>
          <p>
            進行状況はこのブラウザに自動保存されます。離脱中も
            {formatDuration(MAX_OFFLINE_SECONDS)}ぶんまで収益が貯まります。
          </p>
        </div>

        {/* 開発用。本番ビルドでは IS_DEV が false になりこのブロックごと落ちる */}
        {IS_DEV && (
          <div className="mt-5 rounded-xl border border-dashed border-sky-400/40 p-3">
            <p className="text-[10px] font-bold tracking-widest text-sky-300">
              DEV ONLY
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onDevGrantAll}
                className="flex-1 cursor-pointer rounded-lg border border-sky-400/40 py-2 text-xs text-sky-200 transition-colors hover:bg-sky-400/10"
              >
                全事業 +1（無料・解放）
              </button>
              <button
                type="button"
                onClick={() => onDevGrantPoints(DEV_POINTS_GRANT)}
                className="flex-1 cursor-pointer rounded-lg border border-sky-400/40 py-2 text-xs text-sky-200 transition-colors hover:bg-sky-400/10"
              >
                PT +{formatNumber(DEV_POINTS_GRANT)}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              「全事業 +1」はコストと解放条件を無視して全21事業を1件ずつ増やします。
              押した回数ぶん積めるので、倍率のしきい値やスカイラインの確認に使えます。
            </p>
          </div>
        )}

        {confirming ? (
          <div className="mt-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
            <p className="text-sm text-rose-200">
              保存データをすべて消して最初からやり直します。元に戻せません。
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="flex-1 cursor-pointer rounded-lg border border-white/15 py-2 text-sm text-slate-300 transition-colors hover:bg-white/10"
              >
                やめる
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 cursor-pointer rounded-lg bg-rose-500 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-400"
              >
                リセットする
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-5 w-full cursor-pointer rounded-xl border border-rose-500/40 py-3 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/10"
          >
            最初からやり直す
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="tabular font-semibold text-slate-100">{value}</dd>
    </div>
  );
}
