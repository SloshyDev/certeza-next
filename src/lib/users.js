import { query, isDbConfigured } from "./db.js";

export async function listEmisores() {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT DISTINCT TRIM(emisor) AS emisor
     FROM users
     WHERE emisor IS NOT NULL AND TRIM(emisor) <> ''
     ORDER BY emisor ASC`
  );
  return res.rows.map((r) => r.emisor).filter(Boolean);
}

