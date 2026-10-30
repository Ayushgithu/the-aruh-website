import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { SizeChartTable } from "@/components/site/size-guide";
import { sizeGuide, waLink } from "@/lib/site";

export const metadata: Metadata = { title: "Size guide" };

export default function SizeGuidePage() {
  return (
    <>
      <PageHero title="Size guide" description="Find your perfect fit." crumbs={[{ label: "Size guide" }]} />
      <div className="container-x max-w-3xl space-y-6 py-12">
        <SizeChartTable />
        <h2 className="text-2xl">How to measure</h2>
        <ul className="list-disc space-y-2 pl-5">{sizeGuide.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        <p>Need help choosing? <a className="font-semibold text-primary hover:underline" href={waLink("Hi! Can you help me choose my size?")} target="_blank" rel="noopener noreferrer">Message us on WhatsApp</a>.</p>
      </div>
    </>
  );
}
