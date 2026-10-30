import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { requireUser } from "@/lib/user-auth";
import { getWallet } from "@/lib/wallet";
import { getRules } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata = { title: "My wallet" };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { refund: "Refund", bonus: "Bonus", order: "Used at checkout", order_cancelled: "Returned to wallet", adjustment: "Credit from the store" };

export default async function WalletPage() {
  const user = await requireUser("/account/wallet");
  const [w, rules] = await Promise.all([getWallet(user.id), getRules()]);
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-[#3d0c1c] p-6 text-white shadow-lift">
        <p className="flex items-center gap-2 text-sm text-white/80"><Wallet className="h-4 w-4" /> Store credit</p>
        <p className="mt-2 font-serif text-4xl font-semibold">{formatPrice(w.balance)}</p>
        <p className="mt-1 text-sm text-white/80">Use it at checkout on your next order — it is applied before anything else.</p>
        <Button asChild className="mt-4 rounded-full bg-white text-primary hover:bg-white/90"><Link href="/shop">Shop now</Link></Button>
      </div>
      {rules.wallet.enabled && rules.wallet.bonusPercent > 0 && <p className="rounded-xl bg-primary-faint px-4 py-3 text-sm">Tip: choose <strong className="text-ink">refund to wallet</strong> on a return and get <strong className="text-ink">{rules.wallet.bonusPercent}% extra</strong> credit.</p>}
      <section aria-labelledby="hist">
        <h2 id="hist" className="mb-3 text-lg">History</h2>
        {w.txns.length === 0 ? <p className="rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center text-sm">No wallet activity yet. Refunds you send to the wallet will show up here.</p> : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-card shadow-card">
            {w.txns.map((t) => (
              <li key={t.id} className="flex items-center gap-3 p-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.amount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-surface text-body"}`}>{t.amount > 0 ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{LABEL[t.type] ?? t.type}</p><p className="truncate text-xs">{t.note ? `${t.note} · ` : ""}{new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                <div className="text-right"><p className={`text-sm font-bold ${t.amount > 0 ? "text-emerald-700" : "text-ink"}`}>{t.amount > 0 ? "+" : "−"}{formatPrice(Math.abs(t.amount))}</p><p className="text-xs">Balance {formatPrice(t.balanceAfter)}</p></div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
