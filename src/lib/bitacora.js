import { query, isDbConfigured } from "./db.js";

export async function getBitacoraStatsByTipo(startDate, endDate) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT tipo, COUNT(*)::int AS total
     FROM bitacora
     WHERE fecha_creacion::date BETWEEN $1 AND $2
     GROUP BY tipo
     ORDER BY total DESC, tipo ASC`,
    [startDate, endDate]
  );
  return res.rows.map((r) => ({ tipo: r.tipo || "", total: r.total || 0 }));
}

export async function getBitacoraByEmisorTipo(startDate, endDate) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT COALESCE(emisor, '') AS emisor,
            COALESCE(tipo, '') AS tipo,
            COUNT(*)::int AS total
     FROM bitacora
     WHERE fecha_creacion::date BETWEEN $1 AND $2
     GROUP BY emisor, tipo
     ORDER BY emisor ASC, total DESC`,
    [startDate, endDate]
  );
  return res.rows.map((r) => ({
    emisor: r.emisor || "",
    tipo: r.tipo || "",
    total: r.total || 0,
  }));
}

export async function getDistinctTiposPorDia(startDate, endDate) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT fecha_creacion::date AS dia, COUNT(DISTINCT tipo)::int AS tipos_count
     FROM bitacora
     WHERE fecha_creacion::date BETWEEN $1 AND $2
     GROUP BY dia
     ORDER BY dia ASC`,
    [startDate, endDate]
  );
  return res.rows.map((r) => ({ dia: r.dia, tipos_count: r.tipos_count || 0 }));
}

export async function getTiposSeriePorDia(startDate, endDate) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT to_char(fecha_creacion::date, 'YYYY-MM-DD') AS dia,
            COALESCE(tipo, '') AS tipo,
            COUNT(*)::int AS total
     FROM bitacora
     WHERE fecha_creacion::date BETWEEN $1 AND $2
     GROUP BY dia, tipo
     ORDER BY dia ASC, tipo ASC`,
    [startDate, endDate]
  );
  return res.rows.map((r) => ({
    dia: r.dia,
    tipo: r.tipo || "",
    total: r.total || 0,
  }));
}

export async function getBitacoraByAsesorTipo(startDate, endDate) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT COALESCE(a.nombre, '') AS asesor,
            COALESCE(b.tipo, '') AS tipo,
            COUNT(*)::int AS total
     FROM bitacora b
     LEFT JOIN asesor a ON a.id = b.asesor
     WHERE b.fecha_creacion::date BETWEEN $1 AND $2
     GROUP BY COALESCE(a.nombre, ''), COALESCE(b.tipo, '')
     ORDER BY COALESCE(a.nombre, ''), COALESCE(b.tipo, '')`,
    [startDate, endDate]
  );
  return res.rows.map((r) => ({
    asesor: r.asesor || "",
    tipo: r.tipo || "",
    total: r.total || 0,
  }));
}

export async function getTiposTotals(startDate, endDate) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT COALESCE(tipo, '') AS tipo,
            COUNT(*)::int AS total
     FROM bitacora
     WHERE fecha_creacion::date BETWEEN $1 AND $2
     GROUP BY tipo
     ORDER BY total DESC`,
    [startDate, endDate]
  );
  return res.rows.map((r) => ({ tipo: r.tipo || "", total: r.total || 0 }));
}

export async function getHoraLlegadaSeries(startDate, endDate) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT to_char(fecha_creacion::date, 'YYYY-MM-DD') AS dia,
            EXTRACT(HOUR FROM hora_llegada)::int AS hora,
            COUNT(*)::int AS total
     FROM bitacora
     WHERE fecha_creacion::date BETWEEN $1 AND $2
       AND hora_llegada IS NOT NULL
       AND EXTRACT(HOUR FROM hora_llegada)::int BETWEEN 8 AND 19
     GROUP BY dia, hora
     ORDER BY dia ASC, hora ASC`,
    [startDate, endDate]
  );
  return res.rows.map((r) => ({
    dia: r.dia,
    hora: r.hora || 0,
    total: r.total || 0,
  }));
}

export async function getHoraAsignadoSeries(startDate, endDate) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT to_char(fecha_asignada, 'YYYY-MM-DD') AS dia,
            EXTRACT(HOUR FROM hora_asignado)::int AS hora,
            COUNT(*)::int AS total
     FROM bitacora
     WHERE fecha_asignada BETWEEN $1 AND $2
       AND hora_asignado IS NOT NULL
       AND EXTRACT(HOUR FROM hora_asignado)::int BETWEEN 8 AND 19
     GROUP BY dia, hora
     ORDER BY dia ASC, hora ASC`,
    [startDate, endDate]
  );
  return res.rows.map((r) => ({
    dia: r.dia,
    hora: r.hora || 0,
    total: r.total || 0,
  }));
}

export async function getBitacoraTableData(
  startDate,
  endDate,
  emisorEmail = null,
  emisorAlias = null
) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `WITH hist AS (
       SELECT bitacora_id, MIN(resp_ts) AS min_resp_ts
       FROM (
         SELECT bitacora_id,
                (fecha_respondido_nueva::timestamp + hora_respondido_nueva) AS resp_ts
         FROM bitacora_historial
         WHERE fecha_respondido_nueva IS NOT NULL AND hora_respondido_nueva IS NOT NULL
         UNION ALL
         SELECT bitacora_id,
                (fecha_respondido_anterior::timestamp + hora_respondido_anterior) AS resp_ts
         FROM bitacora_historial
         WHERE fecha_respondido_anterior IS NOT NULL AND hora_respondido_anterior IS NOT NULL
       ) u
       GROUP BY bitacora_id
     )
     SELECT b.id,
            b.asesor AS asesor_id,
            COALESCE(a.nombre, '') AS asesor,
            COALESCE(b.tipo, '') AS tipo,
            COALESCE(b.asunto, '') AS asunto,
            CASE WHEN b.hora_llegada IS NOT NULL THEN to_char(b.hora_llegada, 'HH24:MI') ELSE '' END AS hora_llegada,
            CASE WHEN b.dia_llegada IS NOT NULL THEN to_char(b.dia_llegada, 'YYYY-MM-DD') ELSE '' END AS dia_llegada,
            COALESCE(b.estatus, '') AS estatus,
            COALESCE(p.no_poliza, '') AS no_poliza,
            COALESCE(b.emisor, '') AS emisor,
            CASE
              WHEN b.fecha_asignada IS NOT NULL AND b.hora_asignado IS NOT NULL THEN
                COALESCE(
                  FLOOR(
                    EXTRACT(EPOCH FROM (
                      COALESCE(hist.min_resp_ts, (b.fecha_respondido::timestamp + b.hora_respondido))
                      - (b.fecha_asignada::timestamp + b.hora_asignado)
                    )) / 60
                  )::int,
                  NULL
                )
              ELSE NULL
            END AS tiempo_respuesta_min
     FROM bitacora b
     LEFT JOIN asesor a ON a.id = b.asesor
     LEFT JOIN polizas p ON p.bitacora_id = b.id
     LEFT JOIN hist ON hist.bitacora_id = b.id
   WHERE b.fecha_creacion::date BETWEEN $1 AND $2
     AND (
       (COALESCE($3, '') = '' AND COALESCE($4, '') = '')
       OR LOWER(TRIM(b.emisor)) = LOWER(TRIM($3))
       OR LOWER(TRIM(b.emisor)) = LOWER(TRIM($4))
     )
     ORDER BY COALESCE(b.dia_llegada::timestamp + b.hora_llegada, b.fecha_creacion) ASC,
              b.emisor ASC,
              b.id ASC`,
    [startDate, endDate, emisorEmail, emisorAlias]
  );
  return res.rows.map((r) => ({
    id: r.id,
    asesor_id: r.asesor_id,
    asesor: r.asesor || "",
    tipo: r.tipo || "",
    asunto: r.asunto || "",
    hora_llegada: r.hora_llegada || "",
    dia_llegada: r.dia_llegada || "",
    estatus: r.estatus || "",
    tiempo_respuesta_min:
      typeof r.tiempo_respuesta_min === "number"
        ? r.tiempo_respuesta_min
        : null,
    no_poliza: r.no_poliza || "",
    emisor: r.emisor || "",
  }));
}

export async function searchBitacoraByIdOrAsunto(
  id,
  asunto,
  emisorEmail = null,
  emisorAlias = null
) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `WITH hist AS (
       SELECT bitacora_id, MIN(resp_ts) AS min_resp_ts
       FROM (
         SELECT bitacora_id,
                (fecha_respondido_nueva::timestamp + hora_respondido_nueva) AS resp_ts
         FROM bitacora_historial
         WHERE fecha_respondido_nueva IS NOT NULL AND hora_respondido_nueva IS NOT NULL
         UNION ALL
         SELECT bitacora_id,
                (fecha_respondido_anterior::timestamp + hora_respondido_anterior) AS resp_ts
         FROM bitacora_historial
         WHERE fecha_respondido_anterior IS NOT NULL AND hora_respondido_anterior IS NOT NULL
       ) u
       GROUP BY bitacora_id
     )
     SELECT b.id,
            COALESCE(a.nombre, '') AS asesor,
            COALESCE(b.tipo, '') AS tipo,
            COALESCE(b.asunto, '') AS asunto,
            CASE WHEN b.hora_llegada IS NOT NULL THEN to_char(b.hora_llegada, 'HH24:MI') ELSE '' END AS hora_llegada,
            CASE WHEN b.dia_llegada IS NOT NULL THEN to_char(b.dia_llegada, 'YYYY-MM-DD') ELSE '' END AS dia_llegada,
            COALESCE(b.estatus, '') AS estatus,
            COALESCE(p.no_poliza, '') AS no_poliza,
            COALESCE(b.emisor, '') AS emisor,
            CASE
              WHEN b.fecha_asignada IS NOT NULL AND b.hora_asignado IS NOT NULL THEN
                COALESCE(
                  FLOOR(
                    EXTRACT(EPOCH FROM (
                      COALESCE(hist.min_resp_ts, (b.fecha_respondido::timestamp + b.hora_respondido))
                      - (b.fecha_asignada::timestamp + b.hora_asignado)
                    )) / 60
                  )::int,
                  NULL
                )
              ELSE NULL
            END AS tiempo_respuesta_min
     FROM bitacora b
     LEFT JOIN asesor a ON a.id = b.asesor
     LEFT JOIN polizas p ON p.bitacora_id = b.id
     LEFT JOIN hist ON hist.bitacora_id = b.id
   WHERE (($1 IS NOT NULL AND b.id = $1) OR ($2 IS NOT NULL AND b.asunto ILIKE '%' || $2 || '%'))
     AND (
       (COALESCE($3, '') = '' AND COALESCE($4, '') = '')
       OR LOWER(TRIM(b.emisor)) = LOWER(TRIM($3))
       OR LOWER(TRIM(b.emisor)) = LOWER(TRIM($4))
     )
     ORDER BY b.emisor ASC,
              COALESCE(b.dia_llegada::timestamp + b.hora_llegada, b.fecha_creacion) ASC,
              b.id ASC`,
    [id ?? null, asunto ?? null, emisorEmail, emisorAlias]
  );
  return res.rows.map((r) => ({
    id: r.id,
    asesor: r.asesor || "",
    tipo: r.tipo || "",
    asunto: r.asunto || "",
    hora_llegada: r.hora_llegada || "",
    dia_llegada: r.dia_llegada || "",
    estatus: r.estatus || "",
    tiempo_respuesta_min:
      typeof r.tiempo_respuesta_min === "number"
        ? r.tiempo_respuesta_min
        : null,
    no_poliza: r.no_poliza || "",
    emisor: r.emisor || "",
  }));
}

export async function getPolizasHistoryForBitacora(bitacoraId) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT id,
            poliza_id,
            no_poliza,
            campo_modificado,
            valor_anterior,
            valor_nuevo,
            usuario,
            fecha_modificacion,
            operacion,
            bitacora_id,
            created_at
     FROM polizas_history
     WHERE bitacora_id = $1
     ORDER BY fecha_modificacion ASC, id ASC`,
    [bitacoraId]
  );
  return res.rows.map((r) => ({
    id: r.id,
    poliza_id: r.poliza_id,
    no_poliza: r.no_poliza || "",
    campo_modificado: r.campo_modificado || "",
    valor_anterior: r.valor_anterior || "",
    valor_nuevo: r.valor_nuevo || "",
    usuario: r.usuario || "",
    fecha_modificacion: r.fecha_modificacion,
    operacion: r.operacion || "",
    bitacora_id: r.bitacora_id,
    created_at: r.created_at,
  }));
}

export async function getBitacoraHistorial(bitacoraId) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT estatus_anterior,
            estatus_nuevo,
            fecha_respondido_anterior,
            fecha_respondido_nueva,
            hora_respondido_anterior,
            hora_respondido_nueva,
            motivo_anterior,
            motivo_nuevo,
            actualizado_por,
            fecha_actualizacion,
            emisor_anterior,
            emisor_nuevo
     FROM bitacora_historial
     WHERE bitacora_id = $1
     ORDER BY fecha_actualizacion ASC`,
    [bitacoraId]
  );
  return res.rows.map((r) => ({
    estatus_anterior: r.estatus_anterior || "",
    estatus_nuevo: r.estatus_nuevo || "",
    fecha_respondido_anterior: r.fecha_respondido_anterior,
    fecha_respondido_nueva: r.fecha_respondido_nueva,
    hora_respondido_anterior: r.hora_respondido_anterior,
    hora_respondido_nueva: r.hora_respondido_nueva,
    motivo_anterior: r.motivo_anterior || "",
    motivo_nuevo: r.motivo_nuevo || "",
    actualizado_por: r.actualizado_por || "",
    fecha_actualizacion: r.fecha_actualizacion,
    emisor_anterior: r.emisor_anterior || "",
    emisor_nuevo: r.emisor_nuevo || "",
  }));
}
