import { query, isDbConfigured } from "@/lib/db";

/**
 * POST /api/recibos/upload
 * Procesa un Excel de recibos y crea registros con fechas calculadas automáticamente
 * Cada recibo se genera sumando 30 días desde f_desde de la póliza
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
      creados: 0,
      errores: [],
    };

    // Detectar tipo de Excel (plantilla o descuentos)
    const firstRow = data[0] || {};
    const isDescuentosExcel =
      ("NO POLIZA" in firstRow || "NO_POLIZA" in firstRow) &&
      ("COMISION" in firstRow || "comision" in firstRow) &&
      ("MOTIVO" in firstRow || "motivo" in firstRow);

    console.log(
      "Tipo de Excel detectado:",
      isDescuentosExcel ? "Descuentos" : "Plantilla"
    );
    console.log("Primera fila:", firstRow);

    // Fase 1: Validar y normalizar datos según el tipo de Excel
    const validRows = [];

    if (isDescuentosExcel) {
      // Formato de descuentos (de cancelaciones)
      for (let i = 0; i < data.length; i++) {
        const rowNum = i + 2;
        const row = data[i];

        try {
          const no_poliza = String(
            row["NO POLIZA"] || row["NO_POLIZA"] || row["no_poliza"] || ""
          ).trim();
          const prima_total = parseFloat(
            row["PRIMA TOTAL"] || row["PRIMA_TOTAL"] || row["prima_total"] || 0
          );
          const prima_neta = parseFloat(
            row["PRIMA NETA"] || row["PRIMA_NETA"] || row["prima_neta"] || 0
          );
          const comision = parseFloat(row["COMISION"] || row["comision"] || 0);

          if (!no_poliza) {
            throw new Error("no_poliza es requerido");
          }

          validRows.push({
            rowNum,
            no_poliza,
            isDescuento: true,
            prima_total,
            prima_neta,
            comision,
          });
        } catch (error) {
          results.errores.push({
            fila: rowNum,
            error: error.message || "Error al validar datos",
          });
        }
      }
    } else {
      // Formato de plantilla (original)
      for (let i = 0; i < data.length; i++) {
        const rowNum = i + 2;
        const row = data[i];

        try {
          const no_poliza = String(row.no_poliza || "").trim();
          const num_recibos = parseInt(row.num_recibos);
          const comision_porcentaje = parseFloat(row.comision_porcentaje || 0);

          if (!no_poliza) {
            throw new Error("no_poliza es requerido");
          }

          if (!num_recibos || num_recibos < 1) {
            throw new Error("num_recibos debe ser mayor a 0");
          }

          validRows.push({
            rowNum,
            no_poliza,
            isDescuento: false,
            num_recibos,
            comision_porcentaje,
          });
        } catch (error) {
          results.errores.push({
            fila: rowNum,
            error: error.message || "Error al validar datos",
          });
        }
      }
    }

    if (validRows.length === 0) {
      return Response.json({
        ok: false,
        error: "No hay filas válidas para procesar",
        ...results,
      });
    }

    // Fase 2: Obtener pólizas con sus datos necesarios
    const uniquePolizas = [...new Set(validRows.map((r) => r.no_poliza))].map(
      (p) => String(p)
    );

    const polizasResult = await query(
      `SELECT 
        p.id, 
        p.no_poliza, 
        p.f_desde,
        p.forma_pago,
        p.prima_neta,
        p.prima_total,
        p.commission_percentage
      FROM polizas p 
      WHERE p.no_poliza::text = ANY($1::text[])`,
      [uniquePolizas]
    );

    const polizasMap = new Map();
    polizasResult.rows.forEach((p) => {
      polizasMap.set(String(p.no_poliza), p);
    });

    // Fase 3: Generar o crear recibos según el tipo
    const recibosToInsert = [];

    if (isDescuentosExcel) {
      // Procesar descuentos - crear un solo recibo con valores negativos
      for (const row of validRows) {
        const poliza = polizasMap.get(String(row.no_poliza));

        if (!poliza) {
          results.errores.push({
            fila: row.rowNum,
            error: `Póliza ${row.no_poliza} no existe en la base de datos`,
          });
          continue;
        }

        // Obtener el siguiente número de recibo después del último
        const nextReciboResult = await query(
          `SELECT COALESCE(MAX(no_recibo), 0) + 1 as next_no
           FROM recibos 
           WHERE poliza_id = $1`,
          [poliza.id]
        );
        const nextRecibo = nextReciboResult.rows[0]?.next_no || 1;

        // Usar la fecha actual
        const today = new Date().toISOString().split("T")[0];

        recibosToInsert.push({
          poliza_id: poliza.id,
          no_recibo: nextRecibo,
          estatus_pago: "CANCELADO",
          estatus_comision: "CANCELADO",
          prima_neta: row.prima_neta,
          prima_total: row.prima_total,
          comision: row.comision,
          f_desde: today,
          f_hasta: today,
          f_pago: null,
          no_aviso: null,
        });
      }
    } else {
      // Procesar plantilla - generar múltiples recibos
      for (const row of validRows) {
        const poliza = polizasMap.get(String(row.no_poliza));

        if (!poliza) {
          results.errores.push({
            fila: row.rowNum,
            error: `Póliza ${row.no_poliza} no existe en la base de datos`,
          });
          continue;
        }

        if (!poliza.f_desde) {
          results.errores.push({
            fila: row.rowNum,
            error: `Póliza ${row.no_poliza} no tiene fecha de inicio (f_desde)`,
          });
          continue;
        }

        // Usar el número de recibos de la plantilla
        const num_recibos = row.num_recibos;

        // Calcular montos por recibo usando datos de la póliza y la plantilla
        const primaNeta = parseFloat(poliza.prima_neta || 0);
        const primaTotal = parseFloat(poliza.prima_total || 0);
        const commissionRate = row.comision_porcentaje / 100;
        const comisionTotal = primaNeta * commissionRate;

        const primaNetaPorRecibo = primaNeta / num_recibos;
        const primaTotalPorRecibo = primaTotal / num_recibos;
        const comisionPorRecibo = comisionTotal / num_recibos;

        // Generar recibos con fechas calculadas (cada 30 días)
        const inicioVigencia = new Date(poliza.f_desde);

        for (let i = 0; i < num_recibos; i++) {
          const no_recibo = i + 1;

          // Calcular f_desde y f_hasta sumando 30 días por cada recibo
          const f_desde_recibo = new Date(inicioVigencia);
          f_desde_recibo.setDate(f_desde_recibo.getDate() + i * 30);

          const f_hasta_recibo = new Date(f_desde_recibo);
          f_hasta_recibo.setDate(f_hasta_recibo.getDate() + 29); // 30 días de cobertura

          recibosToInsert.push({
            poliza_id: poliza.id,
            no_recibo,
            estatus_pago: "PENDIENTE",
            estatus_comision: "PENDIENTE",
            prima_neta: primaNetaPorRecibo.toFixed(2),
            prima_total: primaTotalPorRecibo.toFixed(2),
            comision: comisionPorRecibo.toFixed(2),
            f_desde: f_desde_recibo.toISOString().split("T")[0],
            f_hasta: f_hasta_recibo.toISOString().split("T")[0],
            f_pago: null,
            no_aviso: null,
          });
        }
      }
    }

    if (recibosToInsert.length === 0) {
      return Response.json({
        ok: false,
        error: "No se generaron recibos válidos",
        ...results,
      });
    }

    // Fase 4: Para descuentos, insertar directamente. Para plantilla, verificar existentes
    let newRecibos = recibosToInsert;

    if (!isDescuentosExcel) {
      // Solo verificar duplicados para plantilla, no para descuentos
      const polizasIds = [...new Set(recibosToInsert.map((r) => r.poliza_id))];
      const existingRecibosResult = await query(
        `SELECT poliza_id, no_recibo FROM recibos WHERE poliza_id = ANY($1)`,
        [polizasIds]
      );

      const existingRecibosSet = new Set();
      existingRecibosResult.rows.forEach((r) => {
        existingRecibosSet.add(`${r.poliza_id}-${r.no_recibo}`);
      });

      // Filtrar solo los recibos que no existen
      newRecibos = recibosToInsert.filter(
        (r) => !existingRecibosSet.has(`${r.poliza_id}-${r.no_recibo}`)
      );

      if (newRecibos.length === 0) {
        return Response.json({
          ok: false,
          error:
            "Todos los recibos ya existen en la base de datos. No se crearon nuevos registros.",
          ...results,
        });
      }
    }

    // Fase 5: Insertar recibos en batch
    const insertValues = newRecibos
      .map(
        (r, idx) =>
          `($${idx * 11 + 1}, $${idx * 11 + 2}, $${idx * 11 + 3}, $${
            idx * 11 + 4
          }, $${idx * 11 + 5}, $${idx * 11 + 6}, $${idx * 11 + 7}, $${
            idx * 11 + 8
          }, $${idx * 11 + 9}, $${idx * 11 + 10}, $${idx * 11 + 11})`
      )
      .join(",");

    const insertParams = newRecibos.flatMap((r) => [
      r.poliza_id,
      r.no_recibo,
      r.estatus_pago,
      r.estatus_comision,
      r.prima_neta,
      r.prima_total,
      r.comision,
      r.f_desde,
      r.f_hasta,
      r.f_pago,
      r.no_aviso,
    ]);

    await query(
      `INSERT INTO recibos 
        (poliza_id, no_recibo, estatus_pago, estatus_comision, prima_neta, prima_total, comision, f_desde, f_hasta, f_pago, no_aviso)
      VALUES ${insertValues}`,
      insertParams
    );

    results.creados = newRecibos.length;

    return Response.json({
      ok: true,
      ...results,
      mensaje: `${results.creados} recibos creados exitosamente`,
    });
  } catch (error) {
    console.error("Error processing recibos upload:", error);
    return Response.json(
      {
        ok: false,
        error: error.message || "Error interno del servidor",
        creados: 0,
        errores: [],
      },
      { status: 500 }
    );
  }
}
