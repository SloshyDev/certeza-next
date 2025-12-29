import { query, isDbConfigured } from "@/lib/db";

export async function POST(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { ok: false, error: "DB_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { poliza_id, no_recibo, monto_ajuste, tipo_ajuste, motivo } = body;

    if (
      !poliza_id ||
      no_recibo === undefined ||
      monto_ajuste === undefined ||
      !tipo_ajuste
    ) {
      return Response.json(
        { ok: false, error: "Faltan datos requeridos" },
        { status: 400 }
      );
    }

    // Obtener información de la póliza
    const polizaResult = await query(
      `SELECT p.*, 
              COUNT(r.id) as recibos_count
       FROM polizas p
       LEFT JOIN recibos r ON r.poliza_id = p.id
       WHERE p.id = $1
       GROUP BY p.id`,
      [poliza_id]
    );

    if (polizaResult.rows.length === 0) {
      return Response.json(
        { ok: false, error: "Póliza no encontrada" },
        { status: 404 }
      );
    }

    const poliza = polizaResult.rows[0];

    // Generar recibo de ajuste con el mismo no_recibo
    await query(
      `INSERT INTO recibos (
        poliza_id,
        no_recibo,
        estatus_pago,
        estatus_comision,
        prima_neta,
        prima_total,
        comision,
        f_desde,
        f_hasta,
        asesor_ajuste_type,
        motivo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        poliza_id,
        no_recibo, // Mismo número de recibo que el clickeado
        "PENDIENTE",
        "PENDIENTE",
        0, // Prima neta 0 para ajustes
        0, // Prima total 0 para ajustes
        parseFloat(monto_ajuste).toFixed(2),
        poliza.f_desde || new Date().toISOString().split("T")[0],
        poliza.f_hasta || new Date().toISOString().split("T")[0],
        tipo_ajuste,
        motivo || null,
      ]
    );

    return Response.json({
      ok: true,
      message: "Recibo de ajuste generado correctamente",
    });
  } catch (error) {
    console.error("Error generating ajuste recibo:", error);
    return Response.json(
      { ok: false, error: "Error al generar recibo de ajuste" },
      { status: 500 }
    );
  }
}
