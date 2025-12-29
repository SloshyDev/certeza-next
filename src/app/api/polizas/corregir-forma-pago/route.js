import { query, isDbConfigured } from "@/lib/db";

/**
 * POST /api/polizas/corregir-forma-pago
 * Corrige la forma de pago de una póliza, generando ajustes y regenerando recibos
 */
export async function POST(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { ok: false, error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    const {
      poliza_id,
      nueva_forma_pago,
      comision_ajuste, // Comisión a ajustar por diferencia en pagos ya realizados
    } = await req.json();

    if (!poliza_id || !nueva_forma_pago) {
      return Response.json(
        { ok: false, error: "Se requiere poliza_id y nueva_forma_pago" },
        { status: 400 }
      );
    }

    // Obtener datos de la póliza actual
    const polizaResult = await query(
      `SELECT p.*
       FROM polizas p
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
    const formaAnterior = poliza.forma_pago;

    // Buscar comisión específica para la nueva forma de pago
    let nuevaComisionPorcentaje = parseFloat(poliza.commission_percentage || 0);

    if (poliza.asesor_id && poliza.cia) {
      const comisionEspecificaResult = await query(
        `SELECT acs.commission_percentage
         FROM advisor_commission_specifics acs
         JOIN advisor_commissions ac ON ac.id = acs.advisor_commission_id
         JOIN companies c ON c.id = ac.company_id
         WHERE ac.advisor_id = $1
           AND c.name ILIKE $2
           AND acs.payment_method = $3
         LIMIT 1`,
        [poliza.asesor_id, poliza.cia, nueva_forma_pago]
      );

      if (comisionEspecificaResult.rows.length > 0) {
        nuevaComisionPorcentaje = parseFloat(
          comisionEspecificaResult.rows[0].commission_percentage || 0
        );
      }
    }

    // 1. Verificar si hay recibos con pagos/comisiones pagadas
    const recibosPagadosResult = await query(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN estatus_comision = 'PAGADO' THEN comision ELSE 0 END) as comision_pagada_total
       FROM recibos 
       WHERE poliza_id = $1 
         AND (estatus_pago = 'PAGADO' OR estatus_comision = 'PAGADO')`,
      [poliza_id]
    );

    const hayPagos = parseInt(recibosPagadosResult.rows[0]?.total || 0) > 0;
    const comisionPagadaTotal = parseFloat(
      recibosPagadosResult.rows[0]?.comision_pagada_total || 0
    );

    let reciboAjusteId = null;

    // 2. Si hay pagos y se especificó un ajuste, generar recibo de ajuste
    if (hayPagos && comision_ajuste && comision_ajuste !== 0) {
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
        ) VALUES (NULL, NULL, 'AJUSTE', $1, 0, 0, $2, $3, $3, $4, $5)
        RETURNING id`,
        [
          comision_ajuste > 0 ? "PENDIENTE" : "CANCELADO",
          comision_ajuste,
          today,
          `Ajuste por corrección de forma de pago - Póliza ${
            poliza.no_poliza
          } - Cambio de ${formaAnterior} a ${nueva_forma_pago}. Comisión pagada anterior: $${comisionPagadaTotal.toFixed(
            2
          )}`,
          poliza.asesor_id,
        ]
      );

      reciboAjusteId = reciboAjusteResult.rows[0].id;
    }

    // 3. Determinar nuevo número de recibos según forma de pago
    let nuevoNumRecibos = 12;
    if (nueva_forma_pago === "CONT") {
      nuevoNumRecibos = 1;
    } else if (nueva_forma_pago === "ANUAL") {
      nuevoNumRecibos = 1;
    } else if (nueva_forma_pago === "SEMESTRAL") {
      nuevoNumRecibos = 2;
    } else if (nueva_forma_pago === "TRIMESTRAL") {
      nuevoNumRecibos = 4;
    }

    // 4. Eliminar recibos pendientes (no pagados)
    const recibosEliminados = await query(
      `DELETE FROM recibos 
       WHERE poliza_id = $1 
         AND estatus_pago != 'PAGADO' 
         AND estatus_comision != 'PAGADO'
         AND comision > 0
       RETURNING id`,
      [poliza_id]
    );

    // 5. Actualizar forma_pago en la póliza
    await query(
      `UPDATE polizas 
       SET forma_pago = $1,
           commission_percentage = $2,
           f_actualizacion = NOW(),
           contador_cambios = COALESCE(contador_cambios, 0) + 1
       WHERE id = $3`,
      [nueva_forma_pago, nuevaComisionPorcentaje, poliza_id]
    );

    // 6. Registrar en historial
    await query(
      `INSERT INTO polizas_history (
        poliza_id, no_poliza, campo_modificado, 
        valor_anterior, valor_nuevo, usuario, operacion
      ) VALUES ($1, $2, 'forma_pago', $3, $4, 'SYSTEM', 'UPDATE')`,
      [poliza_id, poliza.no_poliza, formaAnterior, nueva_forma_pago]
    );

    // 7. Regenerar recibos con la nueva forma de pago
    const primaNeta = parseFloat(poliza.prima_neta || 0);
    const primaTotal = parseFloat(poliza.prima_total || 0);

    const primaNetaPorRecibo = primaNeta / nuevoNumRecibos;
    const primaTotalPorRecibo = primaTotal / nuevoNumRecibos;
    const comisionPorRecibo =
      (primaNeta * nuevaComisionPorcentaje) / 100 / nuevoNumRecibos;

    let recibosCreados = 0;

    for (let i = 1; i <= nuevoNumRecibos; i++) {
      // Verificar si el recibo ya existe (puede estar pagado)
      const existingRecibo = await query(
        `SELECT id FROM recibos WHERE poliza_id = $1 AND no_recibo = $2`,
        [poliza_id, i]
      );

      if (existingRecibo.rows.length === 0) {
        // Calcular fechas
        const fDesde = new Date(poliza.f_desde);
        const mesesPorRecibo = 12 / nuevoNumRecibos;
        const reciboFDesde = new Date(fDesde);
        reciboFDesde.setMonth(fDesde.getMonth() + (i - 1) * mesesPorRecibo);

        const reciboFHasta = new Date(reciboFDesde);
        reciboFHasta.setMonth(reciboFDesde.getMonth() + mesesPorRecibo);
        reciboFHasta.setDate(reciboFHasta.getDate() - 1);

        // Crear nuevo recibo
        await query(
          `INSERT INTO recibos (
            poliza_id, no_recibo, estatus_pago, estatus_comision,
            prima_neta, prima_total, comision, f_desde, f_hasta
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            poliza_id,
            i,
            "PENDIENTE",
            "PENDIENTE",
            primaNetaPorRecibo.toFixed(2),
            primaTotalPorRecibo.toFixed(2),
            comisionPorRecibo.toFixed(2),
            reciboFDesde.toISOString().split("T")[0],
            reciboFHasta.toISOString().split("T")[0],
          ]
        );
        recibosCreados++;
      }
    }

    return Response.json({
      ok: true,
      message: "Forma de pago corregida exitosamente",
      forma_anterior: formaAnterior,
      nueva_forma_pago: nueva_forma_pago,
      nuevo_num_recibos: nuevoNumRecibos,
      recibo_ajuste_id: reciboAjusteId,
      comision_ajustada: comision_ajuste || 0,
      nueva_comision_porcentaje: nuevaComisionPorcentaje,
      recibos_eliminados: recibosEliminados.rows.length,
      recibos_creados: recibosCreados,
      habia_pagos: hayPagos,
      comision_pagada_anterior: comisionPagadaTotal,
    });
  } catch (error) {
    console.error("Error corrigiendo forma de pago:", error);
    return Response.json(
      { ok: false, error: "Error al corregir forma de pago" },
      { status: 500 }
    );
  }
}
