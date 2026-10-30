"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Banner, Testimonial } from "@/lib/types";

export function TestimonialCarousel({ items }: { items: Testimonial[] }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: "smooth" });
  };
  return (
    <div>
      <div className="mb-5 flex justify-end gap-2">
        <Button variant="outline" size="icon" onClick={() => scroll(-1)} aria-label="Previous reviews"><ChevronLeft className="h-5 w-5" /></Button>
        <Button variant="outline" size="icon" onClick={() => scroll(1)} aria-label="Next reviews"><ChevronRight className="h-5 w-5" /></Button>
      </div>
      <div ref={ref} tabIndex={0} aria-label="Customer reviews" className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
        {items.map((t) => (
          <figure key={t.id} className="flex w-[86%] shrink-0 snap-start flex-col rounded-2xl border border-line bg-card p-6 shadow-card sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)]">
            <Quote className="h-7 w-7 text-primary/25" aria-hidden />
            <div className="mt-3 flex gap-0.5 text-gold" role="img" aria-label={`${t.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-4 w-4", i < t.rating ? "fill-current" : "text-slate-200")} />)}
            </div>
            <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-ink/90">{t.text}</blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">{t.name.split(" ").map((n) => n[0]).join("")}</span>
              <span className="text-sm">
                <span className="block font-semibold text-ink">{t.name}</span>
                <span className="text-body">Bought {t.product}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

const themes: Record<Banner["theme"], string> = {
  blue: "from-primary to-[#3d0c1c] text-white",
  slate: "from-slate-900 to-slate-700 text-white",
  sky: "from-sky-100 to-primary-soft text-ink",
};

export function BannerRotator({ banners }: { banners: Banner[] }) {
  const [i, setI] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused || banners.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [paused, banners.length]);

  if (!banners.length) return null;
  const b = banners[i % banners.length];
  const light = b.theme === "sky";

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div
        key={b.id}
        className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-7 sm:p-10 lg:p-12", themes[b.theme])}
        aria-live="polite"
      >
        {b.image && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className={cn("absolute inset-0", light ? "bg-gradient-to-r from-card/90 via-card/70 to-transparent" : "bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-transparent")} aria-hidden />
          </>
        )}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-24 right-24 hidden h-56 w-56 rounded-full bg-white/10 md:block" aria-hidden />
        <div className="relative max-w-2xl">
          <h2 className={cn("text-2xl sm:text-3xl lg:text-4xl", light ? "text-ink" : "text-white")}>{b.title}</h2>
          <p className={cn("mt-3 text-base", light ? "text-body" : "text-white/85")}>{b.subtitle}</p>
          <Button asChild size="lg" variant={light ? "primary" : "outline"} className={cn("mt-6", !light && "border-white bg-white text-[#1D4ED8] hover:bg-primary-faint")}>
            <Link href={b.href}>{b.cta}</Link>
          </Button>
        </div>
      </div>
      {banners.length > 1 && (
        <div className="mt-4 flex justify-center gap-1">
          {banners.map((x, idx) => (
            <button key={x.id} onClick={() => setI(idx)} aria-label={`Show offer ${idx + 1}`} aria-current={idx === i} className="flex h-11 w-8 items-center justify-center">
              <span className={cn("h-2 rounded-full transition-all", idx === i ? "w-6 bg-primary" : "w-2 bg-slate-300")} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
