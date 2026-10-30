import { destroyUserSession } from "@/lib/user-auth";
import { ok, publicRoute } from "@/lib/api-helpers";

export const POST = publicRoute(async () => {
  await destroyUserSession();
  return ok({ ok: true });
});
