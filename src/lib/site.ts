/* =====================================================================================
   THE ONE FILE TO CUSTOMISE YOUR WEBSITE
   Brand name, contact details, size chart, policies, "about" text, testimonials.
   (Colours live at the top of src/app/globals.css.)
   The brand name can also be set without touching code: NEXT_PUBLIC_BRAND_NAME in .env.local / Vercel.
   ===================================================================================== */
import { FREE_SHIPPING_ABOVE } from "./pricing";
import type { Product } from "./types";
import { formatPrice } from "./utils";

export const site = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "The Aaruh",
  tagline: "Handcrafted ethnic & everyday wear",
  description: "Beautiful suit sets, sarees, co-ords and dresses — designed with love, stitched with care and delivered to your door.",
  phone: "+91 98765 43210",
  phoneHref: "tel:+919876543210",
  whatsapp: "919876543210", // country code + number, no "+" or spaces
  email: "hello@theaaruh.in",
  address: ["Your shop / studio address", "City, State PIN"],
  hours: [
    { day: "Monday – Saturday", time: "10:30 AM – 8:00 PM" },
    { day: "Sunday", time: "11:00 AM – 5:00 PM" },
  ],
  mapQuery: "Your city",
  social: { instagram: "https://instagram.com/", facebook: "https://facebook.com/", youtube: "https://youtube.com/" },
  instagramHandle: "@theaaruh",
  exchangeDays: 7,
  freeShippingAbove: FREE_SHIPPING_ABOVE,
};

/** Top navigation. The "Collections" menu is filled automatically from the categories you create in the dashboard. */
export const nav = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/shop" },
  { label: "New Arrivals", href: "/shop?sort=new" },
  { label: "Sale", href: "/shop?sort=discount" },
  { label: "Accessories", href: "/accessories" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** "Shop by budget" pages (each becomes /shop/budget/under-1500 etc. and appears in Google). Edit the numbers freely. */
export const budgets = [1000, 1500, 2000, 3000];

/** Shown in the top strip, the cart and the product page. */
export const usps = [
  { title: "Free shipping", text: `On orders above ${formatPrice(FREE_SHIPPING_ABOVE)}` },
  { title: "Easy exchange", text: `${site.exchangeDays}-day exchange on unworn pieces` },
  { title: "Cash on delivery", text: "Pay when it reaches you" },
  { title: "Secure payments", text: "UPI, cards & netbanking" },
];

/** Size chart (inches, body measurements). Edit freely. */
export const sizeGuide = {
  unit: "inches",
  columns: ["Size", "Bust", "Waist", "Hip", "Shoulder"],
  rows: [
    ["XS", "32", "26", "35", "13.5"],
    ["S", "34", "28", "37", "14"],
    ["M", "36", "30", "39", "14.5"],
    ["L", "38", "32", "41", "15"],
    ["XL", "40", "34", "43", "15.5"],
    ["XXL", "42", "36", "45", "16"],
    ["XXXL", "44", "38", "47", "16.5"],
  ],
  tips: [
    "Measure over light innerwear with the tape snug, not tight.",
    "Between two sizes? Pick the larger one for a relaxed fit.",
    "Need help? Send us your measurements on WhatsApp and we will suggest your size.",
  ],
};

export const about = {
  title: "Our story",
  paragraphs: [
    `${site.name} began with a simple belief: clothes should feel like a compliment. Every piece is designed in-house, made from soft, breathable fabrics and finished with details that make everyday moments feel special.`,
    "From festive suit sets to easy co-ords, we keep our collections small and thoughtful, so you always find something that fits your occasion — and your budget.",
    "Replace this text with your own story from src/lib/site.ts.",
  ],
};

export const policies: Record<string, { title: string; body: string[] }> = {
  shipping: {
    title: "Shipping policy",
    body: [
      `Orders are packed within 1–2 working days. Free delivery on orders above ${formatPrice(FREE_SHIPPING_ABOVE)}; a small fee applies below that.`,
      "Delivery usually takes 3–7 working days depending on your pincode. You will receive tracking details by email and WhatsApp once your order ships.",
      "Cash on Delivery is available on eligible orders.",
    ],
  },
  returns: {
    title: "Exchange & return policy",
    body: [
      `Exchanges are accepted within ${site.exchangeDays} days of delivery for unworn, unwashed items with tags intact.`,
      "Message us on WhatsApp with your order number and photos, and we will arrange the exchange.",
      "Custom-stitched or sale items marked 'final sale' cannot be returned.",
    ],
  },
  privacy: {
    title: "Privacy policy",
    body: [
      "We collect only what we need to deliver your order: name, contact details and address.",
      "We never sell your data. Payments are processed securely by Razorpay; we do not store card details.",
    ],
  },
  terms: {
    title: "Terms of service",
    body: [
      "By placing an order you agree to provide accurate details and to pay the listed price including taxes.",
      "Colours may look slightly different on different screens. Prices and availability can change without notice.",
    ],
  },
};

export const testimonials = [
  { id: "t1", name: "Priya Sharma", city: "Delhi", rating: 5, product: "a Punjabi suit set", text: "The fabric is so soft and the stitching is neat. It fit perfectly and got so many compliments at the wedding." },
  { id: "t2", name: "Neha Gupta", city: "Jaipur", rating: 5, product: "a co-ord set", text: "Exactly like the photos. Delivery was quick and the packaging felt really premium. Will order again!" },
  { id: "t3", name: "Anjali Verma", city: "Lucknow", rating: 5, product: "an anarkali suit", text: "Loved the colour and the flare. The size chart was accurate, so no exchange was needed." },
  { id: "t4", name: "Ritu Singh", city: "Pune", rating: 4, product: "a saree", text: "Beautiful drape and lovely border work. Support on WhatsApp was friendly and fast." },
];

export const waLink = (message: string) => `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export const productMessage = (p: Product, opts: { size?: string; color?: string } = {}) =>
  `Hi ${site.name}, I'd like to order "${p.name}" (${formatPrice(p.price)})` +
  (opts.size ? `, size ${opts.size}` : "") + (opts.color ? `, colour ${opts.color}` : "") +
  `. Is it available?` + (siteUrl ? `\n${siteUrl}/product/${p.slug}` : "");
