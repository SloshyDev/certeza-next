import { query, isDbConfigured } from "@/lib/db";

/**
 * GET /api/recibos/list
 * Obtiene los recibos agrupados por póliza con información detallada
 */
export async function GET(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    // Obtener filtros opcionales de query params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Query para obtener pólizas con sus recibos
    const result = await query(
      `
      SELECT 
        p.id as poliza_id,
        p.no_poliza,
        p.cia,
        p.forma_pago,
        p.estatus as poliza_estatus,
        p.folio,
        p.quincena,
        p.f_desde,
        p.f_hasta,
        p.prima_total,
        p.prima_neta,
        p.commission_percentage,
        p.asesor_id,
        a.nombre as asesor_nombre,
        a.clave as asesor_clave,
        COUNT(r.id) as total_recibos,
        SUM(CASE WHEN r.estatus_pago = 'PAGADO' THEN 1 ELSE 0 END) as recibos_pagados,
        SUM(CASE WHEN r.estatus_comision = 'PAGADO' THEN 1 ELSE 0 END) as comisiones_pagadas,
        SUM(CASE WHEN r.estatus_comision = 'PAGADO' AND r.comision > 0 THEN r.comision ELSE 0 END) as comision_pagada_total,
        SUM(CASE WHEN r.estatus_comision = 'CANCELADO' AND r.comision > 0 THEN r.comision WHEN r.comision < 0 THEN ABS(r.comision) ELSE 0 END) as comision_cancelada_total,
        SUM(CASE WHEN r.estatus_comision NOT IN ('PAGADO', 'CANCELADO') AND r.comision > 0 THEN r.comision ELSE 0 END) as comision_pendiente_total,
        json_agg(
          json_build_object(
            'id', r.id,
            'no_recibo', r.no_recibo,
            'estatus_pago', r.estatus_pago,
            'estatus_comision', r.estatus_comision,
            'prima_neta', r.prima_neta,
            'prima_total', r.prima_total,
            'comision', r.comision,
            'f_desde', r.f_desde,
            'f_hasta', r.f_hasta,
            'f_pago', r.f_pago,
            'f_pago_comision', r.f_pago_comision,
            'no_aviso', r.no_aviso,
            'dias_vencido', CASE 
              WHEN r.f_hasta < CURRENT_DATE AND r.estatus_pago != 'PAGADO' 
              THEN CURRENT_DATE - r.f_hasta 
              ELSE 0 
            END
          ) ORDER BY r.no_recibo
        ) as recibos
      FROM polizas p
      LEFT JOIN asesor a ON p.asesor_id = a.id
      LEFT JOIN recibos r ON r.poliza_id = p.id
      WHERE EXISTS (SELECT 1 FROM recibos WHERE poliza_id = p.id)
      GROUP BY p.id, p.no_poliza, p.cia, p.forma_pago, p.estatus, p.folio, p.quincena,
               p.f_desde, p.f_hasta, p.prima_total, p.prima_neta, p.commission_percentage, p.asesor_id, a.nombre, a.clave
      ORDER BY p.no_poliza DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    // Contar total
    const countResult = await query(`
      SELECT COUNT(DISTINCT p.id) as total
      FROM polizas p
      WHERE EXISTS (SELECT 1 FROM recibos WHERE poliza_id = p.id)
    `);

    const total = parseInt(countResult.rows[0]?.total || 0);

    return Response.json({
      data: result.rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error getting recibos list:", error);
    return Response.json(
      { error: "Error al obtener lista de recibos" },
      { status: 500 }
    );
  }
}
