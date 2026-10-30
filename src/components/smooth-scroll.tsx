"use client";
import * as React from "react";
import Lenis from "lenis";

/**
 * Lenis smooth scrolling for the whole page. Mounted once in the site layout and the admin layout.
 * - Pauses while a drawer/dialog has locked the page (body overflow hidden).
 * - Inner scrollers (drawers, notification list, search results) carry data-lenis-prevent and keep native scrolling.
 */
export function SmoothScroll() {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });

    let raf = 0;
    const loop = (time: number) => { lenis.raf(time); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);

    const sync = () => { if (document.body.style.overflow === "hidden") lenis.stop(); else lenis.start(); };
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    sync();

    return () => { mo.disconnect(); cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
  return null;
}
