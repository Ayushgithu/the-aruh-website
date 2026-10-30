import { AccountNav } from "@/components/site/account-nav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-x py-8 sm:py-12">
      <h1 className="text-[clamp(1.6rem,1.1rem+2vw,2.5rem)] print:hidden">My account</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[14rem_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
