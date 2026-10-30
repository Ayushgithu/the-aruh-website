import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { policies } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = policies[(await params).slug];
  return p ? { title: p.title } : {};
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const policy = policies[(await params).slug];
  if (!policy) notFound();
  return (
    <>
      <PageHero title={policy.title} crumbs={[{ label: policy.title }]} />
      <div className="container-x max-w-3xl space-y-4 py-12 text-lg leading-relaxed">{policy.body.map((t) => <p key={t}>{t}</p>)}</div>
    </>
  );
}
