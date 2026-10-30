export interface Slide { id: string; title: string; href: string; image: string; mobileImage?: string; active: boolean; order: number }
export interface BrandItem { id: string; name: string; logo?: string; href: string; active: boolean; order: number }

/** Where a brand tile leads when no custom link is set. */
export const brandHref = (b: Pick<BrandItem, "name" | "href">) => b.href || `/shop?collection=${encodeURIComponent(b.name)}`;
