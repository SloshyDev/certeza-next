import { query, isDbConfigured } from "@/lib/db";

/**
 * POST /api/recibos/update-comisiones
 * Actualiza masivamente comisiones desde Excel exportado
 */
export async function POST(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { ok: false, error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    const { data } = await req.json();

    if (!Array.isArray(data) || data.length === 0) {
      return Response.json(
        { ok: false, error: "Datos inválidos o vacíos" },
        { status: 400 }
      );
    }

    const results = {
      actualizados: 0,
      errores: [],
    };

    // Procesar cada fila del Excel
    for (let i = 0; i < data.length; i++) {
      const rowNum = i + 2; // Excel row (header = 1)
      const row = data[i];

      try {
        const id_recibo = row.ID_RECIBO || row.id_recibo || row.ID_recibo;
        const estatus_comision = String(
          row.ESTATUS_COMISION || row.estatus_comision || ""
        ).trim();
        const f_pago_comision = String(
          row.F_PAGO_COMISION || row.f_pago_comision || ""
        ).trim();

        if (!id_recibo) {
          throw new Error("ID_RECIBO es requerido");
        }

        // Construir UPDATE dinámico
        const updates = [];
        const params = [id_recibo];
        let paramIndex = 2;

        if (estatus_comision) {
          // Validar que sea un estatus válido
          const estatusValidos = [
            "PENDIENTE",
            "PAGADO",
            "RETENIDO",
            "CANCELADO",
          ];
          if (!estatusValidos.includes(estatus_comision.toUpperCase())) {
            throw new Error(
              `Estatus inválido: ${estatus_comision}. Debe ser: ${estatusValidos.join(
                ", "
              )}`
            );
          }
          updates.push(`estatus_comision = $${paramIndex++}`);
          params.push(estatus_comision.toUpperCase());
        }

        if (f_pago_comision) {
          // Convertir fecha si es necesario
          let fechaFormateada = f_pago_comision;

          // Si está en formato DD/MM/YYYY
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(f_pago_comision)) {
            const [dia, mes, anio] = f_pago_comision.split("/");
            fechaFormateada = `${anio}-${mes}-${dia}`;
          }

          updates.push(`f_pago_comision = $${paramIndex++}`);
          params.push(fechaFormateada);
        }

        if (updates.length === 0) {
          continue; // Nada que actualizar en esta fila
        }

        // Ejecutar UPDATE
        await query(
          `UPDATE recibos 
           SET ${updates.join(", ")}, updated_at = NOW()
           WHERE id = $1`,
          params
        );

        results.actualizados++;
      } catch (error) {
        results.errores.push({
          fila: rowNum,
          error: error.message || "Error al procesar fila",
        });
      }
    }

    return Response.json({
      ok: true,
      ...results,
      mensaje: `${results.actualizados} recibos actualizados exitosamente`,
    });
  } catch (error) {
    console.error("Error in update-comisiones:", error);
    return Response.json(
      { ok: false, error: error.message || "Error del servidor" },
      { status: 500 }
    );
  }
}
