"use client";

import { BUY_QUANTITIES, type BuyQuantity } from "../hooks/useGame";

type Props = {
  value: BuyQuantity;
  onChange: (value: BuyQuantity) => void;
};

/**
 * まとめ買いの単位（1 / 10 / 100）を切り替える。
 *
 * **着工エリアの中には置けない。** 着工エリア自体が `<button>` なので、
 * その子にボタンを置くと入れ子になり、タップが着工にも吸われる。
 * `page.tsx` で着工エリアの兄弟として重ねている。
 */
export default function BuyQuantityToggle({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="まとめ買いの単位"
      className="border-line bg-canvas/85 pointer-events-auto absolute top-2 left-2 z-10 flex overflow-hidden rounded-lg border"
    >
      {BUY_QUANTITIES.map((quantity) => {
        const active = quantity === value;
        return (
          <button
            key={quantity}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(quantity)}
            className={[
              "tabular w-9 cursor-pointer py-1 text-[11px] leading-tight font-bold transition-colors",
              active
                ? "bg-brick text-white"
                : "text-ink-mute hover:bg-line/60 hover:text-ink",
            ].join(" ")}
          >
            ×{quantity}
          </button>
        );
      })}
    </div>
  );
}
