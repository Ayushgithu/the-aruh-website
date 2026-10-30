import { ZodError } from "zod";
import { getSession, type Session } from "./auth";
import { getUserSession } from "./user-auth";
import type { CustomerUser } from "./types";

export class HttpError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const ok = <T,>(data: T, status = 200) => Response.json(data, { status });
export const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

function handleError(e: unknown) {
  if (e instanceof HttpError) return fail(e.message, e.status);
  if (e instanceof ZodError) return fail(e.issues[0]?.message ?? "Invalid data", 400);
  console.error("[api]", e);
  return fail("Something went wrong on our side. Please try again.", 500);
}

type Ctx = { params: Promise<Record<string, string>> };

export function publicRoute(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try { return await fn(req, ctx); } catch (e) { return handleError(e); }
  };
}

export function adminRoute(fn: (req: Request, ctx: Ctx, session: Session) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const session = await getSession();
      if (!session) return fail("Your session has expired. Please sign in again.", 401);
      return await fn(req, ctx, session);
    } catch (e) { return handleError(e); }
  };
}

export function userRoute(fn: (req: Request, ctx: Ctx, user: CustomerUser) => Promise<Response>) {
  return async (req: Request, ctx: Ctx) => {
    try {
      const user = await getUserSession();
      if (!user) return fail("Please sign in to continue.", 401);
      return await fn(req, ctx, user);
    } catch (e) { return handleError(e); }
  };
}

export async function readJson(req: Request) {
  try { return await req.json(); } catch { throw new HttpError("Invalid request body.", 400); }
}
