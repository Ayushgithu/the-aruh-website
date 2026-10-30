"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, Loader2, Search, SearchX, X } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { ProductArt } from "./product-art";
import type { ArtKind, Tone } from "@/lib/types";

interface Hit { id: string; slug: string; name: string; brand: string; price: number; type: string; stock: string; art: { kind: ArtKind; tone: Tone; hue: number }; image?: string }

const RECENT_KEY = "lc_recent_searches";
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; } };
const saveRecent = (q: string) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...readRecent().filter((x) => x !== q)].slice(0, 5))); } catch {}
};

/** Typo-tolerant live search. Opens from the header, with "/" or Ctrl/⌘+K. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [recent, setRecent] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const term = q.trim();

  React.useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    setTimeout(() => inputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", key); };
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) { setQ(""); setHits([]); setActive(-1); return; }
    if (term.length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        const data = await res.json();
        setHits(data.results ?? []);
        setActive(-1);
      } catch { /* aborted or offline */ }
      setLoading(false);
    }, 180);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [term, open]);

  const go = (url: string) => { if (term.length >= 2) saveRecent(term); onClose(); router.push(url); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && hits[active]) go(`/product/${hits[active].slug}`);
      else if (term.length >= 2) go(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-label="Search products">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative mx-auto mt-[8dvh] w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="search-results"
            aria-activedescendant={active >= 0 ? `hit-${active}` : undefined}
            aria-label="Search products"
            placeholder="Search suit sets, sarees, colours… (typos are fine)"
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-slate-500 focus:outline-none"
          />
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" aria-label="Searching" /> : null}
          <button onClick={onClose} aria-label="Close search" className="flex h-11 w-11 items-center justify-center rounded-xl text-body hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>

        <div data-lenis-prevent id="search-results" role="listbox" className="max-h-[60dvh] overflow-y-auto p-2">
          {term.length < 2 && (
            recent.length > 0 ? (
              <div className="p-2">
                <p className="mb-1 text-xs font-medium">Recent searches</p>
                <ul>{recent.map((r) => (
                  <li key={r}><button onClick={() => setQ(r)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-ink hover:bg-surface"><Clock className="h-4 w-4 text-slate-500" /> {r}</button></li>
                ))}</ul>
              </div>
            ) : <p className="px-4 py-8 text-center text-sm">Try “anarkali”, “green suit set”, or “cotton co-ord”.</p>
          )}

          {term.length >= 2 && !loading && hits.length === 0 && (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-faint text-primary"><SearchX className="h-6 w-6" /></span>
              <p className="mt-3 font-semibold text-ink">No matches for “{term}”</p>
              <p className="mt-1 text-sm">Check the spelling or try fewer words. You can also <Link href="/contact" onClick={onClose} className="font-semibold text-primary hover:underline">ask us to find it</Link>.</p>
            </div>
          )}

          {hits.map((h, i) => (
            <button
              key={h.id}
              id={`hit-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(`/product/${h.slug}`)}
              className={cn("flex min-h-[4.25rem] w-full items-center gap-3 rounded-xl p-2 text-left", i === active ? "bg-primary-faint" : "hover:bg-surface")}
            >
              <span className="h-16 w-12 shrink-0 overflow-hidden rounded-lg" style={{ background: `hsl(${h.art.hue} 90% 95%)` }}>
                {h.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={h.image} alt="" className="h-full w-full object-cover" /> : <ProductArt {...h.art} className="p-0.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{h.name}</span>
                <span className="text-xs">{h.type === "accessory" ? "Accessory" : "Clothing"}{h.stock === "out" ? " · Sold out" : ""}</span>
              </span>
              <span className="shrink-0 text-sm font-bold text-ink">{formatPrice(h.price)}</span>
            </button>
          ))}

          {hits.length > 0 && (
            <button onClick={() => go(`/search?q=${encodeURIComponent(term)}`)} className="mt-1 flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary-faint">
              See all results for “{term}” <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
