import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "./db";

/*
 * Admin authentication: scrypt password hashes, random session tokens in an
 * httpOnly cookie, sessions stored (hashed) in admin_sessions.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "bm_admin";
const SESSION_DAYS = 14;

export type Role = "FULL" | "SALES";
export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  role: Role;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function startSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const db = await getDb();
  await db.query("INSERT INTO admin_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)", [sha256(token), userId, expires]);
  await db.query("UPDATE admin_users SET last_login_at = now() WHERE id = $1", [userId]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.query("DELETE FROM admin_sessions WHERE id = $1", [sha256(token)]);
  }
  jar.delete(COOKIE);
}

/** The logged-in admin for this request, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db.query<{ id: number; email: string; name: string | null; role: Role }>(
    `SELECT u.id, u.email, u.name, u.role FROM admin_sessions s
     JOIN admin_users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  return row ?? null;
});

/** Use at the top of every admin page and action. Redirects if not allowed. */
export async function requireUser(role?: Role): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (role === "FULL" && user.role !== "FULL") redirect("/admin/sell");
  return user;
}

export async function countUsers(): Promise<number> {
  const db = await getDb();
  const [{ n }] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM admin_users");
  return n;
}

/* Simple brute-force guard: 5 failed logins per email per 15 minutes (per server process). */
const failures = new Map<string, number[]>();
export function loginBlocked(email: string): boolean {
  const now = Date.now();
  const recent = (failures.get(email) ?? []).filter((t) => now - t < 15 * 60_000);
  failures.set(email, recent);
  return recent.length >= 5;
}
export function recordLoginFailure(email: string) {
  failures.set(email, [...(failures.get(email) ?? []), Date.now()]);
}
