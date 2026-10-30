import type { Metadata } from "next";
import { Clock, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ContactForm } from "@/components/site/contact-form";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { site, waLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Call, WhatsApp or visit ${site.name}. Find our address, opening hours and send us a message.`,
};

export default function ContactPage() {
  return (
    <>
      <PageHero title="Talk to us" description="Questions about sizing, an order or an offer? Message us and a real person will reply." crumbs={[{ label: "Contact" }]} />
      <section className="bg-card py-10 sm:py-14">
        <div className="container-x grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <ContactForm />

          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-card p-6 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Button asChild size="lg" className="flex-1"><a href={site.phoneHref}><Phone className="h-5 w-5" /> Call now</a></Button>
                <Button asChild size="lg" variant="whatsapp" className="flex-1">
                  <a href={waLink(`Hi ${site.name}!`)} target="_blank" rel="noopener noreferrer"><WhatsAppIcon className="h-5 w-5" /> WhatsApp</a>
                </Button>
              </div>
              <p className="mt-4 text-sm">{site.phone} · {site.email}</p>
            </div>

            <div className="rounded-2xl border border-line bg-card p-6 shadow-card">
              <h2 className="flex items-center gap-2 text-base font-semibold"><MapPin className="h-5 w-5 text-primary" /> Visit the store</h2>
              <address className="mt-3 text-sm not-italic">{site.address.map((l) => <span key={l} className="block">{l}</span>)}</address>
            </div>

            <div className="rounded-2xl border border-line bg-card p-6 shadow-card">
              <h2 className="flex items-center gap-2 text-base font-semibold"><Clock className="h-5 w-5 text-primary" /> Business hours</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {site.hours.map((h) => (
                  <div key={h.day} className="flex justify-between gap-4"><dt>{h.day}</dt><dd className="font-medium text-ink">{h.time}</dd></div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface pb-14 pt-2 sm:pb-20">
        <div className="container-x">
          <div className="overflow-hidden rounded-2xl border border-line shadow-card">
            <iframe
              title={`${site.name} store location`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&output=embed`}
              className="h-[320px] w-full sm:h-[420px]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>
    </>
  );
}
