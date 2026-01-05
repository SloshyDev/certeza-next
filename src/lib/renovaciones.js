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

/**
 * Obtiene el listado detallado de renovaciones con filtros opcionales.
 * @param {Object} filters
 * @param {string} [filters.mes]
 * @param {string} [filters.estatus]
 * @param {string} [filters.asesor]
 * @param {string} [filters.poliza]
 * @returns {Promise<Array<any>>}
 */
export async function getRenovaciones(filters = {}) {
  if (!isDbConfigured()) return { data: [], total: 0, pages: 0 };

  const conditions = [];
  const params = [];
  let queryStr = `
    SELECT 
      r.id,
      r.poliza,
      r.mes,
      COALESCE(r.estatus, 'Sin Estatus') as estatus,
      COALESCE(a.nombre, 'Sin Asesor') as asesor_nombre
    FROM renovaciones r
    LEFT JOIN asesor a ON r.asesor_id = a.id
  `;

  let countQueryStr = `
    SELECT COUNT(*)::int as total
    FROM renovaciones r
    LEFT JOIN asesor a ON r.asesor_id = a.id
  `;

  if (filters.mes) {
    params.push(filters.mes);
    conditions.push(`r.mes = $${params.length}`);
  }
  if (filters.estatus) {
    params.push(filters.estatus);
    conditions.push(`r.estatus = $${params.length}`);
  }
  if (filters.poliza) {
    params.push(`%${filters.poliza}%`);
    conditions.push(`r.poliza ILIKE $${params.length}`);
  }
  if (filters.asesor) {
    params.push(`%${filters.asesor}%`);
    conditions.push(`a.nombre ILIKE $${params.length}`);
  }

  if (conditions.length > 0) {
    const whereClause = ` WHERE ` + conditions.join(" AND ");
    queryStr += whereClause;
    countQueryStr += whereClause;
  }

  // Count Total
  const countRes = await query(countQueryStr, params);
  const total = countRes.rows[0]?.total || 0;

  // Pagination
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Number(filters.limit) || 20);
  const offset = (page - 1) * limit;

  queryStr += ` ORDER BY r.mes DESC, r.id DESC LIMIT ${limit} OFFSET ${offset}`;

  const res = await query(queryStr, params);

  return {
    data: res.rows,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

/**
 * Obtiene el listado detallado de todas las renovaciones con filtros opcionales, sin paginación.
 * @param {Object} filters
 * @param {string} [filters.mes]
 * @param {string} [filters.estatus]
 * @param {string} [filters.asesor]
 * @param {string} [filters.poliza]
 * @returns {Promise<Array<any>>}
 */
export async function getAllRenovacionesForExport(filters = {}) {
  if (!isDbConfigured()) return [];

  const conditions = [];
  const params = [];
  let queryStr = `
    SELECT 
      r.id,
      r.poliza,
      r.mes,
      COALESCE(r.estatus, 'Sin Estatus') as estatus,
      COALESCE(a.nombre, 'Sin Asesor') as asesor_nombre
    FROM renovaciones r
    LEFT JOIN asesor a ON r.asesor_id = a.id
  `;

  if (filters.mes) {
    params.push(filters.mes);
    conditions.push(`r.mes = $${params.length}`);
  }
  if (filters.estatus) {
    params.push(filters.estatus);
    conditions.push(`r.estatus = $${params.length}`);
  }
  if (filters.poliza) {
    params.push(`%${filters.poliza}%`);
    conditions.push(`r.poliza ILIKE $${params.length}`);
  }
  if (filters.asesor) {
    params.push(`%${filters.asesor}%`);
    conditions.push(`a.nombre ILIKE $${params.length}`);
  }

  if (conditions.length > 0) {
    const whereClause = ` WHERE ` + conditions.join(" AND ");
    queryStr += whereClause;
  }

  queryStr += ` ORDER BY r.mes DESC, r.id DESC`;

  const res = await query(queryStr, params);

  return res.rows;
}

/**
 * Obtiene la lista única de meses disponibles en renovaciones.
 */
export async function getRenovacionesMeses() {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT DISTINCT mes FROM renovaciones`
  );

  const months = res.rows.map((r) => r.mes).filter(Boolean);

  const monthMap = {
    ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5,
    JULIO: 6, AGOSTO: 7, SEPTIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11
  };

  return months.sort((a, b) => {
    // Parse "MES AÑO" e.g. "ENERO 2025"
    const [ma, ya] = a.trim().toUpperCase().split(/\s+/);
    const [mb, yb] = b.trim().toUpperCase().split(/\s+/);

    const yearA = parseInt(ya) || 0;
    const yearB = parseInt(yb) || 0;

    if (yearA !== yearB) {
      return yearB - yearA; // Newest year first
    }

    // Same year, check month
    const idxA = monthMap[ma] ?? -1;
    const idxB = monthMap[mb] ?? -1;

    return idxB - idxA; // Newest month first
  });
}
