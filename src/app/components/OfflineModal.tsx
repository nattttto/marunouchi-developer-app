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
    <div className="bg-ink/35 fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="border-line bg-surface w-full max-w-sm rounded-2xl border p-6 text-center shadow-xl">
        <p className="text-ink-mute text-xs tracking-[0.3em]">おかえりなさい</p>
        <p className="text-ink-soft mt-3 text-sm">
          {formatDuration(earnings.elapsedSeconds)}のあいだ、
          <br />
          丸の内は動き続けていました。
        </p>

        <p className="tabular text-brick mt-5 text-4xl font-bold">
          +{formatNumber(earnings.points)}
          <span className="text-brick-ink/70 ml-1 text-lg font-normal">PT</span>
        </p>

        {earnings.capped && (
          <p className="text-ink-mute mt-3 text-xs">
            オフライン収益は{formatDuration(MAX_OFFLINE_SECONDS)}
            ぶんまでが上限です。
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="bg-brick hover:bg-brick-ink mt-6 w-full cursor-pointer rounded-xl py-3 font-bold text-white transition-colors"
        >
          受け取る
        </button>
      </div>
    </div>
  );
}
