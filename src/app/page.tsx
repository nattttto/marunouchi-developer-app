"use client";

import { useState } from "react";
import CategoryStrip from "./components/CategoryStrip";
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
    offline,
    totalRate,
    costs,
    unlocked,
    effectiveProduction,
    categoryCounts,
    categoryMultipliers,
    groupMultiplier,
    clickPower,
    groundworkGoal,
    completionBonus,
    click,
    buy,
    reset,
    dismissOffline,
    devGrantAll,
    devGrantPoints,
  } = useGame();

  const [settingsOpen, setSettingsOpen] = useState(false);

  // localStorage を読むまでは何も出さない（サーバー描画との食い違いを避ける）
  if (!loaded) {
    return (
      <main className="bg-canvas flex h-[100dvh] items-center justify-center">
        <p className="text-ink-mute text-sm tracking-[0.3em]">丸の内デベロッパー</p>
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
        groupMultiplier={groupMultiplier}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <CategoryStrip
        categoryCounts={categoryCounts}
        categoryMultipliers={categoryMultipliers}
      />

      <div className="relative flex shrink-0 basis-[36dvh] flex-col">
        <ClickArea
          owned={state.owned}
          clickPower={clickPower}
          groundworkClicks={state.groundworkClicks}
          groundworkGoal={groundworkGoal}
          completionBonus={completionBonus}
          onClick={click}
        />

        {developmentRate >= 1 && (
          <p className="text-brick-ink pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-lg font-bold tracking-wider drop-shadow-[0_1px_4px_rgba(255,255,255,0.95)]">
            グループ展開率 100%
          </p>
        )}
      </div>

      <Shop
        points={state.points}
        owned={state.owned}
        costs={costs}
        unlocked={unlocked}
        effectiveProduction={effectiveProduction}
        onBuy={buy}
      />

      {offline && <OfflineModal earnings={offline} onClose={dismissOffline} />}

      {settingsOpen && (
        <SettingsModal
          state={state}
          totalRate={totalRate}
          groupMultiplier={groupMultiplier}
          clickPower={clickPower}
          onReset={reset}
          onClose={() => setSettingsOpen(false)}
          onDevGrantAll={devGrantAll}
          onDevGrantPoints={devGrantPoints}
        />
      )}
    </main>
  );
}
