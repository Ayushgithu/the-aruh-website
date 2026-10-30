import Link from "next/link";
import { Heart } from "lucide-react";
import { requireUser } from "@/lib/user-auth";
import { getWishlistProducts } from "@/lib/repo-shop";
import { ProductCard } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { ShareWishlist } from "@/components/site/share-wishlist";

export const metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireUser("/account/wishlist");
  const items = await getWishlistProducts(user.id);
  if (!items.length) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-faint text-primary"><Heart className="h-8 w-8" /></span>
        <h2 className="mt-5 text-xl">Your wishlist is empty</h2>
        <p className="mt-2 text-sm">Tap the heart on any product to save it for later.</p>
        <Button asChild className="mt-6"><Link href="/shop">Browse styles</Link></Button>
      </div>
    );
  }
  return (
    <>
      <ShareWishlist />
      <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
    </>
  );
}
