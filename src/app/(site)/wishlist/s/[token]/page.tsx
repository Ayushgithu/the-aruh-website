import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { getSharedWishlist } from "@/lib/repo-shop";
import { ProductCard } from "@/components/site/product-card";
import { PageHero } from "@/components/site/page-hero";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared wishlist", robots: { index: false, follow: false } };

export default async function SharedWishlistPage({ params }: { params: Promise<{ token: string }> }) {
  const w = await getSharedWishlist((await params).token);
  if (!w) notFound();
  return (
    <>
      <PageHero title={`${w.owner}’s wishlist`} description="Pieces they are loving right now." crumbs={[{ label: "Wishlist" }]} />
      <div className="container-x py-10">
        {w.items.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-faint text-primary"><Heart className="h-8 w-8" /></span>
            <p className="mt-5">Nothing here yet.</p><Button asChild className="mt-5 rounded-full"><Link href="/shop">Browse styles</Link></Button>
          </div>
        ) : <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">{w.items.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}</ul>}
      </div>
    </>
  );
}
