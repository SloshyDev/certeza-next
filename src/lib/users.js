import { query, isDbConfigured } from "./db.js";

export async function listEmisores() {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT DISTINCT TRIM(email) AS email
     FROM users_auth
     WHERE email IS NOT NULL AND TRIM(email) <> ''
     ORDER BY email ASC`
  );
  return res.rows.map((r) => r.email).filter(Boolean);
}

