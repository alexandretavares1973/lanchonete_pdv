import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getLocalUserById } from "../db";
import { getUserIdFromReq } from "./localAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // A sessão local também deve alimentar ctx.user para protectedProcedure.
  // Assim, operações feitas sem OAuth continuam protegidas e auditáveis.
  const localUserId = getUserIdFromReq(opts.req);
  if (localUserId) {
    const localUser = await getLocalUserById(localUserId);
    if (localUser) {
      user = {
        id: localUser.id,
        openId: `local_${localUser.id}`,
        name: localUser.username,
        email: `${localUser.username}@local.system`,
        loginMethod: "local",
        role: "admin",
        createdAt: localUser.createdAt,
        updatedAt: localUser.updatedAt,
        lastSignedIn: new Date(),
      };
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
