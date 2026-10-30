"use client";
import * as React from "react";
import { site } from "@/lib/site";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/icons";

export function PwaRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "lc_install_dismissed_at";
const WEEK = 7 * 24 * 3600 * 1000;

/** Custom, dismissible "Install app" banner (Android/desktop prompt + iOS instructions). */
export function InstallPrompt() {
  const [evt, setEvt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = React.useState(false);
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    let dismissedAt = 0;
    try { dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0); } catch {}
    if (Date.now() - dismissedAt < WEEK) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    let timer: ReturnType<typeof setTimeout>;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      timer = setTimeout(() => setShow(true), 6000);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (isIos) {
      setIos(true);
      timer = setTimeout(() => setShow(true), 8000);
    }
    const onInstalled = () => setShow(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    setEvt(null);
    if (outcome === "accepted") setShow(false);
    else dismiss();
  };

  if (!show || (!evt && !ios)) return null;

  return (
    <div
      role="dialog"
      aria-label={`Install ${site.name} app`}
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] rounded-2xl border border-line bg-card p-4 shadow-lift sm:inset-x-auto sm:bottom-6 sm:left-6 sm:w-[22rem]"
    >
      <button onClick={dismiss} aria-label="Dismiss install prompt" className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-surface hover:text-ink">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <LogoMark className="h-11 w-14 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-ink">Install the {site.name} app</p>
          {evt ? (
            <p className="mt-0.5 text-sm">Faster browsing, works offline for pages you have viewed.</p>
          ) : (
            <p className="mt-0.5 text-sm">
              Tap <Share className="mx-0.5 inline h-4 w-4 align-[-3px] text-primary" /> then <strong className="font-semibold text-ink">Add to Home Screen</strong>.
            </p>
          )}
        </div>
      </div>
      {evt && (
        <div className="mt-3 flex gap-2">
          <Button onClick={install} className="flex-1"><Download className="h-4 w-4" /> Install</Button>
          <Button variant="ghost" onClick={dismiss}>Not now</Button>
        </div>
      )}
    </div>
  );
}
