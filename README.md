# Clothing Website (customer store)

Next.js 16 · MongoDB · Razorpay. A boutique-style store: hero, collections, best sellers, new arrivals, deal banner, lookbook, reviews,
Instagram grid, shop with filters (collection / size / price), product page with **size + colour picker, size guide, pincode check,
WhatsApp order, quick add, recently viewed**, wishlist, bag with free-shipping progress bar, checkout (Razorpay + COD), accounts, orders, PWA.

The admin panel is a **separate project** (`clothing-dashboard`). Both share ONE MongoDB: what you save in the dashboard shows up here.

```bash
cp .env.example .env.local     # same MONGODB_URI as the dashboard
npm install
npm run dev                    # http://localhost:3000
npm run build && npm start
```

## What customers get
Size + colour picker · **"Find my size"** (height & weight) · size guide · colour-wise photos · product video · pincode delivery check ·
quick add · wishlist (+ **share link**) · **guest checkout** · **saved addresses** · **UPI-first payment** (GPay / PhonePe / Paytm) ·
**COD with optional advance** · festival **sale countdown** · **order tracking** (account page, or `/track` with order number + phone) ·
**return & exchange requests** from the order page (with photos) · push alerts.

## Also included
**Store wallet** (refund to wallet with optional bonus, use it at checkout, history at `/account/wallet`) · **delivery date promise**
("Get it by Fri, 24 Oct" at checkout, product page and on the order) · **shop by occasion / colour / budget** pages that Google can find
(`/shop/occasion/…`, `/shop/colour/…`, `/shop/budget/under-1500`, plus `sitemap.xml`, `robots.txt` and product structured data) ·
**flash sale** on selected products with their own countdown.

## Changed from the dashboard (no code)
Delivery fee & free-shipping amount, COD on/off + limit + **advance**, **blocked pincodes**, guest checkout, return/exchange windows & reasons,
the size-recommender chart, the delivery-time rules, the wallet bonus and the sale countdown all live in **Dashboard → Store rules**.

## Make it yours (no coding needed)
| What | Where |
|---|---|
| Brand name | `NEXT_PUBLIC_BRAND_NAME` in `.env.local` (and Vercel) |
| Phone, WhatsApp, address, social links, size chart, about text, policies, testimonials, menu | `src/lib/site.ts` |
| Colours (maroon + gold by default) | top of `src/app/globals.css` (`--color-primary`, `--color-gold`, …) |
| Fonts | `globals.css` — headings use Playfair Display, text uses Inter |
| Free-shipping amount, delivery fee, COD, returns, size chart, countdown | **Dashboard → Store rules** |
| App icon / splash | `npm run icons` |
| Products, collections, photos, banners, top bar, hero slides | the dashboard |

Collections are created automatically from the "Collection" you type on each product in the dashboard.
Until you upload photos, a neutral dress illustration is shown instead.

## Deploy (e.g. Vercel)
Import this folder as its own project, add the env vars from `.env.example`, and set `NEXT_PUBLIC_SITE_URL` to the live address.
Razorpay webhook: `https://YOUR-WEBSITE/api/razorpay/webhook`.

## Optional: push notifications
`npx web-push generate-vapid-keys`, put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` here **and** in the dashboard (which also needs the private key).
Customers opt in from the footer ("Get new-arrival & sale alerts"). Only works on the live https site.

## Good to know
- Guest checkout creates a small throw-away account per visitor. You can delete old `guest: true` users from MongoDB now and then.
- The pincode check is an estimate by zone; blocked pincodes come from Store rules.

## SEO
Set `NEXT_PUBLIC_SITE_URL` to your live address so `sitemap.xml`, canonical links and share previews use it. Submit `https://YOUR-SITE/sitemap.xml` in Google Search Console.
The "shop by occasion / colour" pages are created automatically from the *Occasion* and *Colour* you type on products — use the same spelling every time.
