import { Pool } from "@neondatabase/serverless";

export function isDbConfigured() {
  const url = process.env.DATABASE_URL;
  return (
    typeof url === "string" &&
    /^postgres(ql)?:\/\//.test(url) &&
    !url.includes("user:password@host:port")
  );
}

export function getPool() {
  if (!isDbConfigured()) {
    throw new Error("DB_NOT_CONFIGURED");
  }
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export async function query(text, params) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}
