"use client";
import * as React from "react";
import Link from "next/link";
import { useRules } from "@/hooks/use-rules";

export function useCountdown(endsAt: string) {
  const end = endsAt ? new Date(endsAt).getTime() : 0;
  const [left, setLeft] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!end) return;
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end]);
  if (left === null) return null;
  const s = Math.floor(left / 1000);
  return { done: left <= 0, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), mins: Math.floor((s % 3600) / 60), secs: s % 60 };
}

export function Countdown({ endsAt, className = "" }: { endsAt: string; className?: string }) {
  const c = useCountdown(endsAt);
  if (!c || c.done) return null;
  const cell = (n: number, l: string) => (
    <span className="flex flex-col items-center rounded-lg bg-white/15 px-2.5 py-1 leading-none"><span className="text-base font-bold tabular-nums">{String(n).padStart(2, "0")}</span><span className="mt-0.5 text-[9px] uppercase tracking-wider opacity-80">{l}</span></span>
  );
  return <span className={`inline-flex items-center gap-1.5 ${className}`} role="timer" aria-label="Time left">{cell(c.days, "days")}{cell(c.hours, "hrs")}{cell(c.mins, "min")}{cell(c.secs, "sec")}</span>;
}

/** Slim strip under the top bar while a sale countdown is switched on in Dashboard → Store rules. */
export function SaleTimerBar() {
  const { saleTimer: t } = useRules();
  const c = useCountdown(t.active ? t.endsAt : "");
  if (!t.active || !t.endsAt || !c || c.done) return null;
  return (
    <div className="bg-gradient-to-r from-[#3d0c1c] via-primary to-[#3d0c1c] px-4 py-2 text-white print:hidden">
      <div className="container-x flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm">
        <span className="font-semibold">{t.title}</span>
        <Countdown endsAt={t.endsAt} />
        {t.href && <Link href={t.href} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary hover:bg-white/90">{t.cta || "Shop now"}</Link>}
      </div>
    </div>
  );
}
