export type Condition = "A" | "B" | "C" | "New";
export type Stock = "in-stock" | "low" | "out";
export type ProductType = "clothing" | "accessory" | "laptop";
export interface SizeStock { label: string; qty: number }
export interface ColorOpt { name: string; hex?: string; images?: string[] }
export type Tone = "silver" | "graphite" | "black" | "blue";
export type ArtKind =
  | "laptop" | "macbook" | "gaming"
  | "charger" | "mouse" | "bag" | "keyboard" | "headphones"
  | "ssd" | "dock" | "stand" | "ram" | "hub" | "cooler" | "cloth";

export interface Product {
  id: string;
  slug: string;
  type: ProductType;
  name: string;
  brand: string;
  price: number;
  mrp?: number;
  condition: Condition;
  stock: Stock;
  stockCount?: number;
  quantity?: number; // units on hand (source of truth for stock status)
  category: string; // laptops: Business | Gaming | Student | Premium; accessories: Chargers, Bags...
  tags: string[]; // e.g. "business", "gaming", "student"
  specs: Record<string, string>; // ordered key/values for the detail table
  highlights: string[]; // 3 short specs shown on cards
  ramGb?: number;
  cpu?: string;
  screenIn?: number;
  included: string[];
  conditionNotes: string[];
  description: string;
  warranty: string;
  featured?: boolean;
  views: number;
  createdAt: string;
  art: { kind: ArtKind; tone: Tone; hue: number };
  images?: string[]; // real photo URLs once uploaded; placeholders render art when empty
  /* clothing */
  sizes?: SizeStock[]; // per-size stock; `quantity` is their sum
  colors?: ColorOpt[];
  fabric?: string;
  washCare?: string;
  fit?: string;
  occasion?: string;
  badges?: string[]; // "New", "Best Seller", "Trending", "Deal" …
  videoUrl?: string;
  flash?: { price: number; endsAt: string }; // a flash sale that is running right now (price is already the flash price)
  base?: { price: number; mrp?: number }; // the normal price while a flash sale is on (the dashboard edits this)
  flashRaw?: { price: number; endsAt: string }; // saved flash settings even when expired (dashboard form)
  returnable?: boolean; // owner can switch returns / exchanges off per product
  exchangeable?: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  theme: "blue" | "slate" | "sky";
  image?: string;
  active: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
  product: string;
}

export type EnquiryStatus = "new" | "contacted" | "closed";
export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  source: "Contact form" | "Product enquiry" | "Sell request" | "WhatsApp";
  message: string;
  products: string[];
  sell?: { brand: string; model: string; condition: string; expectedPrice: number; city: string; photos: string[] };
  status: EnquiryStatus;
  createdAt: string;
}

export interface Announcement {
  id: string;
  text: string;
  href?: string;
  active: boolean;
}

/* ------------------------------ Shop (cart / orders) ------------------------------ */
export type CardProduct = Pick<Product, "id" | "slug" | "name" | "brand" | "price" | "mrp" | "condition" | "stock" | "type" | "art" | "images" | "sizes" | "colors"> & {
  /** Units currently available to buy. */
  available: number;
};

export interface CartLine {
  productId: string;
  size?: string;
  color?: string;
  quantity: number;
  addedAt: string;
  product: CardProduct;
}

export interface Address {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export type OrderStatus = "pending_payment" | "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type PaymentMethod = "razorpay" | "cod" | "wallet";
export interface WalletTxn { id: string; amount: number; balanceAfter: number; type: "refund" | "bonus" | "order" | "order_cancelled" | "adjustment"; note?: string; createdAt: string }
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderItem {
  productId: string;
  size?: string;
  color?: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  image?: string;
  art: Product["art"];
  returnable?: boolean;
  exchangeable?: boolean;
}

export interface Tracking { carrier: string; number: string; url?: string; labelUrl?: string; shiprocketOrderId?: string }
export interface TrackingEvent { status: string; at: string; location?: string; note?: string }
export interface SavedAddress extends Address { id: string; label: string; isDefault?: boolean }

export type ReturnType = "return" | "exchange";
export type ReturnStatus = "requested" | "approved" | "rejected" | "pickup_scheduled" | "received" | "refunded" | "exchange_shipped" | "cancelled";
export interface ReturnItem { index: number; productId: string; slug: string; name: string; size?: string; color?: string; price: number; quantity: number; image?: string; art: Product["art"] }
export interface ReturnRequest {
  id: string; number: string; orderId: string; orderNumber: string; userId: string;
  customer: { name: string; email: string; phone: string };
  type: ReturnType; items: ReturnItem[]; reason: string; comment?: string; photos: string[];
  exchangeTo?: { size?: string; color?: string };
  status: ReturnStatus;
  pickup?: { carrier?: string; awb?: string; url?: string };
  refundTo?: "original" | "wallet"; refundDetails?: string;
  refund?: { amount: number; bonus?: number; method: "razorpay" | "manual" | "wallet"; refundId?: string; note?: string; at?: string };
  exchangeShipment?: { carrier?: string; awb?: string; url?: string };
  restocked: boolean; adminNote?: string;
  timeline: { status: ReturnStatus; at: string; note?: string; by?: string }[];
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customer: { name: string; email: string; phone: string };
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  address: Address;
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    paidAt?: string;
    refundId?: string;
    advance?: { amount: number; status: "pending" | "paid" | "refunded"; paidAt?: string };
  };
  status: OrderStatus;
  tracking?: Tracking;
  trackingEvents?: TrackingEvent[];
  deliveredAt?: string;
  walletUsed?: number;
  expectedBy?: string;
  timeline: { status: OrderStatus; at: string; note?: string }[];
  createdAt: string;
  expiresAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  orders: number;
  spent: number;
  carts: number;
}

export interface AdminCart {
  userId: string;
  customer: { name: string; email: string; phone: string };
  items: { productId: string; size?: string; color?: string; slug: string; name: string; brand: string; price: number; quantity: number; addedAt: string; image?: string; art: Product["art"]; available: number }[];
  total: number;
  updatedAt: string;
}

export interface CustomerUser {
  guest?: boolean;
  id: string;
  name: string;
  email: string;
  phone: string;
}
