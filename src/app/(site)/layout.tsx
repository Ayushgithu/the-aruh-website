import { CustomerProvider } from "@/hooks/use-customer";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { WhatsAppFab } from "@/components/site/whatsapp-fab";
import { MobileNav } from "@/components/site/mobile-nav";
import { InstallPrompt } from "@/components/site/pwa";
import { SmoothScroll } from "@/components/smooth-scroll";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { getAnnouncements, getCollections, getFacets } from "@/lib/repo";
import { getRules } from "@/lib/settings";
import { RulesProvider } from "@/hooks/use-rules";
import { SaleTimerBar } from "@/components/site/sale-timer";
import type { Announcement } from "@/lib/types";

export const dynamic = "force-dynamic"; // the top bar must always reflect what the dashboard saved

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let announcements: Announcement[] = [];
  let collections: { name: string; slug: string }[] = [];
  let occasions: { name: string; slug: string }[] = [];
  try { announcements = await getAnnouncements(true); } catch { /* a database hiccup must never take the whole site down */ }
  try { collections = (await getCollections()).map(({ name, slug }) => ({ name, slug })); } catch {}
  try { occasions = (await getFacets()).occasions.map(({ name, slug }) => ({ name, slug })); } catch {}

  const rules = await getRules();

  return (
    <RulesProvider rules={rules}>
    <CustomerProvider>
      <SmoothScroll />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>
      <div className="print:hidden"><AnnouncementBar items={announcements} /></div>
      <SaleTimerBar />
      <Header collections={collections} />
      <main id="main" className="pb-16 md:pb-0">{children}</main>
      <div className="print:hidden"><Footer collections={collections} occasions={occasions} /></div>
      <div className="print:hidden"><WhatsAppFab /></div>
      <MobileNav />
      <InstallPrompt />
    </CustomerProvider>
    </RulesProvider>
  );
}
