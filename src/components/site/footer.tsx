import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { about, budgets, site, waLink } from "@/lib/site";
import { FacebookIcon, InstagramIcon, LogoMark, WhatsAppIcon, YoutubeIcon } from "@/components/ui/icons";
import { NewsletterForm } from "./newsletter-form";
import { PushOptIn } from "./push-optin";

const col = "text-sm text-body transition hover:text-primary";

export function Footer({ collections = [], occasions = [] }: { collections?: { name: string; slug: string }[]; occasions?: { name: string; slug: string }[] }) {
  return (
    <footer className="mt-10 bg-surface">
      <section className="bg-primary text-white">
        <div className="container-x flex flex-col items-start justify-between gap-6 py-10 lg:flex-row lg:items-center">
          <div>
            <p className="eyebrow !text-[#e7c98a]">Stay in the loop</p>
            <h2 className="mt-2 text-2xl !text-white sm:text-3xl">New arrivals &amp; offers, first on WhatsApp</h2>
            <p className="mt-1 text-sm text-white/80">No spam — just fresh styles and festive discounts.</p>
          </div>
          <NewsletterForm />
        </div>
      </section>

      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5"><LogoMark className="h-12 w-14" /><span className="font-serif text-2xl font-semibold text-ink">{site.name}</span></Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{about.paragraphs[0].slice(0, 150)}…</p>
          <div className="mt-5 flex gap-2">
            {[{ href: site.social.instagram, label: "Instagram", Icon: InstagramIcon }, { href: site.social.facebook, label: "Facebook", Icon: FacebookIcon }, { href: site.social.youtube, label: "YouTube", Icon: YoutubeIcon }].map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-primary hover:bg-primary hover:text-white"><Icon className="h-[18px] w-[18px]" /></a>
            ))}
            <a href={waLink(`Hi ${site.name}!`)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition hover:border-whatsapp hover:bg-whatsapp hover:text-white"><WhatsAppIcon className="h-[18px] w-[18px]" /></a>
          </div>
        </div>

        <nav aria-label="Shop">
          <h3 className="font-sans text-sm font-bold uppercase tracking-[0.16em] text-ink">Shop</h3>
          <ul className="mt-4 space-y-2.5">
            <li><Link href="/shop" className={col}>All products</Link></li>
            <li><Link href="/shop?sort=new" className={col}>New arrivals</Link></li>
            <li><Link href="/shop?sort=discount" className={col}>Sale</Link></li>
            {collections.slice(0, 5).map((c) => <li key={c.slug}><Link href={`/collections/${c.slug}`} className={col}>{c.name}</Link></li>)}
            <li><Link href="/accessories" className={col}>Accessories</Link></li>
            {occasions.slice(0, 3).map((o) => <li key={o.slug}><Link href={`/shop/occasion/${o.slug}`} className={col}>{o.name} outfits</Link></li>)}
            {budgets.slice(0, 2).map((n) => <li key={n}><Link href={`/shop/budget/under-${n}`} className={col}>Under ₹{n.toLocaleString("en-IN")}</Link></li>)}
          </ul>
        </nav>

        <nav aria-label="Help">
          <h3 className="font-sans text-sm font-bold uppercase tracking-[0.16em] text-ink">Help</h3>
          <ul className="mt-4 space-y-2.5">
            <li><Link href="/track" className={col}>Track my order</Link></li>
            <li><Link href="/size-guide" className={col}>Size guide</Link></li>
            <li><Link href="/policies/shipping" className={col}>Shipping policy</Link></li>
            <li><Link href="/policies/returns" className={col}>Exchange &amp; returns</Link></li>
            <li><Link href="/policies/privacy" className={col}>Privacy policy</Link></li>
            <li><Link href="/policies/terms" className={col}>Terms of service</Link></li>
            <li><Link href="/about" className={col}>About us</Link></li>
            <li><Link href="/contact" className={col}>Contact</Link></li>
            <li><PushOptIn /></li>
          </ul>
        </nav>

        <div>
          <h3 className="font-sans text-sm font-bold uppercase tracking-[0.16em] text-ink">Visit &amp; contact</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{site.address.join(", ")}</span></li>
            <li><a href={site.phoneHref} className="flex gap-2.5 hover:text-primary"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{site.phone}</a></li>
            <li><a href={`mailto:${site.email}`} className="flex gap-2.5 hover:text-primary"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{site.email}</a></li>
            {site.hours.map((h) => <li key={h.day} className="pl-[26px] text-xs">{h.day}: {h.time}</li>)}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>Secure payments by Razorpay · UPI · Cards · Netbanking · COD</p>
        </div>
      </div>
    </footer>
  );
}
