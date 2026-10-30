"use client";
import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Slide } from "@/lib/carousel-types";

const AUTOPLAY_MS = 5000;
const SLIDE_MS = 700;

function SlideLink({ href, label }: { href: string; label: string }) {
  if (!href) return null;
  const cls = "absolute inset-0 z-10 block";
  return /^https?:\/\//i.test(href)
    ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} draggable={false} className={cls} />
    : <Link href={href} aria-label={label} draggable={false} className={cls} />;
}

/**
 * Full-width image carousel at the top of the home page. Slides are managed from Admin → Hero carousel.
 * - The whole photo is always visible (object-contain over a soft blurred copy of itself) — nothing gets cropped.
 * - Infinite loop via cloned end slides, so it never rewinds backwards across all slides.
 * - Swipe / drag follows the finger; autoplay pauses on hover, touch, focus and hidden tabs.
 */
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const n = slides.length;
  const loop = n > 1;
  // Track = [last, ...slides, first] when looping, so pos 1..n are the real slides.
  const track = React.useMemo(() => (loop ? [slides[n - 1], ...slides, slides[0]] : slides), [slides, n, loop]);
  const [pos, setPos] = React.useState(loop ? 1 : 0);
  const [animate, setAnimate] = React.useState(true);
  const [drag, setDrag] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [reduce, setReduce] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);
  const start = React.useRef<{ x: number; y: number; id: number; locked: boolean } | null>(null);
  const moved = React.useRef(false);

  React.useEffect(() => { setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  React.useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);
  // If slides change from the dashboard, reset to the first real slide.
  React.useEffect(() => { setAnimate(false); setPos(loop ? 1 : 0); }, [n, loop]);

  const go = React.useCallback((d: number) => {
    setAnimate(true);
    setPos((p) => (loop ? Math.min(Math.max(p + d, 0), n + 1) : p));
  }, [loop, n]);

  // `pos` is a dependency so a manual change restarts the timer instead of skipping right after.
  React.useEffect(() => {
    if (paused || hidden || reduce || !loop) return;
    const t = window.setTimeout(() => go(1), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [paused, hidden, reduce, loop, pos, go]);

  // After sliding onto a clone, jump (without animation) to the matching real slide.
  const settle = () => {
    if (!loop) return;
    if (pos === 0) { setAnimate(false); setPos(n); }
    else if (pos === n + 1) { setAnimate(false); setPos(1); }
  };
  // Fallback in case transitionend never fires (reduced motion, background tab): still land on the real slide.
  React.useEffect(() => {
    if (!loop || (pos !== 0 && pos !== n + 1)) return;
    const t = window.setTimeout(settle, reduce ? 0 : SLIDE_MS + 120);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, loop, n, reduce]);
  // Re-enable the animation one frame after an invisible jump.
  React.useEffect(() => {
    if (animate) return;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    return () => cancelAnimationFrame(r);
  }, [animate, pos]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!loop || (e.pointerType === "mouse" && e.button !== 0)) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, locked: false };
    moved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.locked) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { start.current = null; return; } // vertical scroll — leave it alone
      s.locked = true;
      moved.current = true;
      setDragging(true);
      setPaused(true);
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    }
    setDrag(dx);
  };
  const endDrag = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || !s.locked) return;
    const w = box.current?.clientWidth ?? 1;
    const dx = e.clientX - s.x;
    setAnimate(true);
    setDragging(false);
    setDrag(0);
    setPaused(false);
    if (Math.abs(dx) > Math.min(80, w * 0.15)) go(dx < 0 ? 1 : -1);
  };

  if (!n) return null;
  const active = loop ? (pos - 1 + n) % n : 0;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers and featured brands"
      className="relative w-full select-none overflow-hidden bg-surface"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => !start.current && setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={box}
        className="overflow-hidden touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => { if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false; } }}
      >
        <div
          className={cn("flex will-change-transform", animate && !dragging && !reduce && "transition-transform ease-[cubic-bezier(0.22,1,0.36,1)]")}
          style={{ transform: `translate3d(calc(${-pos * 100}% + ${drag}px), 0, 0)`, transitionDuration: `${SLIDE_MS}ms` }}
          onTransitionEnd={(e) => { if (e.target === e.currentTarget) settle(); }}
        >
          {track.map((s, idx) => {
            const real = loop ? (idx - 1 + n) % n : idx;
            const isClone = loop && (idx === 0 || idx === n + 1);
            return (
              <div
                key={`${s.id}-${idx}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${real + 1} of ${n}`}
                aria-hidden={isClone || real !== active}
                className={cn(
                  "relative w-full shrink-0 overflow-hidden max-h-[620px]",
                  s.mobileImage ? "aspect-[4/3] sm:aspect-[8/3]" : "aspect-[16/9] sm:aspect-[8/3]",
                )}
              >
                {/* soft blurred copy fills any empty side space, so the real photo can stay uncropped */}
                <picture aria-hidden>
                  {s.mobileImage && <source media="(max-width: 639px)" srcSet={s.mobileImage} />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt="" draggable={false} decoding="async" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl" />
                </picture>
                <picture>
                  {s.mobileImage && <source media="(max-width: 639px)" srcSet={s.mobileImage} />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt={isClone ? "" : s.title}
                    draggable={false}
                    decoding="async"
                    fetchPriority={idx <= 1 ? "high" : "auto"}
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                </picture>
                {!isClone && <SlideLink href={s.href} label={s.title} />}
              </div>
            );
          })}
        </div>
      </div>

      {loop && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous slide" className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white sm:flex lg:left-6">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next slide" className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-slate-800 shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white sm:flex lg:right-6">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center sm:bottom-3">
            <div className="flex items-center rounded-full bg-slate-900/25 px-1.5 backdrop-blur-sm">
              {slides.map((s, idx) => (
                <button key={s.id} type="button" onClick={() => { setAnimate(true); setPos(idx + 1); }} aria-label={`Go to slide ${idx + 1}`} aria-current={idx === active} className="flex h-6 w-5 items-center justify-center">
                  <span className={cn("h-2 rounded-full bg-white transition-all duration-300", idx === active ? "w-5 opacity-100" : "w-2 opacity-60")} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
