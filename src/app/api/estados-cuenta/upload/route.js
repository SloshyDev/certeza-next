import { query, isDbConfigured } from "@/lib/db";

/**
 * POST /api/estados-cuenta/upload
 * Carga un estado de cuenta desde Excel
 * Los datos son inmutables una vez cargados
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
    const { nombre_quincena, detalles } = body;

    if (!nombre_quincena || !nombre_quincena.trim()) {
      return Response.json(
        { ok: false, error: "El nombre de la quincena es requerido" },
        { status: 400 }
      );
    }

    if (!Array.isArray(detalles) || detalles.length === 0) {
      return Response.json(
        { ok: false, error: "No hay detalles para cargar" },
        { status: 400 }
      );
    }

    // Verificar si ya existe un corte con ese nombre
    const existingCorte = await query(
      "SELECT id FROM estados_cuenta_cortes WHERE nombre_quincena = $1",
      [nombre_quincena.trim()]
    );

    if (existingCorte.rows.length > 0) {
      return Response.json(
        { ok: false, error: "Ya existe un corte con ese nombre de quincena" },
        { status: 400 }
      );
    }

    // Calcular totales
    const totalComisiones = detalles.reduce(
      (sum, d) => sum + parseFloat(d.comision || 0),
      0
    );
    const asesoresUnicos = new Set(detalles.map((d) => d.asesor_nombre));
    const numAsesores = asesoresUnicos.size;

    // Crear el corte
    const corteResult = await query(
      `INSERT INTO estados_cuenta_cortes (nombre_quincena, total_comisiones, num_asesores)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [nombre_quincena.trim(), totalComisiones, numAsesores]
    );

    const corteId = corteResult.rows[0].id;

    // Obtener IDs de asesores por nombre
    const asesoresResult = await query("SELECT id, nombre, clave FROM asesor");
    const asesoresMap = {};
    asesoresResult.rows.forEach((a) => {
      asesoresMap[a.nombre] = { id: a.id, clave: a.clave };
    });

    // Insertar detalles
    let detallesInsertados = 0;

    for (const detalle of detalles) {
      const asesorInfo = asesoresMap[detalle.asesor_nombre];
      if (!asesorInfo) {
        console.warn(`Asesor no encontrado: ${detalle.asesor_nombre}`);
        continue;
      }

      // Convertir fechas de formato Excel a Date
      const parseFecha = (fecha) => {
        if (!fecha) return null;

        // Si es un número (fecha de Excel), convertir
        if (typeof fecha === "number") {
          const excelEpoch = new Date(1899, 11, 30);
          const msPerDay = 24 * 60 * 60 * 1000;
          return new Date(excelEpoch.getTime() + fecha * msPerDay)
            .toISOString()
            .split("T")[0];
        }

        // Si es string, intentar parsearlo
        if (typeof fecha === "string") {
          // Formato dd/mm/yyyy
          const parts = fecha.split("/");
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(
              2,
              "0"
            )}-${parts[0].padStart(2, "0")}`;
          }
        }

        return null;
      };

      await query(
        `INSERT INTO estados_cuenta_detalles (
          corte_id,
          asesor_id,
          asesor_nombre,
          asesor_clave,
          no_poliza,
          cia,
          forma_pago,
          prima_total,
          prima_neta,
          porcentaje_comision,
          no_recibo,
          comision,
          f_pago_comision,
          f_desde,
          f_hasta,
          estatus_pago,
          estatus_comision
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          corteId,
          asesorInfo.id,
          detalle.asesor_nombre,
          detalle.asesor_clave || asesorInfo.clave,
          detalle.no_poliza,
          detalle.cia,
          detalle.forma_pago,
          detalle.prima_total,
          detalle.prima_neta,
          detalle.porcentaje_comision,
          detalle.no_recibo,
          detalle.comision,
          parseFecha(detalle.f_pago_comision),
          parseFecha(detalle.f_desde),
          parseFecha(detalle.f_hasta),
          detalle.estatus_pago,
          detalle.estatus_comision,
        ]
      );

      detallesInsertados++;
    }

    return Response.json({
      ok: true,
      corte_id: corteId,
      nombre_quincena: nombre_quincena.trim(),
      detalles_insertados: detallesInsertados,
      total_comisiones: totalComisiones,
      num_asesores: numAsesores,
    });
  } catch (error) {
    console.error("Error uploading estado de cuenta:", error);
    return Response.json(
      { ok: false, error: error.message || "Error al cargar estado de cuenta" },
      { status: 500 }
    );
  }
}
