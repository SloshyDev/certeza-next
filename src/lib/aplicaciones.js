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
       b.asesor as asesor_id,
       ase.nombre as asesor_nombre
     FROM aplicaciones a
     LEFT JOIN bitacora b ON a.refid = b.id
     LEFT JOIN asesor ase ON b.asesor = ase.id
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
 * Actualiza el asesor de una aplicación (vía bitacora).
 * @param {number} id - ID de la aplicación
 * @param {number} asesorId - ID del nuevo asesor
 * @returns {Promise<Object>}
 */
export async function updateAplicacionAsesor(id, asesorId) {
  if (!isDbConfigured()) return { ok: false, error: "DB_NOT_CONFIGURED" };

  try {
    // 1. Obtener el refid de la aplicación
    const appRes = await query(
      "SELECT refid, asunto, estatus, poliza FROM aplicaciones WHERE id = $1",
      [id]
    );

    if (appRes.rows.length === 0) {
      return { ok: false, error: "APLICACION_NOT_FOUND" };
    }

    let refid = appRes.rows[0].refid;

    if (!refid) {
      // 2. Si no hay link, crear una nueva bitacora
      const newBitacoraRes = await query(
        `INSERT INTO bitacora (asesor, asunto, estatus, tipo, fecha_creacion, emisor) 
         VALUES ($1, $2, $3, 'SOLICITUD', NOW(), 'SISTEMA') 
         RETURNING id`,
        [asesorId, appRes.rows[0].asunto || `Póliza ${appRes.rows[0].poliza}`, appRes.rows[0].estatus || 'PENDIENTE']
      );
      
      refid = newBitacoraRes.rows[0].id;

      // Actualizar la aplicación con el nuevo refid
      await query(
        "UPDATE aplicaciones SET refid = $1 WHERE id = $2",
        [refid, id]
      );
    } else {
      // 3. Si hay link, solo actualizar el asesor en la bitacora existente
      await query(
        "UPDATE bitacora SET asesor = $1 WHERE id = $2",
        [asesorId, refid]
      );
    }

    // 3. Registrar el cambio en aplicaciones_historial (opcional pero recomendado)
    // Buscamos quién es el usuario actual desde la sesión (se pasará por el API)
    
    return { ok: true };
  } catch (error) {
    console.error("Error updating aplicacion asesor:", error);
    return { ok: false, error: error.message };
  }
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
