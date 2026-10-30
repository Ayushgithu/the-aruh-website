"use client";
import * as React from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import type { Announcement } from "@/lib/types";

/** Continuously scrolling ticker above the header. Pauses on hover/focus; static when the visitor prefers reduced motion. */
export function AnnouncementBar({ items }: { items: Announcement[] }) {
  if (!items.length) return null;

  // Longer text scrolls for longer, so the reading speed stays comfortable.
  const chars = items.reduce((n, i) => n + i.text.length, 0);
  const duration = Math.max(24, Math.round(chars * 0.32));

  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((a) => (
        <li key={`${hidden}-${a.id}`} className="flex shrink-0 items-center">
          {a.href ? (
            <Link href={a.href} tabIndex={hidden ? -1 : undefined} className="px-6 underline-offset-4 hover:underline focus-visible:underline">
              {a.text}
            </Link>
          ) : (
            <span className="px-6">{a.text}</span>
          )}
          <span className="h-1 w-1 shrink-0 rounded-full bg-white/60" aria-hidden />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="group relative z-[51] bg-primary text-sm font-medium text-white dark:bg-[#1d4ed8]" role="region" aria-label="Announcements">
      <div className="container-x flex h-9 items-center gap-3">
        <Megaphone className="hidden h-4 w-4 shrink-0 opacity-90 sm:block" aria-hidden />
        <div className="relative min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
          <div
            className="flex w-max animate-marquee motion-reduce:animate-none group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
            style={{ ["--marquee-duration" as string]: `${duration}s` }}
          >
            {row(false)}
            <span className="motion-reduce:hidden">{row(true)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
