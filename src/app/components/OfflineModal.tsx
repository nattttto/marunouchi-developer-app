"use client";

import { formatDuration, formatNumber } from "../lib/gameLogic";
import { MAX_OFFLINE_SECONDS, type OfflineEarnings } from "../lib/saveData";

type Props = {
  earnings: OfflineEarnings;
  onClose: () => void;
};

/** 復帰時に「離脱中いくら稼いだか」を知らせるモーダル */
export default function OfflineModal({ earnings, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101a33] p-6 text-center shadow-2xl">
        <p className="text-xs tracking-[0.3em] text-slate-400">おかえりなさい</p>
        <p className="mt-3 text-sm text-slate-300">
          {formatDuration(earnings.elapsedSeconds)}のあいだ、
          <br />
          丸の内は動き続けていました。
        </p>

        <p className="tabular mt-5 text-4xl font-bold text-amber-300">
          +{formatNumber(earnings.points)}
          <span className="ml-1 text-lg font-medium text-amber-200/70">PT</span>
        </p>

        {earnings.capped && (
          <p className="mt-3 text-xs text-slate-400">
            オフライン収益は{formatDuration(MAX_OFFLINE_SECONDS)}
            ぶんまでが上限です。
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-6 w-full cursor-pointer rounded-xl bg-amber-400 py-3 font-bold text-[#1a1204] transition-colors hover:bg-amber-300"
        >
          受け取る
        </button>
      </div>
    </div>
  );
}
