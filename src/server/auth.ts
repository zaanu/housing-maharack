import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "mh_admin";

function adminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

function sessionToken(): string {
  const pw = adminPassword();
  if (!pw) return "";
  return crypto.createHmac("sha256", pw).update("maharack-admin-session-v1").digest("hex");
}

export function verifyPassword(password: string): boolean {
  const pw = adminPassword();
  if (!pw) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(pw);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function setAdminCookie(): Promise<void> {
  (await cookies()).set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearAdminCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const pw = adminPassword();
  if (!pw) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const expected = sessionToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
