import { query, isDbConfigured } from "./db.js";

export async function listAsesores() {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT id, nombre, COALESCE(activo, true) AS activo
     FROM asesor
     ORDER BY nombre ASC`
  );
  return res.rows.map((r) => ({ id: r.id, nombre: r.nombre || "", activo: !!r.activo }));
}

