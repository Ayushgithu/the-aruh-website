// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSession: vi.fn(), createSession: vi.fn(), destroySession: vi.fn() }));
vi.mock("@/lib/images", () => ({ saveImage: vi.fn(async (f: File) => `/api/images/64b7f0c2a1b2c3d4e5f6${f.name.slice(0, 4).padEnd(4, "0")}`), deleteImages: vi.fn() }));
vi.mock("@/models/Enquiry", () => ({ EnquiryModel: { create: vi.fn() } }));
vi.mock("@/models/Product", () => ({ ProductModel: { find: vi.fn(), updateOne: vi.fn() } }));
vi.mock("@/models/Image", () => ({ ImageModel: { findById: vi.fn() } }));

import { EnquiryModel } from "@/models/Enquiry";
import { ProductModel } from "@/models/Product";
import { ImageModel } from "@/models/Image";
import { POST as contact } from "@/app/api/contact/route";
import { POST as view } from "@/app/api/products/[id]/view/route";
import { GET as image } from "@/app/api/images/[id]/route";
import { ID, ctx, freshIp, jsonReq } from "./utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const Enquiry = EnquiryModel as any, Product = ProductModel as any, Img = ImageModel as any;
beforeEach(() => { Enquiry.create.mockResolvedValue({}); });

describe("POST /api/contact", () => {
  const good = { name: "Ravi Kumar", phone: "9876543210", message: "Do you have a gaming laptop under 40k?" };

  it("saves the enquiry as a 'Contact form' enquiry", async () => {
    const res = await contact(jsonReq("/api/contact", "POST", good), ctx());
    expect(res.status).toBe(201);
    expect(Enquiry.create).toHaveBeenCalledWith({ name: "Ravi Kumar", phone: "9876543210", message: good.message, source: "Contact form" });
  });

  it.each([
    ["short name", { ...good, name: "R" }],
    ["bad phone", { ...good, phone: "12345" }],
    ["short message", { ...good, message: "hi" }],
  ])("400 for %s, nothing saved", async (_l, body) => {
    const res = await contact(jsonReq("/api/contact", "POST", body), ctx());
    expect(res.status).toBe(400);
    expect(Enquiry.create).not.toHaveBeenCalled();
  });

  it("rate-limits spam: 429 on the 6th message from one IP", async () => {
    const ip = freshIp();
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await contact(jsonReq("/api/contact", "POST", good, { "x-forwarded-for": ip }), ctx())).status);
    expect(codes).toEqual([201, 201, 201, 201, 201, 429]);
  });
});

describe("POST /api/products/:id/view", () => {
  it("increments the view counter", async () => {
    const res = await view(jsonReq(`/api/products/${ID}/view`, "POST", {}), ctx({ id: ID }));
    expect(res.status).toBe(200);
    expect(Product.updateOne).toHaveBeenCalledWith({ _id: ID }, { $inc: { views: 1 } });
  });

  it("ignores malformed ids quietly", async () => {
    const res = await view(jsonReq("/api/products/zzz/view", "POST", {}), ctx({ id: "zzz" }));
    expect(res.status).toBe(200);
    expect(Product.updateOne).not.toHaveBeenCalled();
  });

  it("stops counting a flood of views from one visitor", async () => {
    const headers = { "x-forwarded-for": freshIp() };
    for (let i = 0; i < 6; i++) await view(jsonReq(`/api/products/${ID}/view`, "POST", {}, headers), ctx({ id: ID }));
    expect(Product.updateOne).toHaveBeenCalledTimes(3);
  });
});

describe("GET /api/images/:id", () => {
  const get = (id: string) => image(new Request(`http://localhost/api/images/${id}`), { params: Promise.resolve({ id }) });

  it("serves the stored bytes with long-lived cache headers", async () => {
    Img.findById.mockResolvedValue({ data: Buffer.from([82, 73, 70, 70]), contentType: "image/webp" });
    const res = await get(ID);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([82, 73, 70, 70]));
  });

  it("404 for an unknown or malformed id", async () => {
    Img.findById.mockResolvedValue(null);
    expect((await get(ID)).status).toBe(404);
    expect((await get("../../etc/passwd")).status).toBe(404);
  });
});
