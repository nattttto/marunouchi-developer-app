"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { formatDuration, formatNumber } from "../lib/gameLogic";
import { MAX_OFFLINE_SECONDS } from "../lib/saveData";
import type { GameState } from "../lib/types";

type Props = {
  state: GameState;
  totalRate: number;
  onReset: () => void;
  onClose: () => void;
};

/** 設定メニュー。累計の確認と「最初からやり直す」 */
export default function SettingsModal({
  state,
  totalRate,
  onReset,
  onClose,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  const totalBuildings = Object.values(state.owned).reduce((a, b) => a + b, 0);

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
          <Stat label="保有ビル数" value={`${totalBuildings} 棟`} />
          <Stat label="1クリック" value={`${state.clickPower} PT`} />
        </dl>

        <p className="mt-5 rounded-lg bg-white/5 p-3 text-xs leading-relaxed text-slate-400">
          進行状況はこのブラウザに自動保存されます。離脱中も
          {formatDuration(MAX_OFFLINE_SECONDS)}ぶんまで収益が貯まります。
        </p>

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
