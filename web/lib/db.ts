import { connect } from "@tidbcloud/serverless";

/**
 * TiDB access for the web tier.
 *
 * Uses the HTTP-based serverless driver rather than mysql2: there are no TCP
 * connections to pool, so short-lived serverless invocations cannot exhaust
 * the cluster's connection limit, and it runs on the Edge runtime.
 *
 * Credentials: `DATABASE_URL` (TiDB Cloud console -> Connect -> Serverless
 * Driver) if set, otherwise assembled from the same TIDB_* variables the
 * Python side uses, so dev works off the existing .env.local.
 */
function connectionUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const { TIDB_HOST, TIDB_PORT, TIDB_USER, TIDB_PASSWORD, TIDB_DATABASE } = process.env;
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
      `Set DATABASE_URL, or all of: ${missing.join(", ")}. ` +
        `Local dev reads web/.env.local; deploys read Vercel project env vars.`,
    );
  }

  // The password is percent-encoded: TiDB passwords routinely contain
  // characters that would otherwise terminate the URL's userinfo section.
  const user = encodeURIComponent(TIDB_USER!);
  const pass = encodeURIComponent(TIDB_PASSWORD!.replace(/^"|"$/g, ""));
  return `mysql://${user}:${pass}@${TIDB_HOST}:${TIDB_PORT}/${TIDB_DATABASE}`;
}

let conn: ReturnType<typeof connect> | undefined;

function client() {
  // Cheap to construct (no socket), but cached so each request reuses config.
  if (!conn) conn = connect({ url: connectionUrl() });
  return conn;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const rows = await client().execute(sql, params);
  return rows as T[];
}
