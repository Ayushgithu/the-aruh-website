import { z } from "zod";
import { connectDB } from "@/lib/db";
import { PushSubModel } from "@/models/PushSub";
import { fail, ok, publicRoute, readJson } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getUserSession } from "@/lib/user-auth";

const sub = z.object({ endpoint: z.string().url().max(600), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

/** Saves a browser's push subscription so the owner can send new-arrival and sale alerts from the dashboard. */
export const POST = publicRoute(async (req) => {
  if (!rateLimit(`push:${clientIp(req)}`, 20, 60 * 60_000)) return fail("Too many requests.", 429);
  const v = sub.parse(await readJson(req));
  await connectDB();
  const user = await getUserSession().catch(() => null);
  await PushSubModel.updateOne({ endpoint: v.endpoint }, { $set: { keys: v.keys, user: user && !user.guest ? user.id : undefined, ua: (req.headers.get("user-agent") ?? "").slice(0, 200) } }, { upsert: true });
  return ok({ ok: true }, 201);
});

export const DELETE = publicRoute(async (req) => {
  const { endpoint } = z.object({ endpoint: z.string().url().max(600) }).parse(await readJson(req));
  await connectDB();
  await PushSubModel.deleteOne({ endpoint });
  return ok({ ok: true });
});
