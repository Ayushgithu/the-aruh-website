"use client";
import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Item { file: File; url: string }

export function PhotoUpload({ files, onChange, max = 5, maxMb = 5 }: {
  files: File[]; onChange: (f: File[]) => void; max?: number; maxMb?: number;
}) {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [items, setItems] = React.useState<Item[]>([]);

  React.useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setItems(next);
    return () => next.forEach((i) => URL.revokeObjectURL(i.url));
  }, [files]);

  const add = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); return false; }
      if (f.size > maxMb * 1024 * 1024) { toast.error(`${f.name} is larger than ${maxMb} MB`); return false; }
      return true;
    });
    const merged = [...files, ...incoming].slice(0, max);
    if (files.length + incoming.length > max) toast(`You can add up to ${max} photos`);
    onChange(merged);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={cn("rounded-2xl border-2 border-dashed p-5 text-center transition-colors", drag ? "border-primary bg-primary-faint" : "border-line bg-surface")}
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-card text-primary shadow-card"><ImagePlus className="h-6 w-6" /></span>
        <p className="mt-3 text-sm font-medium text-ink">Drag photos here, or</p>
        <button type="button" onClick={() => inputRef.current?.click()} className="mt-1 inline-flex min-h-11 items-center px-3 text-sm font-semibold text-primary hover:underline">
          choose from your device
        </button>
        <p className="text-xs">Up to {max} photos, {maxMb} MB each. Show the lid, screen, keyboard and ports.</p>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </div>
      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {items.map((it, idx) => (
            <li key={it.url} className="relative aspect-square overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => onChange(files.filter((_, i) => i !== idx))} aria-label={`Remove photo ${idx + 1}`}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/75 text-white hover:bg-slate-900">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
