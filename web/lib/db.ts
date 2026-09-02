import "server-only";
import mysql from "mysql2/promise";

/**
 * TiDB access for the web tier.
 *
 * Mirrors `db/client.py` (same host/credentials, same TLS requirement). The
 * pool is cached on globalThis so warm serverless invocations reuse
 * connections instead of opening one per request, which TiDB's connection
 * limit does not tolerate.
 */
declare global {
  // eslint-disable-next-line no-var
  var __radarPool: mysql.Pool | undefined;
}

function makePool(): mysql.Pool {
  const {
    TIDB_HOST,
    TIDB_PORT,
    TIDB_USER,
    TIDB_PASSWORD,
    TIDB_DATABASE,
  } = process.env;

  const missing = Object.entries({
    TIDB_HOST,
    TIDB_PORT,
    TIDB_USER,
    TIDB_PASSWORD,
    TIDB_DATABASE,
  })
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new Error(
      `Missing TiDB env vars: ${missing.join(", ")}. ` +
        `Set them in web/.env.local for dev and in the Vercel project settings for deploys.`,
    );
  }

  return mysql.createPool({
    host: TIDB_HOST,
    port: Number(TIDB_PORT),
    user: TIDB_USER,
    // The Python side strips surrounding quotes; .env.local carries them.
    password: TIDB_PASSWORD!.replace(/^"|"$/g, ""),
    database: TIDB_DATABASE,
    ssl: { minVersion: "TLSv1.2" },
    connectionLimit: 4,
    connectTimeout: 10_000,
    // BIGINT ids exceed Number.MAX_SAFE_INTEGER (data contract rule 2).
    supportBigNumbers: true,
    bigNumberStrings: true,
    timezone: "Z",
    dateStrings: true,
  });
}

export function pool(): mysql.Pool {
  if (!global.__radarPool) global.__radarPool = makePool();
  return global.__radarPool;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool().query(sql, params);
  return rows as T[];
}
