import { query, isDbConfigured } from "@/lib/db";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

/**
 * POST /api/polizas/apply-changes
 * Aplica los cambios seleccionados y genera archivo de descuentos si hay cancelaciones
 */
export async function POST(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { ok: false, error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { cambiosSeleccionados, nuevas, canceladas } = body;

    let actualizadas = 0;
    let creadas = 0;
    const errores = [];
    const ajustesAplicados = [];
    const polizasDuplicadas = []; // Para rastrear pólizas duplicadas y tratarlas como canceladas

    // Aplicar cambios seleccionados
    for (const cambio of cambiosSeleccionados) {
      try {
        // Obtener datos actuales de la póliza para detectar cambios
        const polizaActualResult = await query(
          `SELECT p.*, 
                  (SELECT SUM(CASE WHEN r.estatus_comision = 'PAGADO' THEN r.comision ELSE 0 END)
                   FROM recibos r WHERE r.poliza_id = p.id) as comision_pagada_total
           FROM polizas p 
           WHERE p.id = $1`,
          [cambio.id]
        );

        if (polizaActualResult.rows.length === 0) {
          throw new Error("Póliza no encontrada");
        }

        const polizaActual = polizaActualResult.rows[0];
        const datos = cambio.datosNuevos;
        const cambiarComision = cambio.cambiarComision !== false; // Por defecto true

        // Detectar cambio de asesor
        const cambioAsesor =
          datos.asesor_id &&
          parseInt(datos.asesor_id) !== parseInt(polizaActual.asesor_id);

        // Si hay cambio de asesor y el usuario confirmó duplicar, ejecutar duplicación
        if (cambioAsesor && cambio.duplicarPoliza === true) {
          console.log(
            `\n🔄 DUPLICANDO PÓLIZA por cambio de asesor: ${cambio.no_poliza}`
          );
          console.log(
            `   Asesor anterior: ${polizaActual.asesor_id} → Nuevo: ${datos.asesor_id}`
          );

          try {
            // 1. Renombrar la póliza actual agregando _1 al final y marcarla como DUPLICADA
            let nuevoNoPoliza = `${polizaActual.no_poliza}_1`;

            // Verificar si ya existe una póliza con ese nombre, si es así usar _2, _3, etc.
            let contador = 1;
            let existe = true;
            while (existe) {
              const checkResult = await query(
                `SELECT id FROM polizas WHERE no_poliza = $1`,
                [nuevoNoPoliza]
              );
              if (checkResult.rows.length === 0) {
                existe = false;
              } else {
                contador++;
                nuevoNoPoliza = `${polizaActual.no_poliza}_${contador}`;
              }
            }

            await query(
              `UPDATE polizas 
               SET no_poliza = $1, estatus = 'DUPLICADA'
               WHERE id = $2`,
              [nuevoNoPoliza, cambio.id]
            );

            console.log(
              `   ✅ Póliza antigua renombrada a: ${nuevoNoPoliza} con estatus DUPLICADA`
            );

            // 2. Buscar el ID del asesor usando la clave (datos.asesor_id es en realidad la clave)
            const claveAsesor = datos.asesor_id;
            const asesorResult = await query(
              `SELECT id, nombre, clave FROM asesor WHERE clave = $1`,
              [claveAsesor]
            );

            if (asesorResult.rows.length === 0) {
              throw new Error(
                `El asesor con clave "${claveAsesor}" no existe en la base de datos. Por favor verifica que el asesor esté registrado.`
              );
            }

            const nuevoAsesorId = asesorResult.rows[0].id;
            const nuevoAsesorNombre = asesorResult.rows[0].nombre;
            
            console.log(`   ✅ Asesor encontrado: ${nuevoAsesorNombre} (Clave: ${claveAsesor}, ID: ${nuevoAsesorId})`);

            // 3. Crear nueva póliza con el asesor nuevo usando el no_poliza original
            // Asegurarse de que el estatus no sea DUPLICADA (usar el del Excel o VIGENTE)
            const nuevoEstatus =
              datos.estatus && datos.estatus !== "DUPLICADA"
                ? datos.estatus
                : polizaActual.estatus !== "DUPLICADA"
                ? polizaActual.estatus
                : "VIGENTE";

            console.log(`   Creando nueva póliza con estatus: ${nuevoEstatus}`);

            const insertResult = await query(
              `INSERT INTO polizas (
              no_poliza, cia, forma_pago, f_desde, f_hasta,
              prima_total, prima_neta, estatus, folio,
              commission_percentage, quincena, asesor_id,
              contador_cambios
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0)
            RETURNING id`,
              [
                polizaActual.no_poliza, // Usar el número de póliza original
                datos.cia || polizaActual.cia,
                datos.forma_pago || polizaActual.forma_pago,
                datos.f_desde || polizaActual.f_desde,
                datos.f_hasta || polizaActual.f_hasta,
                datos.prima_total || polizaActual.prima_total,
                datos.prima_neta || polizaActual.prima_neta,
                nuevoEstatus, // Usar el estatus correcto
                datos.folio || polizaActual.folio,
                datos.commission_percentage ||
                  polizaActual.commission_percentage,
                datos.quincena || polizaActual.quincena,
                nuevoAsesorId, // Usar el ID real del asesor (no la clave)
              ]
            );

            const nuevaPolizaId = insertResult.rows[0].id;
            console.log(
              `   ✅ Nueva póliza creada con ID: ${nuevaPolizaId} para asesor ${nuevoAsesorNombre} (Clave: ${claveAsesor})`
            );

            // Agregar la póliza antigua (con _1) a la lista de duplicadas para generar el Excel de descuentos
            polizasDuplicadas.push({
              no_poliza: nuevoNoPoliza,
              cia: polizaActual.cia,
              prima_total: polizaActual.prima_total,
              prima_neta: polizaActual.prima_neta,
              comision: polizaActual.comision_pagada_total || 0,
              estatus: "DUPLICADA",
            });

            creadas++;
            actualizadas++; // También cuenta como actualización

            // Saltar al siguiente cambio, ya procesamos esta póliza
            continue;
          } catch (duplicacionError) {
            console.error(
              `   ❌ Error al duplicar póliza ${cambio.no_poliza}:`,
              duplicacionError
            );
            errores.push({
              no_poliza: cambio.no_poliza,
              error: `Error en duplicación: ${duplicacionError.message}`,
            });
            continue;
          }
        }

        // Si hay cambio de asesor pero NO se confirmó la duplicación, ignorar el cambio de asesor
        if (cambioAsesor && !cambio.duplicarPoliza) {
          console.log(
            `\n⚠️ Cambio de asesor detectado pero NO confirmado para: ${cambio.no_poliza}`
          );
          console.log(`   No se aplicará el cambio de asesor.`);
          // Remover asesor_id de los datos a actualizar
          delete datos.asesor_id;
        }

        // Detectar cambio de forma de pago
        const cambioFormaPago =
          datos.forma_pago && datos.forma_pago !== polizaActual.forma_pago;

        const updates = [];
        const params = [];
        let paramIndex = 1;

        console.log(`\nActualizando póliza ${cambio.no_poliza}:`, datos);

        if (datos.cia) {
          updates.push(`cia = $${paramIndex++}`);
          params.push(datos.cia);
        }

        if (datos.forma_pago) {
          updates.push(`forma_pago = $${paramIndex++}`);
          params.push(datos.forma_pago);
        }

        if (datos.f_desde) {
          updates.push(`f_desde = $${paramIndex++}`);
          params.push(datos.f_desde);
        }

        if (datos.f_hasta) {
          updates.push(`f_hasta = $${paramIndex++}`);
          params.push(datos.f_hasta);
        }

        if (datos.prima_total) {
          updates.push(`prima_total = $${paramIndex++}`);
          params.push(datos.prima_total);
        }

        if (datos.prima_neta) {
          updates.push(`prima_neta = $${paramIndex++}`);
          params.push(datos.prima_neta);
        }

        if (datos.estatus !== undefined && datos.estatus !== null) {
          updates.push(`estatus = $${paramIndex++}`);
          params.push(datos.estatus);
        }

        if (datos.folio) {
          updates.push(`folio = $${paramIndex++}`);
          params.push(datos.folio);
        }

        if (datos.commission_percentage !== undefined && cambiarComision) {
          updates.push(`commission_percentage = $${paramIndex++}`);
          params.push(datos.commission_percentage);
        }

        if (datos.quincena) {
          updates.push(`quincena = $${paramIndex++}`);
          params.push(datos.quincena);
        }

        // Agregar contador_cambios
        updates.push(`contador_cambios = COALESCE(contador_cambios, 0) + 1`);

        params.push(cambio.id);

        if (updates.length > 0) {
          const sql = `UPDATE polizas 
             SET ${updates.join(", ")}
             WHERE id = $${paramIndex}`;

          console.log(`\nEjecutando SQL para póliza ${cambio.no_poliza}:`);
          console.log(`SQL: ${sql}`);
          console.log(`Params:`, params);

          await query(sql, params);
          actualizadas++;

          // Aplicar corrección de forma de pago si cambió Y el usuario eligió aplicar ajuste
          if (cambioFormaPago && aplicarAjusteFormaPago) {
            // Obtener recibos pagados
            const recibosPagadosResult = await query(
              `SELECT r.*, 
                      ROW_NUMBER() OVER (ORDER BY r.no_recibo) as orden
               FROM recibos r 
               WHERE r.poliza_id = $1 
                 AND (r.estatus_pago = 'PAGADO' OR r.estatus_comision = 'PAGADO')
               ORDER BY r.no_recibo`,
              [cambio.id]
            );

            const recibosPagados = recibosPagadosResult.rows;
            const numRecibosPagados = recibosPagados.length;

            if (numRecibosPagados > 0) {
              // Determinar cuántos recibos debería tener en la nueva forma de pago
              const formaPagoUpper = datos.forma_pago.toUpperCase();
              let numRecibosNuevos = 1;
              if (
                formaPagoUpper === "DOM" ||
                formaPagoUpper === "DXN" ||
                formaPagoUpper === "MENSUAL" ||
                formaPagoUpper === "MENS"
              ) {
                numRecibosNuevos = 12;
              } else if (
                formaPagoUpper === "SEMESTRAL" ||
                formaPagoUpper === "SEM"
              ) {
                numRecibosNuevos = 2;
              } else if (
                formaPagoUpper === "TRIMESTRAL" ||
                formaPagoUpper === "TRIM"
              ) {
                numRecibosNuevos = 4;
              } else if (formaPagoUpper === "ANUAL") {
                numRecibosNuevos = 1;
              }

              // Buscar nueva comisión porcentaje
              let nuevaComisionPct = parseFloat(
                datos.commission_percentage ||
                  polizaActual.commission_percentage ||
                  0
              );

              if (
                polizaActual.asesor_id &&
                polizaActual.cia &&
                datos.forma_pago
              ) {
                const comisionEspecificaResult = await query(
                  `SELECT acs.commission_percentage
                   FROM advisor_commission_specifics acs
                   JOIN advisor_commissions ac ON ac.id = acs.advisor_commission_id
                   JOIN companies c ON c.id = ac.company_id
                   WHERE ac.advisor_id = $1
                     AND c.name ILIKE $2
                     AND acs.payment_method = $3
                   LIMIT 1`,
                  [polizaActual.asesor_id, polizaActual.cia, datos.forma_pago]
                );

                if (comisionEspecificaResult.rows.length > 0) {
                  nuevaComisionPct = parseFloat(
                    comisionEspecificaResult.rows[0].commission_percentage || 0
                  );
                }
              }

              // Calcular comisión correcta por recibo según nueva forma de pago
              const primaNeta = parseFloat(
                datos.prima_neta || polizaActual.prima_neta || 0
              );
              const comisionTotalCorrecta =
                (primaNeta * nuevaComisionPct) / 100;
              const comisionPorReciboNuevo =
                comisionTotalCorrecta / numRecibosNuevos;

              // Calcular comisión total ya pagada
              const comisionTotalPagada = recibosPagados.reduce(
                (sum, r) => sum + parseFloat(r.comision || 0),
                0
              );

              // Calcular lo que debió pagar con la nueva forma de pago
              const comisionDebida = comisionPorReciboNuevo * numRecibosPagados;
              const diferenciaCalculada = comisionDebida - comisionTotalPagada;

              // Usar monto manual si el usuario lo especificó, sino usar el calculado
              const diferencia =
                cambio.montoAjusteManual !== undefined
                  ? parseFloat(cambio.montoAjusteManual)
                  : diferenciaCalculada;

              // SIEMPRE generar ajuste si hay diferencia (ya sea positiva o negativa)
              // El usuario puede ajustar manualmente el monto en el modal
              if (Math.abs(diferencia) > 0.01) {
                // Tolerancia de $0.01 para redondeo
                // Generar recibo de ajuste con el número del último recibo pagado
                const ultimoReciboPagado =
                  recibosPagados[numRecibosPagados - 1];
                const today = new Date().toISOString().split("T")[0];

                const esAjusteManual = cambio.montoAjusteManual !== undefined;
                const motivoBase = `Ajuste por cambio de forma de pago ${
                  polizaActual.forma_pago
                } → ${
                  datos.forma_pago
                }. Pagó ${numRecibosPagados} recibos ($${comisionTotalPagada.toFixed(
                  2
                )}), debió pagar $${comisionDebida.toFixed(2)}.`;
                const motivoFinal = esAjusteManual
                  ? `${motivoBase} Ajuste manual: $${diferencia.toFixed(
                      2
                    )}. Nueva comisión: ${nuevaComisionPct}%`
                  : `${motivoBase} Diferencia: $${diferencia.toFixed(
                      2
                    )}. Nueva comisión: ${nuevaComisionPct}%`;

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
                    motivo
                  ) VALUES ($1, $2, $3, $4, 0, 0, $5, $6, $6, $7)`,
                  [
                    cambio.id,
                    ultimoReciboPagado.no_recibo, // Mismo número de recibo
                    "AJUSTE",
                    diferencia > 0 ? "PENDIENTE" : "CANCELADO",
                    diferencia,
                    today,
                    motivoFinal,
                  ]
                );

                ajustesAplicados.push({
                  tipo: "forma_pago",
                  poliza: cambio.no_poliza,
                  forma_anterior: polizaActual.forma_pago,
                  nueva_forma_pago: datos.forma_pago,
                  recibos_pagados: numRecibosPagados,
                  recibos_debidos: numRecibosNuevos,
                  comision_pagada: comisionTotalPagada,
                  comision_debida: comisionDebida,
                  diferencia: diferencia,
                  nueva_comision_porcentaje: nuevaComisionPct,
                  no_recibo_ajuste: ultimoReciboPagado.no_recibo,
                });
              }

              // Eliminar recibos pendientes (excepto PAGADO y AJUSTE)
              await query(
                `DELETE FROM recibos 
                 WHERE poliza_id = $1 
                   AND estatus_pago NOT IN ('PAGADO', 'AJUSTE')
                   AND estatus_comision != 'PAGADO'`,
                [cambio.id]
              );

              // Regenerar recibos según nueva forma de pago
              // Solo generar los recibos que NO estén ya pagados
              const primaTotal = parseFloat(
                datos.prima_total || polizaActual.prima_total || 0
              );
              const primaNetaPorRecibo = primaNeta / numRecibosNuevos;
              const primaTotalPorRecibo = primaTotal / numRecibosNuevos;

              console.log(
                `\nRegenerando recibos para póliza ${cambio.no_poliza}:`
              );
              console.log(`- Total recibos nueva forma: ${numRecibosNuevos}`);
              console.log(`- Recibos ya pagados: ${numRecibosPagados}`);
              console.log(
                `- Recibos a generar: ${numRecibosNuevos - numRecibosPagados}`
              );

              for (let i = 1; i <= numRecibosNuevos; i++) {
                // Verificar si el recibo ya existe (PAGADO o cualquier otro)
                const existingRecibo = await query(
                  `SELECT id, estatus_pago FROM recibos 
                   WHERE poliza_id = $1 AND no_recibo = $2 AND estatus_pago != 'AJUSTE'`,
                  [cambio.id, i]
                );

                // Solo crear si NO existe o si no está PAGADO
                if (existingRecibo.rows.length === 0) {
                  // Calcular fechas
                  const fDesde = new Date(
                    datos.f_desde || polizaActual.f_desde
                  );
                  const mesesPorRecibo = 12 / numRecibosNuevos;
                  const reciboFDesde = new Date(fDesde);
                  reciboFDesde.setMonth(
                    fDesde.getMonth() + (i - 1) * mesesPorRecibo
                  );

                  const reciboFHasta = new Date(reciboFDesde);
                  reciboFHasta.setMonth(
                    reciboFDesde.getMonth() + mesesPorRecibo
                  );
                  reciboFHasta.setDate(reciboFHasta.getDate() - 1);

                  console.log(`  Creando recibo #${i} (PENDIENTE)`);

                  // Crear nuevo recibo
                  await query(
                    `INSERT INTO recibos (
                      poliza_id, no_recibo, estatus_pago, estatus_comision,
                      prima_neta, prima_total, comision, f_desde, f_hasta
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                      cambio.id,
                      i,
                      "PENDIENTE",
                      "PENDIENTE",
                      primaNetaPorRecibo.toFixed(2),
                      primaTotalPorRecibo.toFixed(2),
                      comisionPorReciboNuevo.toFixed(2),
                      reciboFDesde.toISOString().split("T")[0],
                      reciboFHasta.toISOString().split("T")[0],
                    ]
                  );
                } else {
                  console.log(
                    `  Recibo #${i} ya existe (${existingRecibo.rows[0].estatus_pago}) - no se modifica`
                  );
                }
              }
            }
          }
        }
      } catch (error) {
        errores.push({
          no_poliza: cambio.no_poliza,
          error: error.message,
        });
      }
    }

    // Crear pólizas nuevas (si las hay)
    // ... código para crear nuevas pólizas ...

    // Generar archivo Excel de descuentos si hay canceladas O pólizas duplicadas
    let descuentosExcel = null;
    const todasLasCanceladas = [
      ...(canceladas || []),
      ...polizasDuplicadas.map((p) => ({
        no_poliza: p.no_poliza,
        datosNuevos: {
          cia: p.cia,
          estatus: p.estatus,
        },
        descuento: {
          prima_total: p.prima_total,
          prima_neta: p.prima_neta,
          comision: p.comision,
        },
      })),
    ];

    if (todasLasCanceladas.length > 0) {
      const workbook = XLSX.utils.book_new();

      const data = [
        ["NO POLIZA", "CIA", "PRIMA TOTAL", "PRIMA NETA", "COMISION", "MOTIVO"],
      ];

      for (const cancelada of todasLasCanceladas) {
        data.push([
          cancelada.no_poliza,
          cancelada.datosNuevos.cia || "",
          -Math.abs(cancelada.descuento.prima_total),
          -Math.abs(cancelada.descuento.prima_neta),
          -Math.abs(cancelada.descuento.comision),
          cancelada.datosNuevos.estatus,
        ]);
      }

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Descuentos");

      // Convertir a buffer
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      // Convertir a base64 para enviar al cliente
      descuentosExcel = excelBuffer.toString("base64");
    }

    return Response.json({
      ok: true,
      actualizadas,
      creadas,
      errores,
      descuentosExcel,
      totalCanceladas: todasLasCanceladas.length,
      ajustesAplicados,
      totalAjustes: ajustesAplicados.length,
    });
  } catch (error) {
    console.error("Error applying changes:", error);
    return Response.json(
      { ok: false, error: "Error al aplicar cambios" },
      { status: 500 }
    );
  }
}
