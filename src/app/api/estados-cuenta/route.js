import { query, isDbConfigured } from "@/lib/db";

/**
 * GET /api/estados-cuenta
 * Obtiene los cortes de estados de cuenta
 */
export async function GET(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { ok: false, error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const corteId = searchParams.get("corte_id");

    if (corteId) {
      // Obtener detalles de un corte específico
      const detalles = await query(
        `SELECT 
          d.*,
          a.nombre as asesor_nombre_db,
          a.clave as asesor_clave_db
         FROM estados_cuenta_detalles d
         LEFT JOIN asesor a ON d.asesor_id = a.id
         WHERE d.corte_id = $1
         ORDER BY d.asesor_nombre, d.no_poliza, d.no_recibo`,
        [corteId]
      );

      const corte = await query(
        "SELECT * FROM estados_cuenta_cortes WHERE id = $1",
        [corteId]
      );

      if (corte.rows.length === 0) {
        return Response.json(
          { ok: false, error: "Corte no encontrado" },
          { status: 404 }
        );
      }

      return Response.json({
        ok: true,
        corte: corte.rows[0],
        detalles: detalles.rows,
      });
    }

    // Obtener lista de cortes
    const cortes = await query(
      `SELECT * FROM estados_cuenta_cortes ORDER BY fecha_corte DESC`
    );

    return Response.json({
      ok: true,
      cortes: cortes.rows,
    });
  } catch (error) {
    console.error("Error fetching estados de cuenta:", error);
    return Response.json(
      { ok: false, error: "Error al obtener estados de cuenta" },
      { status: 500 }
    );
  }
}
