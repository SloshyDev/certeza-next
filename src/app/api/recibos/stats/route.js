import { query, isDbConfigured } from "@/lib/db";

/**
 * GET /api/recibos/stats
 * Obtiene estadísticas de los recibos
 */
export async function GET(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estatus_pago = 'PENDIENTE') as pendiente_pago,
        COUNT(*) FILTER (WHERE estatus_pago = 'PAGADO') as pagado,
        COUNT(*) FILTER (WHERE estatus_comision = 'PENDIENTE') as pendiente_comision,
        COUNT(*) FILTER (WHERE estatus_comision = 'PAGADO') as comision_pagada
      FROM recibos
    `);

    const stats = result.rows[0] || {
      total: 0,
      pendiente_pago: 0,
      pagado: 0,
      pendiente_comision: 0,
      comision_pagada: 0,
    };

    return Response.json({
      total: parseInt(stats.total) || 0,
      pendiente_pago: parseInt(stats.pendiente_pago) || 0,
      pagado: parseInt(stats.pagado) || 0,
      pendiente_comision: parseInt(stats.pendiente_comision) || 0,
      comision_pagada: parseInt(stats.comision_pagada) || 0,
    });
  } catch (error) {
    console.error("Error getting recibos stats:", error);
    return Response.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}
