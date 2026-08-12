import crypto from "crypto";
import { Request, Response } from "express";

const SECRET = process.env.LOCAL_SESSION_SECRET || "default_local_session_secret_change_me_in_prod";
const COOKIE_NAME = "local_session";

export function signSession(userId: number): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const base64Payload = Buffer.from(payload).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(base64Payload).digest("base64url");
  return `${base64Payload}.${signature}`;
}

export function verifySession(token: string): number | null {
  try {
    const [base64Payload, signature] = token.split(".");
    if (!base64Payload || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", SECRET).update(base64Payload).digest("base64url");
    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(Buffer.from(base64Payload, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) return null;

    return payload.userId;
  } catch {
    return null;
  }
}

export function setLocalSessionCookie(res: Response, userId: number) {
  const token = signSession(userId);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });
}

export function clearLocalSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export function getUserIdFromReq(req: Request): number | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map(c => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${COOKIE_NAME}=`)) {
      const token = cookie.substring(COOKIE_NAME.length + 1);
      return verifySession(token);
    }
  }
  return null;
}
