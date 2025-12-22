import * as XLSX from "xlsx";
import { query, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/recibos/template
 * Genera y descarga una plantilla Excel con las pólizas y el cálculo de recibos y comisiones
 * Acepta filtros como query params para generar solo las pólizas filtradas
 */
export async function GET(req) {
  try {
    if (!isDbConfigured()) {
      return new Response("DB_NOT_CONFIGURED", { status: 500 });
    }

    // Extraer filtros de los parámetros de búsqueda
    const { searchParams } = new URL(req.url);
    const filters = {
      no_poliza: searchParams.get("no_poliza") || "",
      asesor_id: searchParams.get("asesor_id") || "",
      cia: searchParams.get("cia") || "",
      estatus: searchParams.get("estatus") || "",
      quincena: searchParams.get("quincena") || "",
      fecha_desde: searchParams.get("fecha_desde") || "",
      fecha_hasta: searchParams.get("fecha_hasta") || "",
      solo_folio_completo: searchParams.get("solo_folio_completo") === "true",
      solo_dxn_con_vale: searchParams.get("solo_dxn_con_vale") === "true",
    };

    // Construir condiciones WHERE
    const conditions = [];
    const params = [];

    // Filtro por número de póliza
    if (filters.no_poliza && filters.no_poliza.trim()) {
      params.push(`%${filters.no_poliza.trim()}%`);
      conditions.push(`p.no_poliza ILIKE $${params.length}`);
    }

    // Filtro por asesor
    if (filters.asesor_id) {
      params.push(Number(filters.asesor_id));
      conditions.push(`p.asesor_id = $${params.length}`);
    }

    // Filtro por compañía
    if (filters.cia && filters.cia.trim()) {
      params.push(filters.cia.trim());
      conditions.push(`p.cia = $${params.length}`);
    }

    // Filtro por estatus
    if (filters.estatus && filters.estatus.trim()) {
      params.push(filters.estatus.trim());
      conditions.push(`p.estatus = $${params.length}`);
    }

    // Filtro por quincena
    if (filters.quincena && filters.quincena.trim()) {
      params.push(filters.quincena.trim());
      conditions.push(`p.quincena = $${params.length}`);
    }

    // Filtro por fecha desde
    if (filters.fecha_desde) {
      params.push(filters.fecha_desde);
      conditions.push(`p.f_desde >= $${params.length}`);
    }

    // Filtro por fecha hasta
    if (filters.fecha_hasta) {
      params.push(filters.fecha_hasta);
      conditions.push(`p.f_hasta <= $${params.length}`);
    }

    // Filtro adicional: Solo pólizas con estatus FOLIO COMPLETO
    if (filters.solo_folio_completo) {
      conditions.push(`p.estatus = 'FOLIO COMPLETO'`);
    }

    // Filtro adicional: Solo pólizas DXN con f_vale_recibido
    if (filters.solo_dxn_con_vale) {
      conditions.push(`p.forma_pago = 'DXN'`);
      conditions.push(`p.f_vale_recibido IS NOT NULL`);
    }

    const whereClause =
      conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

    // Obtener pólizas filtradas con información del asesor
    const result = await query(
      `SELECT 
        p.id,
        p.no_poliza,
        p.forma_pago,
        p.prima_total,
        p.prima_neta,
        p.commission_percentage,
        p.f_desde,
        p.f_hasta,
        p.cia,
        p.estatus,
        a.nombre as asesor_nombre,
        a.clave as asesor_clave
      FROM polizas p
      LEFT JOIN asesor a ON p.asesor_id = a.id
      ${whereClause}
      ORDER BY p.no_poliza`,
      params
    );

    // Calcular recibos y comisiones para cada póliza
    const templateData = result.rows.map((poliza) => {
      // Determinar número de recibos según forma de pago
      let num_recibos = 1;
      if (poliza.forma_pago === "MENS") {
        num_recibos = 12;
      } else if (poliza.forma_pago === "DXN") {
        num_recibos = 12; // O extraer del campo si tiene formato DX6, DX12, etc.
      } else if (poliza.forma_pago === "CONT") {
        num_recibos = 1;
      }

      // Calcular montos
      const primaTotal = parseFloat(poliza.prima_total || 0);
      const primaNeta = parseFloat(poliza.prima_neta || 0);
      const commissionRate =
        parseFloat(poliza.commission_percentage || 0) / 100;

      const comisionTotal = primaNeta * commissionRate;
      const primaTotalPorRecibo = primaTotal / num_recibos;
      const primaNetaPorRecibo = primaNeta / num_recibos;
      const comisionPorRecibo = comisionTotal / num_recibos;

      return {
        no_poliza: poliza.no_poliza,
        asesor: poliza.asesor_nombre || "",
        forma_pago: poliza.forma_pago || "",
        num_recibos: num_recibos,
        comision_porcentaje: poliza.commission_percentage || 0,
      };
    });

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();

    // Hoja de datos
    const templateSheet = XLSX.utils.json_to_sheet(templateData);

    // Ajustar anchos de columna
    templateSheet["!cols"] = [
      { wch: 25 }, // no_poliza
      { wch: 30 }, // asesor
      { wch: 15 }, // forma_pago
      { wch: 15 }, // num_recibos
      { wch: 20 }, // comision_porcentaje
    ];

    XLSX.utils.book_append_sheet(workbook, templateSheet, "Recibos");

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Nombre del archivo
    const filename = `calculo_recibos_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    // Retornar archivo Excel
    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generando plantilla de recibos:", error);
    return new Response("ERROR_GENERATING_TEMPLATE", { status: 500 });
  }
}
