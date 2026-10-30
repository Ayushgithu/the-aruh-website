import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = { title: "You're offline" };

export default function OfflinePage() {
  return (
    <section className="section">
      <div className="container-x flex max-w-lg flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-faint text-primary"><WifiOff className="h-8 w-8" /></span>
        <h1 className="mt-6 text-3xl">You are offline</h1>
        <p className="mt-3">This page has not been saved yet. Reconnect to the internet to keep browsing — pages you have already viewed will still open.</p>
        <Button asChild className="mt-6"><Link href="/">Back to home</Link></Button>
      </div>
    </section>
  );
}
