import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { Role } from "@prisma/client";

export { hashPassword, verifyPassword } from "./password";

const COOKIE = "tms_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  return process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
}

// ---------------------------------------------------------------------------
// Signed, stateless session cookie.
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  driverId: string | null;
  customerId: string | null;
}

function b64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

function encode(user: SessionUser): string {
  const payload = b64url(
    JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + MAX_AGE }),
  );
  return `${payload}.${sign(payload)}`;
}

function decode(token: string | undefined): SessionUser | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  // Constant-time signature check.
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.exp === "number" && data.exp < Date.now() / 1000) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      driverId: data.driverId ?? null,
      customerId: data.customerId ?? null,
    };
  } catch {
    return null;
  }
}

export async function setSession(user: SessionUser): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encode(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return decode(store.get(COOKIE)?.value);
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export const MANAGER_ROLES: Role[] = [Role.ADMIN, Role.OPERATOR];

export function isManager(role: Role | undefined): boolean {
  return role === Role.ADMIN || role === Role.OPERATOR;
}

/** The home path a user lands on after login, based on role. */
export function homePathFor(role: Role): string {
  if (role === Role.DRIVER) return "/driver";
  if (role === Role.CUSTOMER) return "/portal";
  return "/";
}
