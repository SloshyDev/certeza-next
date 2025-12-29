import { query, isDbConfigured } from "@/lib/db";

/**
 * PATCH /api/recibos/bulk-update
 * Actualiza el estatus de pago y/o comisión de múltiples recibos
 */
export async function PATCH(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    const {
      recibos_ids,
      estatus_pago,
      estatus_comision,
      f_pago,
      f_pago_comision,
      generar_descuento,
      comision_descontar,
      poliza_id,
    } = await req.json();

    if (!Array.isArray(recibos_ids) || recibos_ids.length === 0) {
      return Response.json(
        { error: "Se requiere al menos un ID de recibo" },
        { status: 400 }
      );
    }

    // Construir el SET dinámicamente
    const updates = [];
    const params = [recibos_ids];
    let paramIndex = 2;

    if (estatus_pago) {
      updates.push(`estatus_pago = $${paramIndex}`);
      params.push(estatus_pago);
      paramIndex++;
    }

    if (estatus_comision) {
      updates.push(`estatus_comision = $${paramIndex}`);
      params.push(estatus_comision);
      paramIndex++;
    }

    if (f_pago !== undefined) {
      updates.push(`f_pago = $${paramIndex}`);
      params.push(f_pago || null);
      paramIndex++;
    }

    if (f_pago_comision !== undefined) {
      updates.push(`f_pago_comision = $${paramIndex}`);
      params.push(f_pago_comision || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return Response.json(
        { error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE recibos 
       SET ${updates.join(", ")}
       WHERE id = ANY($1)
       RETURNING id`,
      params
    );

    let reciboDescuentoGenerado = false;

    // Si se debe generar descuento, crear un nuevo recibo con valor negativo
    if (generar_descuento && comision_descontar && poliza_id) {
      try {
        // Obtener el siguiente número de recibo
        const nextReciboResult = await query(
          `SELECT COALESCE(MAX(no_recibo), 0) + 1 as next_no
           FROM recibos 
           WHERE poliza_id = $1`,
          [poliza_id]
        );
        const nextRecibo = nextReciboResult.rows[0]?.next_no || 1;

        // Obtener datos de la póliza
        const polizaResult = await query(
          `SELECT prima_neta, prima_total FROM polizas WHERE id = $1`,
          [poliza_id]
        );

        if (polizaResult.rows.length > 0) {
          const poliza = polizaResult.rows[0];
          const primaNetaNegativa = -Math.abs(
            parseFloat(poliza.prima_neta || 0)
          );
          const primaTotalNegativa = -Math.abs(
            parseFloat(poliza.prima_total || 0)
          );
          const comisionNegativa = -Math.abs(comision_descontar);

          const today = new Date().toISOString().split("T")[0];

          // Insertar recibo de descuento
          await query(
            `INSERT INTO recibos (
              poliza_id, no_recibo, estatus_pago, estatus_comision,
              prima_neta, prima_total, comision,
              f_desde, f_hasta, f_pago, f_pago_comision
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              poliza_id,
              nextRecibo,
              "CANCELADO",
              "CANCELADO",
              primaNetaNegativa,
              primaTotalNegativa,
              comisionNegativa,
              today,
              today,
              f_pago || null,
              f_pago_comision || null,
            ]
          );

          reciboDescuentoGenerado = true;
        }
      } catch (descuentoError) {
        console.error("Error generando recibo de descuento:", descuentoError);
        // No fallar la operación principal, solo avisar
      }
    }

    return Response.json({
      ok: true,
      updated: result.rows.length,
      descuento_generado: reciboDescuentoGenerado,
      message: `${result.rows.length} recibos actualizados exitosamente${
        reciboDescuentoGenerado ? ". Se generó recibo de descuento" : ""
      }`,
    });
  } catch (error) {
    console.error("Error updating recibos:", error);
    return Response.json(
      { error: "Error al actualizar recibos" },
      { status: 500 }
    );
  }
}
