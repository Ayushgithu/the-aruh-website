import type { Testimonial } from "./types";
import { testimonials as t } from "./site";

export const testimonials: Testimonial[] = t.map((x) => ({ id: x.id, name: x.name, role: x.city, rating: x.rating, text: x.text, product: x.product }));
