"use client";

import { useState } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
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
  muted: boolean;
  onToggleMuted: () => void;
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
  muted,
  onToggleMuted,
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
    <div className="bg-ink/35 fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="border-line bg-surface w-full max-w-sm rounded-2xl border p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-ink text-base font-bold">設定</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-ink-mute hover:bg-canvas hover:text-ink cursor-pointer rounded-lg p-1.5 transition-colors"
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

        <button
          type="button"
          onClick={onToggleMuted}
          aria-pressed={!muted}
          className="border-line hover:bg-canvas mt-5 flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm transition-colors"
        >
          <span className="text-ink flex items-center gap-2">
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            効果音
          </span>
          <span
            className={`text-xs font-bold ${muted ? "text-ink-mute" : "text-sage-ink"}`}
          >
            {muted ? "オフ" : "オン"}
          </span>
        </button>

        <div className="bg-canvas text-ink-soft mt-5 space-y-2 rounded-lg p-3 text-xs leading-relaxed">
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
          <div className="border-sage/60 mt-5 rounded-xl border border-dashed p-3">
            <p className="text-sage-ink text-[10px] font-bold tracking-widest">
              DEV ONLY
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={onDevGrantAll}
                className="border-sage/60 text-sage-ink hover:bg-sage/10 flex-1 cursor-pointer rounded-lg border py-2 text-xs transition-colors"
              >
                全事業 +1（無料・解放）
              </button>
              <button
                type="button"
                onClick={() => onDevGrantPoints(DEV_POINTS_GRANT)}
                className="border-sage/60 text-sage-ink hover:bg-sage/10 flex-1 cursor-pointer rounded-lg border py-2 text-xs transition-colors"
              >
                PT +{formatNumber(DEV_POINTS_GRANT)}
              </button>
            </div>
            <p className="text-ink-mute mt-2 text-[11px] leading-relaxed">
              「全事業 +1」はコストと解放条件を無視して全21事業を1件ずつ増やします。
              押した回数ぶん積めるので、倍率のしきい値やマップの確認に使えます。
            </p>
          </div>
        )}

        {confirming ? (
          <div className="border-danger/40 bg-danger/8 mt-5 rounded-xl border p-4">
            <p className="text-danger-ink text-sm">
              保存データをすべて消して最初からやり直します。元に戻せません。
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="border-line-strong text-ink-soft hover:bg-canvas flex-1 cursor-pointer rounded-lg border py-2 text-sm transition-colors"
              >
                やめる
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="bg-danger hover:bg-danger-ink flex-1 cursor-pointer rounded-lg py-2 text-sm font-bold text-white transition-colors"
              >
                リセットする
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="border-danger/40 text-danger-ink hover:bg-danger/8 mt-5 w-full cursor-pointer rounded-xl border py-3 text-sm font-bold transition-colors"
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
      <dt className="text-ink-mute">{label}</dt>
      <dd className="tabular text-ink font-bold">{value}</dd>
    </div>
  );
}
