import * as React from "react";
import type { ArtKind, Product, Tone } from "@/lib/types";
import { cn } from "@/lib/utils";

/* Vector placeholders used until real product photos are uploaded.
   Every product gets 4 "views" so the gallery, zoom and swipe are fully demo-able. */

const T: Record<Tone, { a: string; b: string; c: string; bezel: string }> = {
  silver: { a: "#F1F5F9", b: "#CBD5E1", c: "#94A3B8", bezel: "#0B1220" },
  graphite: { a: "#94A3B8", b: "#64748B", c: "#475569", bezel: "#020617" },
  black: { a: "#475569", b: "#334155", c: "#1E293B", bezel: "#020617" },
  blue: { a: "#93C5FD", b: "#60A5FA", c: "#2563EB", bezel: "#0B1220" },
};

interface ArtProps {
  kind: ArtKind;
  tone: Tone;
  hue: number;
  view?: number;
  className?: string;
  title?: string;
}

/** Elegant placeholder shown until real photos are uploaded (a kurti on a hanger over a soft tinted background). */
function ClothArt({ hue, view, className, title }: { hue: number; view: number; className?: string; title?: string }) {
  const uid = React.useId().replace(/:/g, "");
  const dots = Array.from({ length: 16 }, (_, i) => ({ x: 100 + ((i * 37 + view * 11) % 100), y: 150 + ((i * 53 + view * 17) % 160) }));
  return (
    <svg viewBox="0 0 300 400" className={cn("h-full w-full", className)} role="img" aria-label={title ?? "Outfit illustration"} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={`hsl(${hue} 70% 96%)`} /><stop offset="1" stopColor={`hsl(${(hue + 20) % 360} 55% 88%)`} /></linearGradient>
        <linearGradient id={`fb${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={`hsl(${hue} 55% 46%)`} /><stop offset="1" stopColor={`hsl(${(hue + 18) % 360} 60% 34%)`} /></linearGradient>
      </defs>
      <rect width="300" height="400" fill={`url(#bg${uid})`} />
      <circle cx="240" cy="70" r="70" fill="#fff" opacity="0.35" />
      <path d="M150 52v-10a9 9 0 1 1 9 9" fill="none" stroke="#b88a3e" strokeWidth="3" strokeLinecap="round" />
      <path d="M150 52 L62 108 M150 52 L238 108" stroke="#b88a3e" strokeWidth="3" strokeLinecap="round" />
      <g transform={view % 2 ? "translate(0 0)" : "translate(0 0)"}>
        <path d="M112 96 Q150 122 188 96 L232 118 L212 170 L226 340 Q150 362 74 340 L88 170 L68 118 Z" fill={`url(#fb${uid})`} />
        <path d="M112 96 Q150 122 188 96" fill="none" stroke="#e7c98a" strokeWidth="3" />
        <path d="M88 330 Q150 350 226 330" fill="none" stroke="#e7c98a" strokeWidth="4" strokeDasharray="2 7" strokeLinecap="round" />
        {dots.map((d, i) => <circle key={i} cx={d.x + (i % 2 ? 8 : -8)} cy={d.y} r={view === 1 ? 4 : 2.2} fill="#f4e8d1" opacity="0.75" />)}
      </g>
      <ellipse cx="150" cy="378" rx="86" ry="6" fill="#28181d" opacity="0.08" />
    </svg>
  );
}

export function ProductArt({ kind, tone, hue, view = 0, className, title }: ArtProps) {
  if (kind === "cloth") return <ClothArt hue={hue} view={view} className={className} title={title} />;
  const uid = React.useId().replace(/:/g, "");
  const t = T[tone];
  const isLaptop = kind === "laptop" || kind === "macbook" || kind === "gaming";

  return (
    <svg
      viewBox="0 0 400 300"
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={title ?? `${kind} illustration`}
    >
      <defs>
        <linearGradient id={`b${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.a} />
          <stop offset="1" stopColor={t.b} />
        </linearGradient>
        <linearGradient id={`w${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={kind === "gaming" ? `hsl(${hue} 85% 50%)` : `hsl(${hue} 90% 62%)`} />
          <stop offset="1" stopColor={kind === "gaming" ? "#0F172A" : `hsl(${(hue + 45) % 360} 80% 38%)`} />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="254" rx="165" ry="10" fill="#0F172A" opacity="0.08" />
      {isLaptop ? (
        <Laptop uid={uid} t={t} kind={kind} hue={hue} view={view} />
      ) : (
        <g transform={accTransform(view)}>
          <Accessory uid={uid} t={t} kind={kind} hue={hue} />
        </g>
      )}
    </svg>
  );
}

const accTransform = (v: number) =>
  [
    "",
    "translate(-70 -55) scale(1.35)",
    "translate(400 0) scale(-1 1) rotate(-4 200 150)",
    "translate(40 30) scale(0.8)",
  ][v % 4];

/* ------------------------------- Laptops ---------------------------------- */
function Laptop({ uid, t, kind, hue, view }: { uid: string; t: (typeof T)[Tone]; kind: ArtKind; hue: number; view: number }) {
  const mac = kind === "macbook";
  const gaming = kind === "gaming";
  const v = view % 4;

  if (v === 1) {
    // Closed lid
    return (
      <g>
        <rect x="60" y="42" width="280" height="196" rx="16" fill={`url(#b${uid})`} />
        <rect x="60" y="42" width="280" height="196" rx="16" fill="none" stroke="#fff" strokeOpacity="0.35" />
        {mac ? (
          <circle cx="200" cy="140" r="16" fill="#fff" opacity="0.55" />
        ) : gaming ? (
          <path d="M150 140 L200 112 L250 140 L200 168Z" fill="none" stroke={`hsl(${hue} 90% 60%)`} strokeWidth="4" />
        ) : (
          <rect x="172" y="134" width="56" height="12" rx="6" fill="#fff" opacity="0.5" />
        )}
        <rect x="150" y="226" width="100" height="4" rx="2" fill={t.c} opacity="0.6" />
      </g>
    );
  }

  if (v === 2) {
    // Keyboard top-down
    const rows = [13, 13, 12, 12, 9];
    return (
      <g>
        <rect x="36" y="30" width="328" height="222" rx="18" fill={`url(#b${uid})`} />
        <rect x="52" y="46" width="296" height="118" rx="10" fill={t.c} opacity="0.25" />
        {rows.map((n, r) =>
          Array.from({ length: n }).map((_, i) => {
            const w = 20;
            const gap = 3.2;
            const total = n * w + (n - 1) * gap;
            return (
              <rect
                key={`${r}-${i}`}
                x={200 - total / 2 + i * (w + gap)}
                y={56 + r * 22}
                width={r === 4 && i === 4 ? w : w}
                height="18"
                rx="4"
                fill={gaming ? `hsl(${hue} 90% 62%)` : t.bezel}
                opacity={gaming ? 0.9 : 0.82}
              />
            );
          }),
        )}
        <rect x="152" y="176" width="96" height="60" rx="9" fill="none" stroke={t.c} strokeWidth="2" />
      </g>
    );
  }

  if (v === 3) {
    // Side profile with port row
    return (
      <g>
        <rect x="48" y="206" width="304" height="16" rx="8" fill={`url(#b${uid})`} />
        <g transform="rotate(14 320 206)">
          <rect x="308" y="52" width="14" height="156" rx="6" fill={t.bezel} />
          <rect x="308" y="52" width="6" height="156" rx="3" fill={`url(#b${uid})`} />
        </g>
        {[70, 96, 122, 148].map((x) => (
          <rect key={x} x={x} y="212" width="18" height="5" rx="2.5" fill={t.bezel} opacity="0.75" />
        ))}
        <circle cx="330" cy="214" r="3" fill={gaming ? `hsl(${hue} 90% 60%)` : t.c} />
      </g>
    );
  }

  // v === 0 : open, front-facing
  return (
    <g>
      <rect x="72" y="28" width="256" height="178" rx={mac ? 14 : 12} fill={t.bezel} />
      <rect x="80" y="36" width="240" height="162" rx="6" fill={`url(#w${uid})`} />
      <circle cx="250" cy="82" r="46" fill="#fff" opacity="0.15" />
      <circle cx="132" cy="160" r="62" fill="#fff" opacity="0.09" />
      <rect x="96" y="54" width="112" height="9" rx="4.5" fill="#fff" opacity="0.7" />
      <rect x="96" y="72" width="76" height="6" rx="3" fill="#fff" opacity="0.42" />
      <rect x="96" y="132" width="52" height="34" rx="6" fill="#fff" opacity="0.22" />
      <rect x="156" y="132" width="52" height="34" rx="6" fill="#fff" opacity="0.22" />
      <rect x="216" y="132" width="52" height="34" rx="6" fill="#fff" opacity="0.22" />
      {mac && <rect x="176" y="28" width="48" height="10" rx="5" fill={t.bezel} />}
      {!mac && <circle cx="200" cy="32" r="1.8" fill="#475569" />}
      <path d="M38 210 H362 L374 228 Q376 238 366 238 H34 Q24 238 26 228 Z" fill={`url(#b${uid})`} />
      <rect x="164" y="210" width="72" height="6" rx="3" fill={t.c} opacity="0.8" />
      {gaming && <rect x="60" y="230" width="280" height="3" rx="1.5" fill={`hsl(${hue} 90% 60%)`} />}
    </g>
  );
}

/* ------------------------------ Accessories ------------------------------- */
function Accessory({ uid, t, kind, hue }: { uid: string; t: (typeof T)[Tone]; kind: ArtKind; hue: number }) {
  const body = `url(#b${uid})`;
  const dark = t.bezel;

  switch (kind) {
    case "charger":
      return (
        <g>
          <path d="M200 182 C200 240 120 220 96 262" stroke={dark} strokeWidth="7" fill="none" strokeLinecap="round" />
          <rect x="82" y="252" width="30" height="16" rx="4" fill={t.c} transform="rotate(-25 97 260)" />
          <rect x="176" y="84" width="20" height="16" rx="3" fill={t.c} />
          <rect x="206" y="84" width="20" height="16" rx="3" fill={t.c} />
          <rect x="136" y="98" width="128" height="86" rx="16" fill={body} />
          <circle cx="164" cy="150" r="5" fill="#22C55E" />
          <rect x="182" y="144" width="52" height="8" rx="4" fill={dark} opacity="0.35" />
        </g>
      );
    case "mouse":
      return (
        <g>
          <path d="M200 58 C268 58 288 120 282 192 C276 246 242 264 200 264 C158 264 124 246 118 192 C112 120 132 58 200 58Z" fill={body} />
          <path d="M200 60 V142 M120 142 H282" stroke={dark} strokeOpacity="0.28" strokeWidth="2.5" fill="none" />
          <rect x="192" y="86" width="16" height="30" rx="8" fill={dark} />
          <circle cx="200" cy="216" r="8" fill={`hsl(${hue} 90% 62%)`} opacity="0.85" />
        </g>
      );
    case "bag":
      return (
        <g>
          <path d="M166 76 C166 30 234 30 234 76" stroke={dark} strokeWidth="9" fill="none" strokeLinecap="round" />
          <rect x="108" y="66" width="184" height="196" rx="34" fill={`hsl(${hue} 70% 46%)`} />
          <rect x="108" y="66" width="184" height="196" rx="34" fill="none" stroke="#fff" strokeOpacity="0.25" />
          <rect x="130" y="176" width="140" height="70" rx="18" fill="#000" opacity="0.14" />
          <path d="M138 120 H262" stroke="#fff" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
          <circle cx="200" cy="120" r="5" fill="#fff" opacity="0.8" />
          <rect x="88" y="120" width="20" height="90" rx="10" fill={dark} opacity="0.5" />
          <rect x="292" y="120" width="20" height="90" rx="10" fill={dark} opacity="0.5" />
        </g>
      );
    case "keyboard":
      return (
        <g>
          <rect x="44" y="96" width="312" height="116" rx="14" fill={body} />
          {[0, 1, 2, 3].map((r) =>
            Array.from({ length: 12 }).map((_, i) => (
              <rect key={`${r}-${i}`} x={62 + i * 24} y={108 + r * 24} width="20" height="19" rx="4" fill={dark} opacity="0.8" />
            )),
          )}
        </g>
      );
    case "headphones":
      return (
        <g>
          <path d="M112 176 C112 58 288 58 288 176" stroke={dark} strokeWidth="15" fill="none" strokeLinecap="round" />
          <rect x="86" y="146" width="52" height="94" rx="26" fill={body} />
          <rect x="262" y="146" width="52" height="94" rx="26" fill={body} />
          <rect x="96" y="160" width="20" height="66" rx="10" fill={dark} opacity="0.7" />
          <rect x="284" y="160" width="20" height="66" rx="10" fill={dark} opacity="0.7" />
        </g>
      );
    case "ssd":
      return (
        <g>
          <rect x="116" y="64" width="168" height="168" rx="22" fill={body} />
          <rect x="116" y="64" width="168" height="168" rx="22" fill="none" stroke="#fff" strokeOpacity="0.35" />
          <rect x="140" y="92" width="120" height="10" rx="5" fill={dark} opacity="0.4" />
          <circle cx="200" cy="158" r="26" fill={`hsl(${hue} 90% 55%)`} opacity="0.9" />
          <rect x="176" y="224" width="48" height="8" rx="3" fill={dark} opacity="0.8" />
        </g>
      );
    case "dock":
      return (
        <g>
          <path d="M300 180 C340 190 350 230 372 250" stroke={dark} strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="60" y="120" width="250" height="84" rx="14" fill={body} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={84 + i * 36} y="168" width="24" height="10" rx="3" fill={dark} opacity="0.8" />
          ))}
          <circle cx="86" cy="142" r="4" fill="#22C55E" />
        </g>
      );
    case "stand":
      return (
        <g>
          <path d="M128 176 L118 250 M282 158 L296 250" stroke={t.c} strokeWidth="9" strokeLinecap="round" />
          <path d="M86 154 L316 132 L336 168 L108 196Z" fill={body} />
          <rect x="132" y="86" width="150" height="62" rx="8" fill={dark} transform="rotate(-6 200 120)" />
          <rect x="138" y="92" width="138" height="50" rx="4" fill={`hsl(${hue} 85% 60%)`} opacity="0.85" transform="rotate(-6 200 120)" />
        </g>
      );
    case "ram":
      return (
        <g>
          <rect x="60" y="100" width="280" height="96" rx="6" fill="#0F172A" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={84 + i * 58} y="116" width="44" height="40" rx="4" fill="#1E293B" stroke="#475569" />
          ))}
          <rect x="84" y="164" width="232" height="6" rx="3" fill={`hsl(${hue} 80% 55%)`} opacity="0.7" />
          {Array.from({ length: 30 }).map((_, i) => (
            <rect key={i} x={68 + i * 9} y="182" width="5" height="12" fill="#FBBF24" />
          ))}
          <rect x="188" y="186" width="6" height="10" fill="#0F172A" />
        </g>
      );
    case "hub":
      return (
        <g>
          <path d="M120 150 C80 150 70 130 52 122" stroke={dark} strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="112" y="100" width="180" height="76" rx="14" fill={body} />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={128 + i * 23} y="144" width="17" height="10" rx="2.5" fill={dark} opacity="0.8" />
          ))}
          <rect x="128" y="116" width="52" height="8" rx="4" fill="#fff" opacity="0.5" />
        </g>
      );
    case "cooler":
      return (
        <g>
          <rect x="70" y="70" width="260" height="172" rx="24" fill={body} />
          <circle cx="200" cy="156" r="52" fill="none" stroke={`hsl(${hue} 90% 60%)`} strokeWidth="4" />
          <g stroke={dark} strokeWidth="6" strokeLinecap="round">
            <path d="M200 156 L200 116 M200 156 L236 174 M200 156 L164 174" />
          </g>
          {[[108, 108], [292, 108], [108, 204], [292, 204]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="16" fill="none" stroke={dark} strokeWidth="3" />
          ))}
        </g>
      );
    default:
      return <rect x="120" y="90" width="160" height="120" rx="16" fill={body} />;
  }
}

/* ------------------------------ Product image ----------------------------- */
export function ProductVisual({ product, view = 0, className }: { product: Product; view?: number; className?: string }) {
  const { hue } = product.art;
  const src = product.images?.[view];
  return (
    <div
      className={cn("relative w-full overflow-hidden", product.art.kind === "cloth" ? "aspect-[3/4]" : "aspect-[4/3]", className)}
      style={{ background: `linear-gradient(140deg, hsl(${hue} 100% 98%), hsl(${hue} 85% 92%))` }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={product.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <ProductArt {...product.art} view={view} title={product.name} className={product.art.kind === "cloth" ? "" : "p-3"} />
      )}
    </div>
  );
}
