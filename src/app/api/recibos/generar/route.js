import { query, isDbConfigured } from "@/lib/db";

/**
 * POST /api/recibos/generar
 * Genera recibos automáticamente para las pólizas que coincidan con los filtros
 */
export async function POST(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { ok: false, error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Extraer filtros
    const filters = {
      no_poliza: searchParams.get("no_poliza") || "",
      asesor_id: searchParams.get("asesor_id") || "",
      cia: searchParams.get("cia") || "",
      estatus: searchParams.get("estatus") || "",
      quincena: searchParams.get("quincena") || "",
      fecha_desde: searchParams.get("fecha_desde") || "",
      fecha_hasta: searchParams.get("fecha_hasta") || "",
    };

    // Construir WHERE clause
    const conditions = [];
    const params = [];

    if (filters.no_poliza && filters.no_poliza.trim()) {
      const polizaValue = filters.no_poliza.trim();
      if (polizaValue.includes(",")) {
        const polizas = polizaValue
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p);
        params.push(polizas);
        conditions.push(`p.no_poliza = ANY($${params.length})`);
      } else {
        params.push(`%${polizaValue}%`);
        conditions.push(`p.no_poliza ILIKE $${params.length}`);
      }
    }

    if (filters.asesor_id) {
      params.push(Number(filters.asesor_id));
      conditions.push(`p.asesor_id = $${params.length}`);
    }

    if (filters.cia && filters.cia.trim()) {
      params.push(`%${filters.cia.trim()}%`);
      conditions.push(`p.cia ILIKE $${params.length}`);
    }

    if (filters.estatus && filters.estatus.trim()) {
      params.push(filters.estatus.trim());
      conditions.push(`p.estatus = $${params.length}`);
    }

    if (filters.quincena && filters.quincena.trim()) {
      params.push(filters.quincena.trim());
      conditions.push(`p.quincena = $${params.length}`);
    }

    if (filters.fecha_desde) {
      params.push(filters.fecha_desde);
      conditions.push(`p.f_desde >= $${params.length}`);
    }

    if (filters.fecha_hasta) {
      params.push(filters.fecha_hasta);
      conditions.push(`p.f_hasta <= $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    // Obtener pólizas que coincidan con los filtros
    const polizasResult = await query(
      `SELECT 
        p.id,
        p.no_poliza,
        p.prima_total,
        p.prima_neta,
        p.commission_percentage,
        p.f_desde,
        p.f_hasta,
        p.forma_pago,
        p.asesor_id,
        p.cia
       FROM polizas p
       ${whereClause}
       ORDER BY p.no_poliza`,
      params
    );

    if (polizasResult.rows.length === 0) {
      return Response.json(
        {
          ok: false,
          error: "No se encontraron pólizas con los filtros especificados",
        },
        { status: 404 }
      );
    }

    let recibosCreados = 0;
    let recibosActualizados = 0;

    // Generar recibos para cada póliza
    for (const poliza of polizasResult.rows) {
      // Buscar comisión específica del asesor según forma de pago y compañía
      let comisionPorcentaje = parseFloat(poliza.commission_percentage || 0);

      if (poliza.asesor_id && poliza.forma_pago && poliza.cia) {
        // Buscar en advisor_commission_specifics
        const comisionEspecificaResult = await query(
          `SELECT acs.commission_percentage
           FROM advisor_commission_specifics acs
           JOIN advisor_commissions ac ON ac.id = acs.advisor_commission_id
           JOIN companies c ON c.id = ac.company_id
           WHERE ac.advisor_id = $1
             AND c.name ILIKE $2
             AND acs.payment_method = $3
           LIMIT 1`,
          [poliza.asesor_id, poliza.cia, poliza.forma_pago]
        );

        if (comisionEspecificaResult.rows.length > 0) {
          comisionPorcentaje = parseFloat(
            comisionEspecificaResult.rows[0].commission_percentage || 0
          );
        }
      }

      // Verificar que haya comisión asignada
      if (!comisionPorcentaje || comisionPorcentaje === 0) {
        return Response.json(
          {
            ok: false,
            error: "COMISION_FALTANTE",
            poliza: {
              id: poliza.id,
              no_poliza: poliza.no_poliza,
            },
          },
          { status: 400 }
        );
      }

      // Determinar número de recibos según forma de pago
      let numRecibos = 12; // Por defecto para DOM/DXN/MENSUAL
      if (poliza.forma_pago === "CONT") {
        numRecibos = 1;
      } else if (poliza.forma_pago === "ANUAL") {
        numRecibos = 1;
      } else if (poliza.forma_pago === "SEMESTRAL") {
        numRecibos = 2;
      } else if (poliza.forma_pago === "TRIMESTRAL") {
        numRecibos = 4;
      }

      // Calcular monto de prima por recibo
      const primaNeta = parseFloat(poliza.prima_neta || 0);
      const primaTotal = parseFloat(poliza.prima_total || 0);

      const primaNetaPorRecibo = primaNeta / numRecibos;
      const primaTotalPorRecibo = primaTotal / numRecibos;
      const comisionPorRecibo =
        (primaNeta * comisionPorcentaje) / 100 / numRecibos;

      // Generar cada recibo
      for (let i = 1; i <= numRecibos; i++) {
        // Calcular fechas de vigencia para este recibo
        const fDesde = new Date(poliza.f_desde);
        const fHasta = new Date(poliza.f_hasta);

        const mesesPorRecibo = 12 / numRecibos;
        const reciboFDesde = new Date(fDesde);
        reciboFDesde.setMonth(fDesde.getMonth() + (i - 1) * mesesPorRecibo);

        const reciboFHasta = new Date(reciboFDesde);
        reciboFHasta.setMonth(reciboFDesde.getMonth() + mesesPorRecibo);
        reciboFHasta.setDate(reciboFHasta.getDate() - 1); // Último día del período

        // Crear nuevo recibo siempre, sin verificar si existe
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
            f_hasta
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            poliza.id,
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
      recibosCreados,
      recibosActualizados,
      polizasProcesadas: polizasResult.rows.length,
    });
  } catch (error) {
    console.error("Error generating recibos:", error);
    return Response.json(
      { ok: false, error: "Error al generar recibos" },
      { status: 500 }
    );
  }
}
