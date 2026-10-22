import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const { Pool } = pg;

function getNormalizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Automatically migrate legacy IPv6-only Supabase direct host to IPv4 Supavisor pooler
  if (url.includes("db.ciqhtdrunnnwsiyobtvp.supabase.co")) {
    url = url
      .replace("postgres:", "postgres.ciqhtdrunnnwsiyobtvp:")
      .replace("db.ciqhtdrunnnwsiyobtvp.supabase.co:5432", "aws-0-ap-northeast-1.pooler.supabase.com:5432")
      .replace("db.ciqhtdrunnnwsiyobtvp.supabase.co", "aws-0-ap-northeast-1.pooler.supabase.com:5432");
  }

  return url;
}

const resolvedDbUrl = getNormalizedDatabaseUrl();

const isRemoteDb = Boolean(
  resolvedDbUrl &&
    (resolvedDbUrl.includes("supabase") ||
      resolvedDbUrl.includes("sslmode=require") ||
      resolvedDbUrl.includes("neon.tech") ||
      process.env.DB_SSL === "true")
);

export const pool = new Pool({
  connectionString:
    resolvedDbUrl ||
    `postgresql://${process.env.PGUSER || process.env.USER || "postgres"}:${process.env.PGPASSWORD || ""}@${
      process.env.PGHOST || "localhost"
    }:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || "taskflow_db"}`,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development") {
    // console.debug("Executed query", { text, duration, rows: res.rowCount });
  }
  return res;
}
