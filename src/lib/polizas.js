import { query, isDbConfigured } from "./db.js";

/**
 * Obtiene el total de pólizas agrupadas por estatus.
 * @returns {Promise<Array<{estatus: string, total: number}>>}
 */
export async function getPolizasStats() {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT COALESCE(estatus, 'Sin Estatus') as estatus, COUNT(*)::int as total
     FROM polizas
     GROUP BY estatus
     ORDER BY total DESC`
  );
  return res.rows.map((r) => ({
    estatus: r.estatus,
    total: r.total,
  }));
}

/**
 * Obtiene las pólizas con filtros y paginación.
 * @param {Object} filters - Objeto con los filtros (no_poliza, asesor_id, cia, estatus, fecha_desde, fecha_hasta)
 * @param {number} page - Página actual (default 1)
 * @param {number} limit - Límite por página (default 50)
 * @returns {Promise<Array>}
 */
export async function getPolizas(filters = {}, page = 1, limit = 50) {
  if (!isDbConfigured()) return [];

  const conditions = [];
  const params = [];

  // Filtro por número de póliza (búsqueda parcial o múltiple con comas)
  if (filters.no_poliza && filters.no_poliza.trim()) {
    const polizaValue = filters.no_poliza.trim();

    // Si contiene comas, buscar exactamente esos números de póliza
    if (polizaValue.includes(",")) {
      const polizas = polizaValue
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);
      params.push(polizas);
      conditions.push(`p.no_poliza = ANY($${params.length})`);
    } else {
      // Búsqueda parcial para un solo valor
      params.push(`%${polizaValue}%`);
      conditions.push(`p.no_poliza ILIKE $${params.length}`);
    }
  }

  // Filtro por asesor
  if (filters.asesor_id) {
    params.push(Number(filters.asesor_id));
    conditions.push(`p.asesor_id = $${params.length}`);
  }

  // Filtro por compañía
  if (filters.cia && filters.cia.trim()) {
    params.push(`%${filters.cia.trim()}%`);
    conditions.push(`p.cia ILIKE $${params.length}`);
  }

  // Filtro por estatus
  if (filters.estatus && filters.estatus.trim()) {
    params.push(filters.estatus.trim());
    conditions.push(`p.estatus = $${params.length}`);
  }

  // Filtro por quincena
  if (filters.quincena && filters.quincena.trim()) {
    params.push(filters.quincena.trim());
    conditions.push(`p.quincena = $${params.length}`);
  }

  // Filtro por fecha desde
  if (filters.fecha_desde) {
    params.push(filters.fecha_desde);
    conditions.push(`p.f_desde >= $${params.length}`);
  }

  // Filtro por fecha hasta
  if (filters.fecha_hasta) {
    params.push(filters.fecha_hasta);
    conditions.push(`p.f_hasta <= $${params.length}`);
  }

  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  // Calcular offset para paginación
  const offset = (page - 1) * limit;
  params.push(limit, offset);

  const res = await query(
    `SELECT 
       p.id,
       p.no_poliza,
       p.asesor_id,
       COALESCE(a.nombre, 'Sin Asesor') as asesor_nombre,
       p.bitacora_id,
       p.cia,
       p.estatus,
       p.quincena,
       p.f_desde,
       p.f_hasta,
       p.f_ingreso,
       p.f_actualizacion,
       p.f_vale_recibido,
       p.prima_total,
       p.prima_neta,
       p.commission_percentage,
       p.forma_pago,
       p.no_vale,
       p.folio,
       p.check_mesa,
       p.contador_cambios,
       p.created_by,
       p.created_at,
       (SELECT COUNT(*) FROM recibos r WHERE r.poliza_id = p.id)::int > 0 as tiene_recibos
     FROM polizas p
     LEFT JOIN asesor a ON p.asesor_id = a.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return res.rows;
}

/**
 * Obtiene el total de pólizas que coinciden con los filtros (para paginación).
 * @param {Object} filters - Objeto con los filtros
 * @returns {Promise<number>}
 */
export async function getPolizasCount(filters = {}) {
  if (!isDbConfigured()) return 0;

  const conditions = [];
  const params = [];

  if (filters.no_poliza && filters.no_poliza.trim()) {
    const polizaValue = filters.no_poliza.trim();

    // Si contiene comas, buscar exactamente esos números de póliza
    if (polizaValue.includes(",")) {
      const polizas = polizaValue
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p);
      params.push(polizas);
      conditions.push(`p.no_poliza = ANY($${params.length})`);
    } else {
      // Búsqueda parcial para un solo valor
      params.push(`%${polizaValue}%`);
      conditions.push(`p.no_poliza ILIKE $${params.length}`);
    }
  }

  if (filters.asesor_id) {
    params.push(Number(filters.asesor_id));
    conditions.push(`p.asesor_id = $${params.length}`);
  }

  if (filters.cia && filters.cia.trim()) {
    params.push(`%${filters.cia.trim()}%`);
    conditions.push(`p.cia ILIKE $${params.length}`);
  }

  if (filters.estatus && filters.estatus.trim()) {
    params.push(filters.estatus.trim());
    conditions.push(`p.estatus = $${params.length}`);
  }

  if (filters.quincena && filters.quincena.trim()) {
    params.push(filters.quincena.trim());
    conditions.push(`p.quincena = $${params.length}`);
  }

  if (filters.fecha_desde) {
    params.push(filters.fecha_desde);
    conditions.push(`p.f_desde >= $${params.length}`);
  }

  if (filters.fecha_hasta) {
    params.push(filters.fecha_hasta);
    conditions.push(`p.f_hasta <= $${params.length}`);
  }

  const whereClause =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  const res = await query(
    `SELECT COUNT(*)::int as total
     FROM polizas p
     ${whereClause}`,
    params
  );

  return res.rows[0]?.total || 0;
}

/**
 * Obtiene una póliza por ID.
 * @param {number} id - ID de la póliza
 * @returns {Promise<Object|null>}
 */
export async function getPolizaById(id) {
  if (!isDbConfigured()) return null;

  const res = await query(
    `SELECT 
       p.*,
       COALESCE(a.nombre, 'Sin Asesor') as asesor_nombre
     FROM polizas p
     LEFT JOIN asesor a ON p.asesor_id = a.id
     WHERE p.id = $1`,
    [id]
  );

  return res.rows[0] || null;
}

/**
 * Obtiene todos los estatus únicos de pólizas.
 * @returns {Promise<Array<string>>}
 */
export async function getPolizasEstatus() {
  if (!isDbConfigured()) return [];

  const res = await query(
    `SELECT DISTINCT estatus
     FROM polizas
     WHERE estatus IS NOT NULL
     ORDER BY estatus ASC`
  );

  return res.rows.map((r) => r.estatus);
}

/**
 * Obtiene todas las compañías únicas de pólizas.
 * @returns {Promise<Array<string>>}
 */
export async function getPolizasCias() {
  if (!isDbConfigured()) return [];

  const res = await query(
    `SELECT DISTINCT cia
     FROM polizas
     WHERE cia IS NOT NULL
     ORDER BY cia ASC`
  );

  return res.rows.map((r) => r.cia);
}
