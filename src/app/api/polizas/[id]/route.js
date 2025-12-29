import { query, isDbConfigured } from "@/lib/db";

/**
 * PATCH /api/polizas/[id]
 * Actualiza una póliza por ID
 */
export async function PATCH(req, context) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { ok: false, error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    // En Next.js 15+, params puede ser una promesa
    const params = await context.params;
    const { id } = params;
    const body = await req.json();

    // Construir SET dinámicamente
    const updates = [];
    const queryParams = [];
    let paramIndex = 1;

    if (body.commission_percentage !== undefined) {
      updates.push(`commission_percentage = $${paramIndex}`);
      queryParams.push(parseFloat(body.commission_percentage));
      paramIndex++;
    }

    if (body.prima_total !== undefined) {
      updates.push(`prima_total = $${paramIndex}`);
      queryParams.push(parseFloat(body.prima_total));
      paramIndex++;
    }

    if (body.prima_neta !== undefined) {
      updates.push(`prima_neta = $${paramIndex}`);
      queryParams.push(parseFloat(body.prima_neta));
      paramIndex++;
    }

    if (body.estatus !== undefined) {
      updates.push(`estatus = $${paramIndex}`);
      queryParams.push(body.estatus);
      paramIndex++;
    }

    if (body.forma_pago !== undefined) {
      updates.push(`forma_pago = $${paramIndex}`);
      queryParams.push(body.forma_pago);
      paramIndex++;
    }

    if (updates.length === 0) {
      return Response.json(
        { ok: false, error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    // Agregar ID al final de los parámetros
    queryParams.push(id);

    const result = await query(
      `UPDATE polizas 
       SET ${updates.join(", ")}, f_actualizacion = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      queryParams
    );

    if (result.rows.length === 0) {
      return Response.json(
        { ok: false, error: "Póliza no encontrada" },
        { status: 404 }
      );
    }

    return Response.json({
      ok: true,
      poliza: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating poliza:", error);
    return Response.json(
      { ok: false, error: "Error al actualizar póliza" },
      { status: 500 }
    );
  }
}
