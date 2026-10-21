import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.PGUSER || process.env.USER || "postgres"}:${process.env.PGPASSWORD || ""}@${
      process.env.PGHOST || "localhost"
    }:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || "taskflow_db"}`,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
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
