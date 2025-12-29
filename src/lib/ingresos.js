import { query, isDbConfigured } from "./db";

export async function getIngresosTableData(startDate, endDate, filters = {}) {
    if (!isDbConfigured()) return [];

    const { asesor, folio, poliza, compania, estatus, solicitud } = filters;
    const params = [startDate, endDate];
    let queryStr = `SELECT 
       i.id,
       to_char(i.fecha_ingreso, 'YYYY-MM-DD') as fecha_ingreso,
       i.folio,
       i.poliza,
       i.compania,
       i.observacion,
       i.reingreso,
       i.tipo_solicitud,
       to_char(i.fecha_mesa_vales, 'YYYY-MM-DD') as fecha_mesa_vales,
       i.recibe,
       i.tipo_ingreso_reingreso,
       to_char(i.fecha_reingreso, 'YYYY-MM-DD') as fecha_reingreso,
       to_char(i.fecha_ingreso_digital, 'YYYY-MM-DD') as fecha_ingreso_digital,
       to_char(i.fecha_comercial, 'YYYY-MM-DD') as fecha_comercial,
       a.nombre as asesor
     FROM ingresos i
     LEFT JOIN asesor a ON a.id = i.asesor_id
     WHERE i.fecha_ingreso BETWEEN $1 AND $2`;

    let paramIndex = 3;

    if (asesor) {
        if (/^\d+$/.test(asesor)) {
            queryStr += ` AND i.asesor_id = $${paramIndex}`;
            params.push(asesor);
        } else {
            queryStr += ` AND a.nombre ILIKE $${paramIndex}`;
            params.push(`%${asesor}%`);
        }
        paramIndex++;
    }

    if (folio) {
        queryStr += ` AND i.folio ILIKE $${paramIndex}`;
        params.push(`%${folio}%`);
        paramIndex++;
    }

    if (poliza) {
        queryStr += ` AND i.poliza ILIKE $${paramIndex}`;
        params.push(`%${poliza}%`);
        paramIndex++;
    }

    if (compania && compania !== "TODAS") {
        queryStr += ` AND i.compania = $${paramIndex}`;
        params.push(compania);
        paramIndex++;
    }

    if (estatus && estatus !== "TODOS") {
        queryStr += ` AND i.tipo_ingreso_reingreso = $${paramIndex}`;
        params.push(estatus);
        paramIndex++;
    }

    if (solicitud && solicitud !== "TODAS") {
        queryStr += ` AND i.tipo_solicitud = $${paramIndex}`;
        params.push(solicitud);
        paramIndex++;
    }

    queryStr += ` ORDER BY i.fecha_ingreso DESC`;

    const res = await query(queryStr, params);

    return res.rows;
}

export async function getIngresosStats(startDate, endDate) {
    if (!isDbConfigured()) return { byStatus: [], byCompania: [], byAsesor: [] };

    // Status (tipo_ingreso_reingreso)
    const statusRes = await query(
        `SELECT tipo_ingreso_reingreso as tipo, COUNT(*) as total
         FROM ingresos
         WHERE fecha_ingreso BETWEEN $1 AND $2
         GROUP BY tipo_ingreso_reingreso
         ORDER BY total DESC`,
        [startDate, endDate]
    );

    // Compania
    const companiaRes = await query(
        `SELECT compania as tipo, COUNT(*) as total
         FROM ingresos
         WHERE fecha_ingreso BETWEEN $1 AND $2
         GROUP BY compania
         ORDER BY total DESC`,
        [startDate, endDate]
    );

    // Asesor
    const asesorRes = await query(
        `SELECT a.nombre as tipo, COUNT(*) as total
         FROM ingresos i
         LEFT JOIN asesor a ON a.id = i.asesor_id
         WHERE i.fecha_ingreso BETWEEN $1 AND $2
         GROUP BY a.nombre
         ORDER BY total DESC
         LIMIT 10`,
        [startDate, endDate]
    );

    // Mesa de Vales per day
    const mesaValesRes = await query(
        `SELECT to_char(fecha_mesa_vales, 'YYYY-MM-DD') as dia, COUNT(*) as total
         FROM ingresos
         WHERE fecha_mesa_vales BETWEEN $1 AND $2
         GROUP BY dia
         ORDER BY dia ASC`,
        [startDate, endDate]
    );

    return {
        byStatus: statusRes.rows,
        byCompania: companiaRes.rows,
        byAsesor: asesorRes.rows,
        byMesaValesDay: mesaValesRes.rows,
    };
}
