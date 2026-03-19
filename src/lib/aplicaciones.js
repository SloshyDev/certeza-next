import { query, isDbConfigured } from "./db.js";

/**
 * Obtiene el desglose de aplicaciones e historial.
 * @param {string} poliza - Número de póliza (opcional)
 * @param {number} limit - Límite de registros (opcional)
 * @returns {Promise<Array>}
 */
export async function getAplicacionesDesglose(poliza = null, limit = 50) {
  if (!isDbConfigured()) return [];

  const conditions = [];
  const params = [];

  if (poliza && poliza.trim()) {
    params.push(`%${poliza.trim()}%`);
    conditions.push(`a.poliza ILIKE $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit);

  const res = await query(
    `SELECT 
       a.id,
       a.poliza,
       a.estatus,
       a.fecha_creado,
       a.fecha_actualizado,
       a.observaciones,
       a.asunto,
       a.usuario_registro,
       a.usuario_ultima_actualizacion,
       b.id as bitacora_id,
       b.tipo as bitacora_tipo,
       b.emisor as bitacora_emisor,
       COALESCE(ase_bit.nombre, ase_dir.nombre) as asesor_nombre
     FROM aplicaciones a
     LEFT JOIN bitacora b ON a.refid = b.id
     LEFT JOIN asesor ase_bit ON b.asesor = ase_bit.id
     LEFT JOIN asesor ase_dir ON a.asesor_id = ase_dir.id
     ${whereClause}
     ORDER BY a.fecha_actualizado DESC
     LIMIT $${params.length}`,
    params
  );

  const aplicaciones = res.rows;

  // Obtener historial para cada aplicación
  for (let app of aplicaciones) {
    const histRes = await query(
      `SELECT 
         id,
         accion,
         poliza_anterior,
         poliza_nueva,
         estatus_anterior,
         estatus_nuevo,
         fecha_cambio,
         cambiado_por,
         observaciones_anterior,
         observaciones_nueva,
         asunto_anterior,
         asunto_nuevo
       FROM aplicaciones_historial
       WHERE aplicacion_id = $1
       ORDER BY fecha_cambio DESC`,
      [app.id]
    );
    app.historial = histRes.rows;
  }

  return aplicaciones;
}

/**
 * Obtiene un resumen de todas las pólizas con aplicaciones.
 * @returns {Promise<Array>}
 */
export async function getResumenAplicacionesPorPoliza() {
  if (!isDbConfigured()) return [];

  const res = await query(
    `SELECT 
       poliza,
       count(*)::int as total_aplicaciones,
       max(fecha_actualizado) as ultima_actualizacion
     FROM aplicaciones
     GROUP BY poliza
     ORDER BY ultima_actualizacion DESC`
  );

  return res.rows;
}
