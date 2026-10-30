export const ID = "64b7f0c2a1b2c3d4e5f60001";
export const ID2 = "64b7f0c2a1b2c3d4e5f60002";
export const URL_A = "/api/images/64b7f0c2a1b2c3d4e5f60aaa";
export const URL_B = "/api/images/64b7f0c2a1b2c3d4e5f60bbb";

let ipCounter = 0;
/** Unique IP per call so in-memory rate limits never leak between tests. */
export const freshIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

export function jsonReq(path: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": freshIp(), ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

export const ctx = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });

export const validProduct = {
  type: "laptop", name: "Dell Latitude 5420", brand: "Dell", category: "Business", price: 32999, mrp: 74000,
  condition: "A", units: 2, featured: true, tags: ["business"],
  specs: { Processor: "i5", RAM: "16 GB" }, ramGb: 16, cpu: "Intel Core i5", screenIn: 14,
  description: "A dependable daily driver.", warranty: "1-year warranty", images: [URL_A],
};
