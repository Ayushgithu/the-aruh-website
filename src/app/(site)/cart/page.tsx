import { PageHero } from "@/components/site/page-hero";
import { CartView } from "@/components/site/cart-view";

export const metadata = { title: "Your cart" };

export default function CartPage() {
  return (
    <>
      <PageHero title="Your cart" crumbs={[{ label: "Cart" }]} />
      <CartView />
    </>
  );
}
