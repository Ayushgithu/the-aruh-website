import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({ crumbs }: { crumbs: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1">
        <li><Link href="/" className="hover:text-primary">Home</Link></li>
        {crumbs.map((c) => (
          <li key={c.label} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-slate-500" aria-hidden />
            {c.href ? <Link href={c.href} className="hover:text-primary">{c.label}</Link> : <span className="font-medium text-ink" aria-current="page">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHero({ title, description, crumbs }: { title: string; description?: string; crumbs: { label: string; href?: string }[] }) {
  return (
    <section className="border-b border-line bg-linear-to-b from-primary-faint/60 to-card">
      <div className="container-x py-8 sm:py-12">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="mt-4 text-[clamp(1.75rem,1.2rem+2.4vw,3rem)]">{title}</h1>
        {description && <p className="text-lead mt-3 max-w-2xl">{description}</p>}
      </div>
    </section>
  );
}
