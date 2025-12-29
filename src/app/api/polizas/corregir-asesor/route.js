import { query, isDbConfigured } from "@/lib/db";

/**
 * POST /api/polizas/corregir-asesor
 * Corrige el asesor de una póliza, generando recibos de ajuste para comisiones pagadas
 */
export async function POST(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { ok: false, error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    const { poliza_id, nuevo_asesor_id, comision_descontar_asesor_anterior } =
      await req.json();

    if (!poliza_id || !nuevo_asesor_id) {
      return Response.json(
        { ok: false, error: "Se requiere poliza_id y nuevo_asesor_id" },
        { status: 400 }
      );
    }

    // Obtener datos de la póliza actual
    const polizaResult = await query(
      `SELECT p.*, a.nombre as asesor_anterior_nombre
       FROM polizas p
       LEFT JOIN asesor a ON a.id = p.asesor_id
       WHERE p.id = $1`,
      [poliza_id]
    );

    if (polizaResult.rows.length === 0) {
      return Response.json(
        { ok: false, error: "Póliza no encontrada" },
        { status: 404 }
      );
    }

    const poliza = polizaResult.rows[0];
    const asesorAnteriorId = poliza.asesor_id;

    // Obtener datos del nuevo asesor
    const nuevoAsesorResult = await query(
      `SELECT nombre FROM asesor WHERE id = $1`,
      [nuevo_asesor_id]
    );

    if (nuevoAsesorResult.rows.length === 0) {
      return Response.json(
        { ok: false, error: "Nuevo asesor no encontrado" },
        { status: 404 }
      );
    }

    const nuevoAsesorNombre = nuevoAsesorResult.rows[0].nombre;

    // 1. Generar recibo de ajuste (descuento) para asesor anterior si hay comisión a descontar
    let reciboAjusteId = null;
    if (
      comision_descontar_asesor_anterior &&
      comision_descontar_asesor_anterior > 0
    ) {
      const today = new Date().toISOString().split("T")[0];

      const reciboAjusteResult = await query(
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
          motivo,
          asesor_ajuste_id
        ) VALUES (NULL, NULL, 'AJUSTE', 'CANCELADO', 0, 0, $1, $2, $2, $3, $4)
        RETURNING id`,
        [
          -Math.abs(comision_descontar_asesor_anterior),
          today,
          `Ajuste por corrección de asesor - Póliza ${
            poliza.no_poliza
          } - Descuento a ${
            poliza.asesor_anterior_nombre || "Asesor ID " + asesorAnteriorId
          }`,
          asesorAnteriorId,
        ]
      );

      reciboAjusteId = reciboAjusteResult.rows[0].id;
    }

    // 2. Buscar comisión específica del nuevo asesor
    let nuevaComisionPorcentaje = parseFloat(poliza.commission_percentage || 0);

    if (poliza.forma_pago && poliza.cia) {
      const comisionEspecificaResult = await query(
        `SELECT acs.commission_percentage
         FROM advisor_commission_specifics acs
         JOIN advisor_commissions ac ON ac.id = acs.advisor_commission_id
         JOIN companies c ON c.id = ac.company_id
         WHERE ac.advisor_id = $1
           AND c.name ILIKE $2
           AND acs.payment_method = $3
         LIMIT 1`,
        [nuevo_asesor_id, poliza.cia, poliza.forma_pago]
      );

      if (comisionEspecificaResult.rows.length > 0) {
        nuevaComisionPorcentaje = parseFloat(
          comisionEspecificaResult.rows[0].commission_percentage || 0
        );
      }
    }

    // 3. Actualizar asesor_id en la póliza
    await query(
      `UPDATE polizas 
       SET asesor_id = $1, 
           commission_percentage = $2,
           f_actualizacion = NOW(),
           contador_cambios = COALESCE(contador_cambios, 0) + 1
       WHERE id = $3`,
      [nuevo_asesor_id, nuevaComisionPorcentaje, poliza_id]
    );

    // 4. Registrar en historial de póliza
    await query(
      `INSERT INTO polizas_history (
        poliza_id, no_poliza, campo_modificado, 
        valor_anterior, valor_nuevo, usuario, operacion
      ) VALUES ($1, $2, 'asesor_id', $3, $4, 'SYSTEM', 'UPDATE')`,
      [
        poliza_id,
        poliza.no_poliza,
        asesorAnteriorId?.toString() || "",
        nuevo_asesor_id.toString(),
      ]
    );

    // 5. Recalcular comisiones en recibos existentes (solo los positivos no pagados)
    const primaNeta = parseFloat(poliza.prima_neta || 0);

    // Contar recibos totales para calcular comisión por recibo
    const recibosCountResult = await query(
      `SELECT COUNT(*) as total FROM recibos 
       WHERE poliza_id = $1 AND comision > 0`,
      [poliza_id]
    );

    const totalRecibos = parseInt(recibosCountResult.rows[0]?.total || 1);
    const nuevaComisionPorRecibo =
      (primaNeta * nuevaComisionPorcentaje) / 100 / totalRecibos;

    const recibosActualizados = await query(
      `UPDATE recibos 
       SET comision = $1
       WHERE poliza_id = $2 
         AND comision > 0
         AND estatus_comision IN ('PENDIENTE', 'RETENIDO')
       RETURNING id`,
      [nuevaComisionPorRecibo.toFixed(2), poliza_id]
    );

    return Response.json({
      ok: true,
      message: "Asesor corregido exitosamente",
      asesor_anterior:
        poliza.asesor_anterior_nombre || `ID ${asesorAnteriorId}`,
      nuevo_asesor: nuevoAsesorNombre,
      recibo_ajuste_id: reciboAjusteId,
      comision_descontada: comision_descontar_asesor_anterior || 0,
      nueva_comision_porcentaje: nuevaComisionPorcentaje,
      recibos_actualizados: recibosActualizados.rows.length,
    });
  } catch (error) {
    console.error("Error corrigiendo asesor:", error);
    return Response.json(
      { ok: false, error: "Error al corregir asesor" },
      { status: 500 }
    );
  }
}
