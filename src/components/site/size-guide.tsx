"use client";
import * as React from "react";
import Link from "next/link";
import { Ruler } from "lucide-react";
import { Dialog } from "@/components/ui/drawer";
import { sizeGuide, waLink } from "@/lib/site";

export function SizeChartTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[22rem] text-center text-sm">
        <thead className="bg-primary-faint text-ink">
          <tr>{sizeGuide.columns.map((c) => <th key={c} scope="col" className="px-3 py-3 font-semibold">{c}</th>)}</tr>
        </thead>
        <tbody>
          {sizeGuide.rows.map((r, i) => (
            <tr key={r[0]} className={i % 2 ? "bg-surface/70" : "bg-card"}>
              {r.map((cell, j) => j === 0 ? <th key={j} scope="row" className="px-3 py-2.5 font-semibold text-ink">{cell}</th> : <td key={j} className="px-3 py-2.5">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-3 py-2 text-xs">All measurements are body measurements in {sizeGuide.unit}.</p>
    </div>
  );
}

export function SizeGuideButton({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? "inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"}>
        <Ruler className="h-4 w-4" /> Size guide
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Size guide" wide>
        <SizeChartTable />
        <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm">{sizeGuide.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="mt-4 text-sm">Still unsure? <a href={waLink("Hi! Can you help me choose my size?")} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">Ask us on WhatsApp</a> or see the <Link href="/size-guide" onClick={() => setOpen(false)} className="font-semibold text-primary hover:underline">full size guide</Link>.</p>
      </Dialog>
    </>
  );
}
