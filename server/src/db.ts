import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const getDirname = (): string => {
  if (typeof __dirname !== "undefined") {
    return __dirname;
  }
  return process.cwd();
};
const currentDir = getDirname();
dotenv.config({ path: path.resolve(currentDir, "../.env") });
dotenv.config();

const { Pool } = pg;

function getNormalizedDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Generic migration from direct host to Supavisor pooler if needed
  const directMatch = url.match(/db\.([a-z0-9]+)\.supabase\.co/i);
  if (directMatch) {
    const ref = directMatch[1];
    const region = process.env.SUPABASE_REGION || "aws-0-ap-northeast-1";
    url = url
      .replace("postgres:", `postgres.${ref}:`)
      .replace(`db.${ref}.supabase.co:5432`, `${region}.pooler.supabase.com:6543`)
      .replace(`db.${ref}.supabase.co`, `${region}.pooler.supabase.com:6543`);
  }

  // Switch Supavisor pooler from session mode (port 5432) to transaction mode (port 6543)
  // to prevent EMAXCONNSESSION errors in serverless environments
  if (url.includes("pooler.supabase.com:5432")) {
    url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
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

const rejectUnauthorized =
  process.env.DB_ALLOW_INSECURE_TLS === "true"
    ? false
    : process.env.DB_REJECT_UNAUTHORIZED === "true";

export const pool = new Pool({
  connectionString:
    resolvedDbUrl ||
    `postgresql://${process.env.PGUSER || process.env.USER || "postgres"}:${process.env.PGPASSWORD || ""}@${
      process.env.PGHOST || "localhost"
    }:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || "taskflow_db"}`,
  ssl: isRemoteDb ? { rejectUnauthorized } : undefined,
  max: process.env.VERCEL ? 3 : 10,
  idleTimeoutMillis: 10000,
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
