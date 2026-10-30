import { PageHero } from "@/components/site/page-hero";
import { CheckoutView } from "@/components/site/checkout-view";
import { getUserSession } from "@/lib/user-auth";
import { getAddresses, getSavedAddress } from "@/lib/repo-shop";
import { razorpayConfigured } from "@/lib/razorpay";
import { getWallet } from "@/lib/wallet";
import { getRules } from "@/lib/settings";

export const metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getUserSession().catch(() => null);
  const [saved, addresses] = user ? await Promise.all([getSavedAddress(user.id).catch(() => null), getAddresses(user.id).catch(() => [])]) : [null, []];
  const wallet = user && !user.guest && (await getRules()).wallet.enabled ? (await getWallet(user.id, 1).catch(() => ({ balance: 0 }))).balance : 0;
  return (
    <>
      <PageHero title="Checkout" crumbs={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
      <CheckoutView saved={saved} addresses={addresses} onlineEnabled={razorpayConfigured()} wallet={wallet} />
    </>
  );
}
