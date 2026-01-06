import { Pool } from "@neondatabase/serverless";

export function isDbConfigured() {
  const url = process.env.DATABASE_URL;
  return (
    typeof url === "string" &&
    /^postgres(ql)?:\/\//.test(url) &&
    !url.includes("user:password@host:port")
  );
}

export function isExtractorDbConfigured() {
  const url = process.env.DATABASE_URL_EXTRACTOR;
  return (
    typeof url === "string" &&
    /^postgres(ql)?:\/\//.test(url) &&
    !url.includes("user:password@host:port")
  );
}

export function getPool(useExtractorDb = false) {
  const dbUrl = useExtractorDb
    ? process.env.DATABASE_URL_EXTRACTOR
    : process.env.DATABASE_URL;

  if (!dbUrl || !/^postgres(ql)?:\/\//.test(dbUrl)) {
    throw new Error("DB_NOT_CONFIGURED");
  }
  return new Pool({ connectionString: dbUrl });
}

export async function query(text, params, useExtractorDb = false) {
  const pool = getPool(useExtractorDb);
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}
