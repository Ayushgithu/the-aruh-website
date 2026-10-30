import { ProfileForms } from "@/components/site/profile-forms";
import { requireUser } from "@/lib/user-auth";

export const metadata = { title: "Profile & password" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser("/account");
  return <ProfileForms name={user.name} email={user.email} phone={user.phone} />;
}
