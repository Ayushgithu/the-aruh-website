import Link from "next/link";
import { SearchX } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ProductCard } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { searchCatalog } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const results = q.length >= 2 ? await searchCatalog(q, 48) : [];

  return (
    <>
      <PageHero title={q ? `Results for “${q}”` : "Search"} description={q && results.length ? `${results.length} ${results.length === 1 ? "product" : "products"} found. Spelling mistakes are okay.` : undefined} crumbs={[{ label: "Search" }]} />
      <div className="container-x pb-16 pt-8">
        {q.length < 2 ? (
          <p className="py-10 text-center text-sm">Type at least 2 letters in the search box (press / to open it).</p>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-faint text-primary"><SearchX className="h-8 w-8" /></span>
            <h2 className="mt-5 text-xl">No matches for “{q}”</h2>
            <p className="mt-2 max-w-sm text-sm">Check the spelling, try fewer words, or tell us what you need and we will find it.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild><Link href="/shop">Browse all styles</Link></Button>
              <Button asChild variant="outline"><Link href="/contact">Ask us to find it</Link></Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </>
  );
}
