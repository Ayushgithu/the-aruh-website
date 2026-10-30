import { ok, userRoute } from "@/lib/api-helpers";
import { getWallet } from "@/lib/wallet";

export const GET = userRoute(async (_req, _ctx, user) => ok(await getWallet(user.id)));
