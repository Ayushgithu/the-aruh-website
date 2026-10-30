/* Typo-tolerant product search. Pure functions (no database), so it is fast and easy to test.
   "dell latitde i5 16gb" still finds the Dell Latitude 5420 (i5, 16 GB). */

export interface Searchable {
  name: string;
  brand: string;
  category: string;
  tags: string[];
  specs: Record<string, string>;
  highlights: string[];
  cpu?: string;
}

export const normalize = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Words of a text, plus "16 gb" → "16gb" joins so spec-style queries match. */
function words(text: string): string[] {
  const w = normalize(text).split(" ").filter(Boolean);
  const out = [...w];
  for (let i = 0; i < w.length - 1; i++) if (/^\d+$/.test(w[i]) && /^[a-z]+$/.test(w[i + 1])) out.push(w[i] + w[i + 1]);
  return out;
}

/** Edit distance (insert / delete / replace / swap) that gives up once it is certain to exceed `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, (prev2[j - 2] ?? Infinity) + 1);
      cur[j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    prev2.length = 0;
    prev2.push(...prev);
    prev = cur;
  }
  return prev[b.length];
}

/** 0 = no match, 1 = exact. */
export function matchWord(token: string, word: string): number {
  if (word === token) return 1;
  if (token.length >= 2 && word.startsWith(token)) return 0.92;
  if (token.length >= 3 && word.includes(token)) return 0.72;
  if (token.length >= 4) {
    const max = token.length >= 8 ? 2 : 1;
    const d = editDistance(token, word, max);
    if (d <= max) return 0.64 - 0.1 * d;
    // typo while still typing: compare against the same-length start of the word
    if (word.length > token.length && editDistance(token, word.slice(0, token.length), 1) <= 1) return 0.5;
  }
  return 0;
}

const FIELD_WEIGHT = { name: 1, brand: 0.9, cpu: 0.8, category: 0.6, tags: 0.55, specs: 0.5, highlights: 0.5 };

function fields(p: Searchable): [number, string[]][] {
  return [
    [FIELD_WEIGHT.name, words(p.name)],
    [FIELD_WEIGHT.brand, words(p.brand)],
    [FIELD_WEIGHT.cpu, words(p.cpu ?? "")],
    [FIELD_WEIGHT.category, words(p.category)],
    [FIELD_WEIGHT.tags, p.tags.flatMap(words)],
    [FIELD_WEIGHT.specs, Object.values(p.specs).flatMap(words)],
    [FIELD_WEIGHT.highlights, p.highlights.flatMap(words)],
  ];
}

/** Relevance 0..~1.3, or 0 when any word of the query has no match at all. */
export function scoreProduct(p: Searchable, query: string): number {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (!tokens.length) return 0;
  const f = fields(p);
  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [weight, ws] of f) for (const w of ws) best = Math.max(best, matchWord(token, w) * weight);
    if (best === 0) return 0; // every word must match something
    total += best;
  }
  const phrase = normalize(query);
  const bonus = normalize(p.name).includes(phrase) ? 0.3 : 0;
  return total / tokens.length + bonus;
}

export function searchProducts<T extends Searchable>(items: T[], query: string, limit = Infinity): T[] {
  return items
    .map((item) => ({ item, score: scoreProduct(item, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
