import { query, isDbConfigured } from "./db.js";

/**
 * Obtiene el total de renovaciones agrupadas por estatus.
 * @returns {Promise<Array<{estatus: string, total: number}>>}
 */
export async function getRenovacionesStats() {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT COALESCE(estatus, 'Sin Estatus') as estatus, COUNT(*)::int as total
     FROM renovaciones
     GROUP BY estatus
     ORDER BY total DESC`
  );
  return res.rows.map((r) => ({
    estatus: r.estatus,
    total: r.total,
  }));
}

/**
 * Obtiene las renovaciones agrupadas por mes, estatus y asesor.
 * Ahora incluye join con tabla asesor para obtener el nombre.
 * @returns {Promise<Array<{mes: string, estatus: string, asesor: string, total: number}>>}
 */
export async function getRenovacionesByMes() {
  if (!isDbConfigured()) return [];

  // Asumiendo que existe una tabla 'asesor' y la relación es renovaciones.asesor_id = asesor.id
  // Si no hay tabla asesor o la relación es diferente, ajustar la query.
  // Basado en schema.json, existe tabla 'asesor' con columna 'nombre'.

  const res = await query(
    `SELECT 
       r.mes, 
       COALESCE(r.estatus, 'Sin Estatus') as estatus, 
       COALESCE(a.nombre, 'Sin Asesor') as asesor,
       COUNT(*)::int as total
     FROM renovaciones r
     LEFT JOIN asesor a ON r.asesor_id = a.id
     GROUP BY r.mes, r.estatus, a.nombre
     ORDER BY r.mes ASC, total DESC`
  );

  return res.rows.map((r) => ({
    mes: r.mes,
    estatus: r.estatus,
    asesor: r.asesor,
    total: r.total,
  }));
}
