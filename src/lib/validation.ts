import { z } from "zod";

const validPhone = (v: string) => {
  const d = v.replace(/\D/g, "");
  return (d.length === 10 && /^[6-9]/.test(d)) || (d.length === 12 && d.startsWith("91") && /^[6-9]/.test(d[2]));
};

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your phone number")
  .refine(validPhone, "Enter a valid 10-digit mobile number");

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  phone: phoneSchema,
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(1000, "Please keep it under 1000 characters"),
});
export type ContactValues = z.infer<typeof contactSchema>;

export const sellSchema = z.object({
  brand: z.string().min(1, "Choose a brand"),
  model: z.string().trim().min(2, "Enter the model, e.g. Latitude 5420"),
  condition: z.string().min(1, "Select the condition"),
  description: z.string().trim().min(15, "Describe the condition in a sentence or two (min. 15 characters)").max(1500),
  expectedPrice: z.string().trim().regex(/^\d{3,7}$/, "Enter an amount in rupees, numbers only"),
  name: z.string().trim().min(2, "Enter your name"),
  phone: phoneSchema,
  city: z.string().trim().min(2, "Enter your city"),
});
export type SellValues = z.infer<typeof sellSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string().min(1, "Confirm the new password"),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const newAdminSchema = z.object({
  name: z.string().trim().min(2, "Enter a name"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

/* ---------------- Server-side schemas for the dashboard API ---------------- */
const num = (min: number, max: number) => z.coerce.number().min(min).max(max);
const optNum = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? undefined : v), z.coerce.number().min(min).max(max).optional());
const lines = z.array(z.string().trim().min(1).max(300)).max(30);

const sizeRow = z.object({ label: z.string().trim().min(1).max(12), qty: z.coerce.number().int().min(0).max(9999) });
const imageUrl = z.string().regex(/^\/api\/images\/[a-f0-9]{24}$/, "Invalid image");
const colorRow = z.object({ name: z.string().trim().min(1).max(30), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), images: z.array(imageUrl).max(8).default([]) });

export const productInput = z.object({
  type: z.enum(["clothing", "accessory", "laptop"]),
  name: z.string().trim().min(3, "Enter the product name").max(140),
  brand: z.string().trim().max(60).default(""),
  category: z.string().trim().min(2, "Enter a category").max(60),
  price: num(1, 10_000_000),
  mrp: optNum(0, 10_000_000),
  condition: z.enum(["A", "B", "C", "New"]).default("New"),
  units: num(0, 999).optional(),
  sizes: z.array(sizeRow).max(12).default([]),
  colors: z.array(colorRow).max(12).default([]),
  fabric: z.string().trim().max(120).default(""),
  washCare: z.string().trim().max(400).default(""),
  fit: z.string().trim().max(60).default(""),
  occasion: z.string().trim().max(60).default(""),
  badges: z.array(z.string().trim().max(24)).max(5).default([]),
  flashPrice: z.coerce.number().int().min(1).max(10_000_000).optional(),
  flashEndsAt: z.string().max(40).optional(),
  videoUrl: z.string().trim().max(300).refine((v) => v === "" || /^https?:\/\//i.test(v), "Video link must start with https://").default(""),
  returnable: z.boolean().default(true),
  exchangeable: z.boolean().default(true),
  featured: z.boolean().default(false),
  tags: z.array(z.string().trim().toLowerCase().max(30)).max(8).default([]),
  specs: z.record(z.string().max(60), z.string().max(200)).default({}),
  highlights: lines.max(3).default([]),
  ramGb: optNum(1, 512),
  cpu: z.string().trim().max(60).optional(),
  screenIn: optNum(5, 30),
  included: lines.default([]),
  conditionNotes: lines.default([]),
  description: z.string().trim().min(10, "Add a short description").max(2000),
  warranty: z.string().trim().max(120).default(""),
  images: z.array(z.string().regex(/^\/api\/images\/[a-f0-9]{24}$/, "Invalid image")).max(8).default([]),
}).refine((v) => v.units !== undefined || v.sizes.length > 0, { path: ["units"], message: "Enter units in stock, or add sizes with stock" })
  .refine((v) => !v.flashPrice || v.flashPrice < v.price, { path: ["flashPrice"], message: "The flash price must be lower than the normal price" })
  .refine((v) => !v.flashPrice || (!!v.flashEndsAt && !isNaN(Date.parse(v.flashEndsAt))), { path: ["flashEndsAt"], message: "Choose when the flash sale ends" });
export type ProductInput = z.infer<typeof productInput>;

export const bannerInput = z.object({
  title: z.string().trim().min(5, "Enter a headline").max(120),
  subtitle: z.string().trim().min(5, "Add a short supporting line").max(240),
  cta: z.string().trim().min(2, "Enter the button label").max(40),
  href: z.string().trim().refine((v) => v.startsWith("/") || /^https?:\/\//.test(v), "Use a page path like /laptops or a full link"),
  theme: z.enum(["blue", "slate", "sky"]),
  active: z.boolean(),
  image: z.string().regex(/^\/api\/images\/[a-f0-9]{24}$/).optional().nullable(),
});

export const productEnquiryInput = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: phoneSchema,
  message: z.string().trim().max(500).optional(),
  productIds: z.array(z.string().regex(/^[a-f0-9]{24}$/)).min(1).max(20),
});

export const announcementInput = z.object({
  text: z.string().trim().min(3, "Write the message to show (at least 3 characters)").max(160, "Keep it under 160 characters"),
  href: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine((v) => v === undefined || v.startsWith("/") || /^https?:\/\//.test(v), "Use a page path like /laptops or a full https:// link"),
  active: z.boolean(),
});

export const forgotSchema = z.object({ email: z.string().trim().email("Enter a valid email address.") });

export const resetSchema = z.object({
  email: z.string().trim().email(),
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(8, "Use at least 8 characters"),
});

/* ------------------------------ Customer accounts & shop ------------------------------ */
/** 10-digit Indian mobile number (strips +91, spaces, dashes). */
export const normalizePhone = (v: string) => v.replace(/\D/g, "").slice(-10);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  email: z.string().trim().email("Enter a valid email address").toLowerCase(),
  phone: phoneSchema,
  password: z.string().min(8, "Use at least 8 characters").max(100),
});

export const customerLoginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").toLowerCase(),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const googleSchema = z.object({ credential: z.string().min(20).max(4096) });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: phoneSchema,
});

export const addressSchema = z.object({
  name: z.string().trim().min(2, "Enter the receiver's name").max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(5, "Enter the house/flat and street").max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2, "Enter the city").max(60),
  state: z.string().trim().min(2, "Select the state").max(60),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
});

export const checkoutSchema = z.object({
  address: addressSchema,
  method: z.enum(["razorpay", "cod"]),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120).optional(), // guests give their email here
  saveAddress: z.object({ label: z.string().trim().min(1).max(20) }).optional(),
  useWallet: z.boolean().optional(),
});

export const savedAddressSchema = addressSchema.extend({ label: z.string().trim().min(1, "Give this address a name").max(20), isDefault: z.boolean().optional() });

export const returnCreateSchema = z.object({
  type: z.enum(["return", "exchange"]),
  items: z.array(z.object({ index: z.coerce.number().int().min(0).max(50), quantity: z.coerce.number().int().min(1).max(20) })).min(1, "Choose at least one item").max(20),
  reason: z.string().trim().min(2, "Choose a reason").max(120),
  comment: z.string().trim().max(500).optional(),
  photos: z.array(imageUrl).max(4).default([]),
  refundTo: z.enum(["original", "wallet"]).default("original"),
  refundDetails: z.string().trim().max(200).optional(),
  exchangeTo: z.object({ size: z.string().trim().max(12).optional(), color: z.string().trim().max(30).optional() }).optional(),
});

export const trackLookupSchema = z.object({ orderNumber: z.string().trim().min(5).max(40), phone: z.string().trim().min(10).max(15) });

export const ruleListSchema = z.array(z.string().trim().regex(/^\d{1,6}\*?$/, "Pincodes are numbers (6 digits, or the first few digits)")).max(2000);
export const storeRulesSchema = z.object({
  shipping: z.object({ freeAbove: z.coerce.number().int().min(0).max(1_000_000), fee: z.coerce.number().int().min(0).max(5000) }),
  cod: z.object({ enabled: z.boolean(), max: z.coerce.number().int().min(0).max(1_000_000), advance: z.coerce.number().int().min(0).max(5000), blockedPincodes: ruleListSchema }),
  blockedPincodes: ruleListSchema,
  guestCheckout: z.boolean(),
  returns: z.object({
    enabled: z.boolean(), allowReturn: z.boolean(), allowExchange: z.boolean(),
    returnDays: z.coerce.number().int().min(0).max(90), exchangeDays: z.coerce.number().int().min(0).max(90),
    reasons: z.array(z.string().trim().min(2).max(80)).min(1, "Add at least one return reason").max(15),
    note: z.string().trim().max(300),
  }),
  sizeAdvisor: z.object({
    enabled: z.boolean(),
    rows: z.array(z.object({ size: z.string().trim().min(1).max(12), minHeight: z.coerce.number().min(80).max(230), maxHeight: z.coerce.number().min(80).max(230), minWeight: z.coerce.number().min(15).max(250), maxWeight: z.coerce.number().min(15).max(250) })).max(14),
  }),
  saleTimer: z.object({
    active: z.boolean(), title: z.string().trim().max(80), subtitle: z.string().trim().max(140), cta: z.string().trim().max(30),
    href: z.string().trim().max(300).refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//i.test(v), "Use a page path like /shop or a full https:// link"),
    endsAt: z.string().max(40),
  }),
  shipment: z.object({ weightKg: z.coerce.number().min(0.05).max(30), lengthCm: z.coerce.number().min(1).max(200), breadthCm: z.coerce.number().min(1).max(200), heightCm: z.coerce.number().min(0.5).max(200) }),
  wallet: z.object({ enabled: z.boolean(), bonusPercent: z.coerce.number().min(0).max(30) }),
  delivery: z.object({
    handlingDays: z.coerce.number().int().min(0).max(10), cutoffHour: z.coerce.number().int().min(0).max(23),
    transitMin: z.coerce.number().int().min(0).max(30), transitMax: z.coerce.number().int().min(0).max(30), sundayOff: z.boolean(),
    overrides: z.array(z.object({ prefix: z.string().trim().regex(/^\d{1,6}$/, "Use the first digits of a pincode"), min: z.coerce.number().int().min(0).max(30), max: z.coerce.number().int().min(0).max(30) })).max(60),
  }),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().regex(/^[a-f0-9]{24}$/),
  razorpay_order_id: z.string().min(5),
  razorpay_payment_id: z.string().min(5),
  razorpay_signature: z.string().min(10),
});

export const cartAddSchema = z.object({
  productId: z.string().regex(/^[a-f0-9]{24}$/, "Invalid product"),
  quantity: z.coerce.number().int().min(1).max(20).default(1),
  size: z.string().trim().max(12).optional(),
  color: z.string().trim().max(30).optional(),
});

export const adminOrderUpdateSchema = z.object({
  status: z.enum(["placed", "confirmed", "shipped", "delivered", "cancelled"]),
  carrier: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(60).optional(),
  note: z.string().trim().max(240).optional(),
});

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];
