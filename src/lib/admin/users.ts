import { getDb } from "../db";
import { hashPassword, type Role } from "../auth";
import type { AdminDict } from "./i18n";

export interface UserRow {
  id: number;
  email: string;
  name: string | null;
  role: Role;
  last_login_at: Date | string | null;
}

export async function listUsers(): Promise<UserRow[]> {
  const db = await getDb();
  return db.query<UserRow>("SELECT id, email, name, role, last_login_at FROM admin_users ORDER BY role, name, email");
}

export async function createUser(email: string, name: string, role: Role, password: string, t: AdminDict["users"]): Promise<string | null> {
  const db = await getDb();
  const exists = await db.query("SELECT 1 FROM admin_users WHERE email = $1", [email]);
  if (exists.length) return t.exists;
  await db.query("INSERT INTO admin_users (email, name, role, password_hash) VALUES ($1, $2, $3, $4)", [
    email, name || null, role, await hashPassword(password),
  ]);
  return null;
}

export async function updateUser(id: number, name: string, role: Role, t: AdminDict["users"]): Promise<string | null> {
  if (role === "SALES" && (await otherFullUsers(id)) === 0) return t.keepFull;
  const db = await getDb();
  await db.query("UPDATE admin_users SET name = $1, role = $2 WHERE id = $3", [name || null, role, id]);
  return null;
}

export async function setPassword(id: number, password: string) {
  const db = await getDb();
  await db.query("UPDATE admin_users SET password_hash = $1 WHERE id = $2", [await hashPassword(password), id]);
  await db.query("DELETE FROM admin_sessions WHERE user_id = $1", [id]); // log out everywhere
}

export async function deleteUser(id: number, t: AdminDict["users"]): Promise<string | null> {
  if ((await otherFullUsers(id)) === 0) return t.lastFull;
  const db = await getDb();
  await db.query("DELETE FROM admin_users WHERE id = $1", [id]);
  return null;
}

/** Full users other than `id` — used to make sure someone can always manage the site. */
async function otherFullUsers(id: number): Promise<number> {
  const db = await getDb();
  const [{ n }] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM admin_users WHERE role = 'FULL' AND id <> $1", [id]);
  return n;
}

export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const PASSWORD_MIN = 8;
