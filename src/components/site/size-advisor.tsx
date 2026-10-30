"use client";
import * as React from "react";
import { Ruler, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { recommendSize, type FitPref } from "@/lib/rules";
import { useRules } from "@/hooks/use-rules";
import { cn } from "@/lib/utils";

/** "Find my size": height + weight → the size that fits best, using the size chart the owner set in Dashboard → Store rules. */
export function SizeAdvisorButton({ sizes, onPick }: { sizes: { label: string; qty: number }[]; onPick: (size: string) => void }) {
  const { sizeAdvisor } = useRules();
  const [open, setOpen] = React.useState(false);
  const [unit, setUnit] = React.useState<"cm" | "ft">("cm");
  const [cm, setCm] = React.useState("");
  const [ft, setFt] = React.useState("");
  const [inch, setInch] = React.useState("");
  const [kg, setKg] = React.useState("");
  const [pref, setPref] = React.useState<FitPref>("regular");
  const [result, setResult] = React.useState<ReturnType<typeof recommendSize> | "error" | null>(null);
  if (!sizeAdvisor.enabled || sizes.length === 0) return null;

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    const height = unit === "cm" ? Number(cm) : Number(ft) * 30.48 + Number(inch || 0) * 2.54;
    const weight = Number(kg);
    if (!(height >= 100 && height <= 220) || !(weight >= 25 && weight <= 200)) { setResult("error"); return; }
    setResult(recommendSize(height, weight, sizeAdvisor.rows, pref, sizes));
  };
  const chip = (on: boolean) => cn("rounded-full border px-3.5 py-1.5 text-sm font-medium", on ? "border-ink bg-ink text-card" : "border-line text-ink hover:border-ink");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"><Sparkles className="h-4 w-4" /> Find my size</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Find my size">
        <form onSubmit={find} className="space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between"><span className="text-sm font-medium text-ink">Height</span>
              <span className="flex gap-1"><button type="button" onClick={() => setUnit("cm")} className={chip(unit === "cm")}>cm</button><button type="button" onClick={() => setUnit("ft")} className={chip(unit === "ft")}>ft / in</button></span></div>
            {unit === "cm" ? <Input aria-label="Height in cm" inputMode="decimal" placeholder="e.g. 160" value={cm} onChange={(e) => setCm(e.target.value)} /> : (
              <div className="grid grid-cols-2 gap-2"><Input aria-label="Feet" inputMode="numeric" placeholder="ft, e.g. 5" value={ft} onChange={(e) => setFt(e.target.value)} /><Input aria-label="Inches" inputMode="numeric" placeholder="in, e.g. 4" value={inch} onChange={(e) => setInch(e.target.value)} /></div>
            )}
          </div>
          <Field label="Weight (kg)"><Input inputMode="decimal" placeholder="e.g. 58" value={kg} onChange={(e) => setKg(e.target.value)} /></Field>
          <div><p className="mb-1.5 text-sm font-medium text-ink">How do you like it to fit?</p>
            <div className="flex flex-wrap gap-2">{([["snug", "Snug"], ["regular", "Regular"], ["relaxed", "Relaxed"]] as const).map(([v, l]) => <button key={v} type="button" aria-pressed={pref === v} onClick={() => setPref(v)} className={chip(pref === v)}>{l}</button>)}</div></div>
          <Button type="submit" className="w-full rounded-full" size="lg"><Ruler className="h-4 w-4" /> Suggest my size</Button>
        </form>

        {result === "error" && <p role="alert" className="mt-4 text-sm font-medium text-red-600">Please enter a realistic height and weight.</p>}
        {result && result !== "error" ? (
          <div role="status" className="mt-5 rounded-2xl bg-primary-faint p-5 text-center">
            <p className="text-sm">We suggest size</p>
            <p className="font-serif text-5xl font-semibold text-primary">{result.size}</p>
            <p className="mt-1 text-sm">{result.note}</p>
            {result.inStock && <Button className="mt-4 rounded-full" onClick={() => { onPick(result.size); setOpen(false); }}>Select size {result.size}</Button>}
            <p className="mt-3 text-xs">This is a guide based on typical measurements. Check the size guide if you are between sizes.</p>
          </div>
        ) : null}
        {result === null && <p className="mt-4 text-xs">Your details are only used to pick a size. We do not save them.</p>}
      </Dialog>
    </>
  );
}
