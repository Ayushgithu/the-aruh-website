"use client";
import * as React from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Play, X, ZoomIn } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductVisual } from "./product-art";
import { parseVideo } from "@/lib/video";
import { useSharedVariant } from "./variant-context";

function VideoStage({ url, name }: { url: string; name: string }) {
  const v = parseVideo(url);
  if (!v) return null;
  if (v.kind === "youtube") return <iframe title={`${name} video`} src={`https://www.youtube-nocookie.com/embed/${v.id}?rel=0`} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-[3/4] w-full" />;
  if (v.kind === "file") return <video src={v.src} controls playsInline preload="metadata" className="aspect-[3/4] w-full bg-black object-contain" />;
  return <a href={v.href} target="_blank" rel="noopener noreferrer" className="flex aspect-[3/4] w-full items-center justify-center bg-ink text-white">Watch the video ↗</a>;
}

export function Gallery({ product: base }: { product: Product }) {
  const shared = useSharedVariant();
  // choosing a colour switches to that colour's own photos (when the owner uploaded some)
  const colorImgs = base.colors?.find((c) => c.name === shared?.color)?.images;
  const product = React.useMemo(() => (colorImgs?.length ? { ...base, images: colorImgs } : base), [base, colorImgs]);
  const hasVideo = !!parseVideo(base.videoUrl);
  const [i, setI] = React.useState(0);
  const [zoom, setZoom] = React.useState(false);
  const photos = product.images?.length || 4;
  const n = photos + (hasVideo ? 1 : 0);
  const isVideo = hasVideo && i === photos;
  React.useEffect(() => setI(0), [shared?.color]);
  const go = React.useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  const onDragEnd = (_: unknown, info: PanInfo) => { if (info.offset.x < -50) go(1); else if (info.offset.x > 50) go(-1); };

  React.useEffect(() => {
    if (!zoom) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(false); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", key); };
  }, [zoom, go]);

  const thumbs = (cls: string) => Array.from({ length: n }, (_, k) => (
    <button key={k} type="button" onClick={() => setI(k)} aria-label={hasVideo && k === photos ? "Play video" : `Show photo ${k + 1}`} aria-current={k === i}
      className={cn("relative overflow-hidden rounded-xl border-2 transition", cls, k === i ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}>
      <ProductVisual product={product} view={hasVideo && k === photos ? 0 : k} />
      {hasVideo && k === photos && <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white"><Play className="h-6 w-6 fill-current" /></span>}
    </button>
  ));

  return (
    <div className="grid gap-3 lg:grid-cols-[5rem_1fr]">
      <div className="no-scrollbar order-2 flex gap-2 overflow-x-auto lg:order-1 lg:max-h-[38rem] lg:flex-col lg:overflow-y-auto">{thumbs("w-16 shrink-0 lg:w-full")}</div>
      <div className="relative order-1 overflow-hidden rounded-2xl bg-surface lg:order-2">
        {isVideo ? <VideoStage url={base.videoUrl!} name={base.name} /> : (
          <motion.div key={i} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.2} onDragEnd={onDragEnd} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="cursor-grab active:cursor-grabbing">
            <ProductVisual product={product} view={i} />
          </motion.div>
        )}
        {!isVideo && <button type="button" onClick={() => setZoom(true)} aria-label="Zoom photo" className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow"><ZoomIn className="h-5 w-5" /></button>}
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow"><ChevronRight className="h-5 w-5" /></button>
          </>
        )}
      </div>

      <AnimatePresence>
        {zoom && !isVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Photo zoom" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4" onClick={() => setZoom(false)}>
            <button type="button" aria-label="Close" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"><X className="h-6 w-6" /></button>
            <div className="max-h-[92dvh] w-full max-w-xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}><ProductVisual product={product} view={i} /></div>
            {n > 1 && (<>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Previous photo" className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white"><ChevronLeft className="h-6 w-6" /></button>
              <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Next photo" className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white"><ChevronRight className="h-6 w-6" /></button>
            </>)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
