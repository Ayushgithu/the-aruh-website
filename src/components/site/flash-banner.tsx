"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { Countdown, useCountdown } from "./sale-timer";

/** "Flash sale — ends in …" above the price. When it ends, the page refreshes itself and the normal price returns. */
export function FlashBanner({ endsAt }: { endsAt: string }) {
  const router = useRouter();
  const c = useCountdown(endsAt);
  const done = !!c && c.done;
  React.useEffect(() => { if (done) router.refresh(); }, [done, router]);
  if (!c || c.done) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-gradient-to-r from-primary to-[#3d0c1c] px-4 py-3 text-white">
      <span className="flex items-center gap-1.5 text-sm font-bold"><Zap className="h-4 w-4 fill-current text-[#e7c98a]" /> Flash sale</span>
      <span className="text-xs text-white/80">Ends in</span>
      <Countdown endsAt={endsAt} />
    </div>
  );
}
