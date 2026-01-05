import { query, isDbConfigured } from "./db.js";

export async function listAsesores() {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT id, nombre, email, COALESCE(activo, true) AS activo
     FROM asesor
     ORDER BY nombre ASC`
  );
  return res.rows.map((r) => ({
    id: r.id,
    nombre: r.nombre || "",
    email: r.email || "",
    activo: !!r.activo
  }));
}
