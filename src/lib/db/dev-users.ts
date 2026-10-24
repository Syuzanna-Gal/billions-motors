import type { Db } from "./index";

/*
 * Development only: keeps two test admin accounts (Full and Sales) so the admin panel can be
 * tested without anyone's real password. Enabled by DEV_TEST_PASSWORD in .env.local;
 * never runs in production.
 */
export const DEV_TEST_USERS = [
  { email: "test-full@billions.local", name: "Test Full", role: "FULL" },
  { email: "test-sales@billions.local", name: "Test Sales", role: "SALES" },
] as const;

export async function ensureDevTestUsers(db: Db) {
  const password = process.env.DEV_TEST_PASSWORD;
  if (process.env.NODE_ENV === "production" || !password) return;
  const { hashPassword } = await import("../auth");
  for (const u of DEV_TEST_USERS) {
    await db.query(
      `INSERT INTO admin_users (email, name, role, password_hash) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
      [u.email, u.name, u.role, await hashPassword(password)],
    );
  }
  console.info("[db] dev test admin users ready");
}
