"use client";
import * as React from "react";
import { Check } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Size + colour selection state shared by the product page and the quick-view popup. */
export function useVariant(product: Pick<Product, "sizes" | "colors">) {
  const sizes = product.sizes ?? [];
  const colors = product.colors ?? [];
  const [size, setSize] = React.useState<string | undefined>(() => (sizes.length === 1 && sizes[0].qty > 0 ? sizes[0].label : undefined));
  const [color, setColor] = React.useState<string | undefined>(() => colors[0]?.name);
  const needSize = sizes.length > 0;
  const qtyLeft = needSize ? sizes.find((s) => s.label === size)?.qty : undefined;
  return { sizes, colors, size, setSize, color, setColor, needSize, qtyLeft };
}

export function SizePicker({ sizes, value, onChange, invalid }: { sizes: { label: string; qty: number }[]; value?: string; onChange: (s: string) => void; invalid?: boolean }) {
  const sel = sizes.find((s) => s.label === value);
  return (
    <div>
      <div role="radiogroup" aria-label="Size" className={cn("flex flex-wrap gap-2 rounded-xl", invalid && "ring-2 ring-red-300 ring-offset-4")}>
        {sizes.map((s) => {
          const out = s.qty <= 0;
          const on = value === s.label;
          return (
            <button
              key={s.label}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`Size ${s.label}${out ? ", sold out" : ""}`}
              disabled={out}
              onClick={() => onChange(s.label)}
              className={cn(
                "relative flex h-11 min-w-12 items-center justify-center rounded-full border px-4 text-sm font-semibold transition",
                on ? "border-ink bg-ink text-card" : "border-line bg-card text-ink hover:border-ink",
                out && "cursor-not-allowed border-dashed text-slate-500 line-through opacity-60 hover:border-line",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
      {sel && sel.qty > 0 && sel.qty <= 3 && <p className="mt-2 text-xs font-semibold text-warning">Only {sel.qty} left in size {sel.label}</p>}
    </div>
  );
}

export function ColorPicker({ colors, value, onChange }: { colors: { name: string; hex?: string }[]; value?: string; onChange: (c: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2.5">
      {colors.map((c) => {
        const on = value === c.name;
        return c.hex ? (
          <button key={c.name} type="button" role="radio" aria-checked={on} aria-label={c.name} title={c.name} onClick={() => onChange(c.name)}
            className={cn("flex h-9 w-9 items-center justify-center rounded-full border-2 transition", on ? "border-ink" : "border-transparent ring-1 ring-line hover:ring-ink")}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-black/10" style={{ background: c.hex }}>{on && <Check className="h-3.5 w-3.5 text-white mix-blend-difference" />}</span>
          </button>
        ) : (
          <button key={c.name} type="button" role="radio" aria-checked={on} onClick={() => onChange(c.name)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", on ? "border-ink bg-ink text-card" : "border-line bg-card text-ink hover:border-ink")}>{c.name}</button>
        );
      })}
    </div>
  );
}
