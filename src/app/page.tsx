"use client";

import { useState } from "react";
import ClickArea from "./components/ClickArea";
import Hud from "./components/Hud";
import OfflineModal from "./components/OfflineModal";
import SettingsModal from "./components/SettingsModal";
import Shop from "./components/Shop";
import { useGame } from "./hooks/useGame";
import { getDevelopmentRate } from "./lib/gameLogic";

export default function Home() {
  const {
    state,
    loaded,
    totalRate,
    costs,
    unlocked,
    offline,
    click,
    buy,
    reset,
    dismissOffline,
  } = useGame();

  const [settingsOpen, setSettingsOpen] = useState(false);

  // localStorage を読むまでは何も出さない（サーバー描画との食い違いを避ける）
  if (!loaded) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-[#070c18]">
        <p className="text-sm tracking-[0.3em] text-slate-500">丸の内デベロッパー</p>
      </main>
    );
  }

  const developmentRate = getDevelopmentRate(state.owned);

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden">
      <Hud
        points={state.points}
        totalRate={totalRate}
        developmentRate={developmentRate}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="relative flex shrink-0 basis-[42dvh] flex-col">
        <ClickArea
          owned={state.owned}
          clickPower={state.clickPower}
          onClick={click}
        />

        {developmentRate >= 1 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-lg font-bold tracking-wider text-amber-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            丸の内エリア開発率 100%
          </p>
        )}
      </div>

      <Shop
        points={state.points}
        owned={state.owned}
        costs={costs}
        unlocked={unlocked}
        onBuy={buy}
      />

      {offline && <OfflineModal earnings={offline} onClose={dismissOffline} />}

      {settingsOpen && (
        <SettingsModal
          state={state}
          totalRate={totalRate}
          onReset={reset}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
