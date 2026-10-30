import { requireUser } from "@/lib/user-auth";
import { getAddresses } from "@/lib/repo-shop";
import { AddressBook } from "@/components/site/address-book";

export const metadata = { title: "Saved addresses" };
export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  return <div><h2 className="mb-5 text-2xl">Saved addresses</h2><AddressBook initial={await getAddresses(user.id)} /></div>;
}
