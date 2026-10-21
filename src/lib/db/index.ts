import { migrations } from "./migrations";
import { seedDemoData } from "./seed";

/*
 * One small interface over two drivers:
 *  - DATABASE_URL set  → PostgreSQL server via `pg` (production / staging)
 *  - DATABASE_URL unset → PGlite, an embedded PostgreSQL stored in .data/pglite (local dev)
 * Both speak the same SQL, so queries and migrations are identical.
 */

export type Row = Record<string, unknown>;

/** Inside a transaction. `exec` runs a multi-statement script (no parameters). */
export type Tx = Pick<Db, "query" | "exec">;

export interface Db {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Runs several statements atomically. */
  transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
  exec(sql: string): Promise<void>;
}

declare global {
  // Cached on globalThis so Next.js hot reload doesn't open a new database each time.
  var __billionsDb: Promise<Db> | undefined;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__billionsDb) {
    globalThis.__billionsDb = connect().catch((err) => {
      globalThis.__billionsDb = undefined; // allow a retry on the next request
      throw err;
    });
  }
  return globalThis.__billionsDb;
}

async function connect(): Promise<Db> {
  const db = process.env.DATABASE_URL ? await connectPostgres(process.env.DATABASE_URL) : await connectPglite();
  await migrate(db);
  if (process.env.SEED_DEMO === "true" || (process.env.NODE_ENV !== "production" && process.env.SEED_DEMO !== "false")) {
    await seedDemoData(db);
  }
  return db;
}

async function connectPostgres(url: string): Promise<Db> {
  // `pg` is CommonJS; depending on the bundler its API is on the module or on `.default`.
  const mod = (await import("pg")) as typeof import("pg") & { default?: typeof import("pg") };
  const { Pool, types } = mod.default ?? mod;
  // Return bigint (price_amd) and numeric (battery, 0–100) as JS numbers instead of strings.
  types.setTypeParser(20, (v: string) => Number(v));
  types.setTypeParser(1700, (v: string) => Number(v));

  const pool = new Pool({ connectionString: url, max: 10 });
  return {
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      return (await pool.query(sql, params)).rows as T[];
    },
    async exec(sql) {
      await pool.query(sql);
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({
          query: async <T extends Row>(sql: string, params: unknown[] = []) => (await client.query(sql, params)).rows as T[],
          exec: async (sql: string) => {
            await client.query(sql);
          },
        });
        await client.query("COMMIT");
        return result;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

async function connectPglite(): Promise<Db> {
  const { PGlite, types } = await import("@electric-sql/pglite");
  const { mkdirSync } = await import("node:fs");
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  mkdirSync(dir, { recursive: true }); // PGlite creates only the last folder, not its parents
  const pg = new PGlite(dir, {
    parsers: {
      [types.INT8]: (v: string) => Number(v),
      [types.NUMERIC]: (v: string) => Number(v),
    },
  });
  await pg.waitReady;
  return {
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      return (await pg.query<T>(sql, params)).rows;
    },
    async exec(sql) {
      await pg.exec(sql);
    },
    async transaction(fn) {
      return pg.transaction((tx) =>
        fn({
          query: async <T extends Row>(sql: string, params: unknown[] = []) => (await tx.query<T>(sql, params)).rows,
          exec: async (sql: string) => {
            await tx.exec(sql);
          },
        }),
      );
    },
  };
}

async function migrate(db: Db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const done = new Set((await db.query<{ id: string }>("SELECT id FROM schema_migrations")).map((r) => r.id));
  for (const m of migrations) {
    if (done.has(m.id)) continue;
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.query("INSERT INTO schema_migrations (id) VALUES ($1)", [m.id]);
    });
    console.info(`[db] applied migration ${m.id}`);
  }
}
