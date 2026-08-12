import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { pdvRouter } from "./pdv.router";
import { getLocalUserById, getLocalUserByUsername, createLocalUser, updateLocalUserPassword } from "./db";
import { getUserIdFromReq, setLocalSessionCookie, clearLocalSessionCookie } from "./_core/localAuth";
import * as bcrypt from "bcrypt";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  pdv: pdvRouter,
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      // Tentar autenticação via sessão local primeiro
      const localUserId = getUserIdFromReq(ctx.req);
      if (localUserId) {
        const localUser = await getLocalUserById(localUserId);
        if (localUser) {
          return {
            id: localUser.id,
            openId: `local_${localUser.id}`,
            name: localUser.username,
            email: `${localUser.username}@local.system`,
            loginMethod: "local",
            role: "admin" as const,
            createdAt: localUser.createdAt,
            updatedAt: localUser.updatedAt,
            lastSignedIn: new Date(),
          };
        }
      }
      return ctx.user;
    }),
    
    register: publicProcedure
      .input(z.object({
        username: z.string().min(3, "Nome de usuário deve ter pelo menos 3 caracteres"),
        password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
      }))
      .mutation(async ({ input }) => {
        const existing = await getLocalUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Nome de usuário já está em uso" });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        await createLocalUser({ username: input.username, passwordHash });
        return { success: true };
      }),

    login: publicProcedure
      .input(z.object({
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await getLocalUserByUsername(input.username);
        if (!user) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos" });
        }
        setLocalSessionCookie(ctx.res, user.id);
        return { success: true };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearLocalSessionCookie(ctx.res);
      return {
        success: true,
      } as const;
    }),

    resetPassword: publicProcedure
      .input(z.object({
        username: z.string(),
        newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
      }))
      .mutation(async ({ input }) => {
        const user = await getLocalUserByUsername(input.username);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await updateLocalUserPassword(user.id, passwordHash);
        return { success: true };
      }),

    updatePassword: publicProcedure
      .input(z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
      }))
      .mutation(async ({ input, ctx }) => {
        const localUserId = getUserIdFromReq(ctx.req);
        if (!localUserId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado localmente" });
        }
        const user = await getLocalUserById(localUserId);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado" });
        }
        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Senha atual incorreta" });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await updateLocalUserPassword(user.id, passwordHash);
        return { success: true };
      }),
  }),


});

export type AppRouter = typeof appRouter;
