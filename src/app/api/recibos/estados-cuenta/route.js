import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { query, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/recibos/estados-cuenta
 * Genera un Excel con estados de cuenta de comisiones por asesor
 * Cada hoja representa un asesor con sus comisiones pagadas
 */
export async function GET(req) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(req.url);
    const fechaInicio = searchParams.get("fecha_inicio");
    const fechaFin = searchParams.get("fecha_fin");

    // Construir query base - incluir PAGADO y CANCELADO
    let whereClause =
      "WHERE r.estatus_comision IN ('PAGADO', 'CANCELADO') AND r.f_pago_comision IS NOT NULL";
    const params = [];
    let paramIndex = 1;

    if (fechaInicio) {
      whereClause += ` AND r.f_pago_comision >= $${paramIndex}`;
      params.push(fechaInicio);
      paramIndex++;
    }

    if (fechaFin) {
      whereClause += ` AND r.f_pago_comision <= $${paramIndex}`;
      params.push(fechaFin);
      paramIndex++;
    }

    // Obtener comisiones pagadas agrupadas por asesor
    const result = await query(
      `
      SELECT 
        a.id as asesor_id,
        a.nombre as asesor_nombre,
        a.clave as asesor_clave,
        p.no_poliza,
        p.cia,
        p.forma_pago,
        p.prima_total,
        p.prima_neta,
        p.commission_percentage,
        r.no_recibo,
        r.comision,
        r.f_pago_comision,
        r.f_desde,
        r.f_hasta,
        r.estatus_pago,
        r.estatus_comision
      FROM recibos r
      JOIN polizas p ON r.poliza_id = p.id
      JOIN asesor a ON p.asesor_id = a.id
      ${whereClause}
      ORDER BY a.nombre, r.f_pago_comision, p.no_poliza, r.no_recibo
      `,
      params
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No hay comisiones pagadas en el período seleccionado",
        },
        { status: 404 }
      );
    }

    // Agrupar por asesor
    const comisionesPorAsesor = {};

    result.rows.forEach((row) => {
      const asesorKey = row.asesor_id;
      if (!comisionesPorAsesor[asesorKey]) {
        comisionesPorAsesor[asesorKey] = {
          nombre: row.asesor_nombre,
          clave: row.asesor_clave,
          comisiones: [],
        };
      }

      comisionesPorAsesor[asesorKey].comisiones.push({
        no_poliza: row.no_poliza,
        cia: row.cia,
        forma_pago: row.forma_pago,
        prima_total: parseFloat(row.prima_total || 0),
        prima_neta: parseFloat(row.prima_neta || 0),
        porcentaje_comision: parseFloat(row.commission_percentage || 0),
        no_recibo: row.no_recibo,
        comision: parseFloat(row.comision || 0),
        f_pago_comision: row.f_pago_comision,
        f_desde: row.f_desde,
        f_hasta: row.f_hasta,
        estatus_pago: row.estatus_pago,
        estatus_comision: row.estatus_comision,
      });
    });

    // Crear workbook
    const workbook = XLSX.utils.book_new();

    // ========== HOJA GENERAL (RESUMEN) ==========
    const dataGeneral = [];

    // Título principal
    dataGeneral.push(["ESTADO DE CUENTA GENERAL - RESUMEN POR ASESOR"]);
    dataGeneral.push([]);

    // Encabezados de columnas
    dataGeneral.push(["Asesor", "Clave", "Total Comisión"]);

    // Calcular total de comisión por asesor
    let totalGeneralComisiones = 0;
    Object.values(comisionesPorAsesor).forEach((asesor) => {
      const totalAsesor = asesor.comisiones.reduce(
        (sum, c) => sum + c.comision,
        0
      );
      dataGeneral.push([asesor.nombre, asesor.clave, totalAsesor.toFixed(2)]);
      totalGeneralComisiones += totalAsesor;
    });

    // Total general
    dataGeneral.push([]);
    dataGeneral.push(["TOTAL GENERAL:", "", totalGeneralComisiones.toFixed(2)]);

    // Crear worksheet general
    const worksheetGeneral = XLSX.utils.aoa_to_sheet(dataGeneral);

    // Ajustar anchos de columna para hoja general
    worksheetGeneral["!cols"] = [
      { wch: 30 }, // Asesor
      { wch: 15 }, // Clave
      { wch: 15 }, // Total Comisión
    ];

    // Agregar hoja general como primera hoja
    XLSX.utils.book_append_sheet(workbook, worksheetGeneral, "GENERAL");

    // ========== HOJAS INDIVIDUALES POR ASESOR ==========
    // Crear una hoja por cada asesor
    Object.values(comisionesPorAsesor).forEach((asesor) => {
      const data = [];

      // Encabezado del asesor
      data.push([`ESTADO DE CUENTA - ${asesor.nombre} (${asesor.clave})`]);
      data.push([]);

      // Encabezados de columnas
      data.push([
        "Póliza",
        "Compañía",
        "Forma Pago",
        "Prima Total",
        "Prima Neta",
        "% Comisión",
        "Recibo #",
        "Comisión",
        "F. Pago Comisión",
        "Vigencia Desde",
        "Vigencia Hasta",
        "Estatus Pago",
        "Estatus Comisión",
      ]);

      // Datos de comisiones
      asesor.comisiones.forEach((com) => {
        data.push([
          com.no_poliza,
          com.cia,
          com.forma_pago,
          com.prima_total,
          com.prima_neta,
          com.porcentaje_comision,
          com.no_recibo,
          com.comision,
          com.f_pago_comision
            ? new Date(com.f_pago_comision).toLocaleDateString("es-MX")
            : "",
          com.f_desde ? new Date(com.f_desde).toLocaleDateString("es-MX") : "",
          com.f_hasta ? new Date(com.f_hasta).toLocaleDateString("es-MX") : "",
          com.estatus_pago,
          com.estatus_comision,
        ]);
      });

      // Totales
      const totalComisiones = asesor.comisiones.reduce(
        (sum, c) => sum + c.comision,
        0
      );
      data.push([]);
      data.push(["", "", "", "", "", "", "TOTAL:", totalComisiones.toFixed(2)]);

      // Crear worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(data);

      // Ajustar anchos de columna
      worksheet["!cols"] = [
        { wch: 15 }, // Póliza
        { wch: 15 }, // Compañía
        { wch: 12 }, // Forma Pago
        { wch: 12 }, // Prima Total
        { wch: 12 }, // Prima Neta
        { wch: 10 }, // % Comisión
        { wch: 10 }, // Recibo #
        { wch: 12 }, // Comisión
        { wch: 15 }, // F. Pago Comisión
        { wch: 15 }, // Vigencia Desde
        { wch: 15 }, // Vigencia Hasta
        { wch: 15 }, // Estatus Pago
        { wch: 15 }, // Estatus Comisión
      ];

      // Nombre seguro de la hoja (max 31 caracteres, sin caracteres especiales)
      const sheetName = asesor.nombre
        .substring(0, 31)
        .replace(/[:\\\/?*\[\]]/g, "_");

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Generar buffer del Excel
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Nombre del archivo
    const fileName = `Estados_Cuenta_${fechaInicio || "todos"}_${
      fechaFin || "todos"
    }.xlsx`;

    // Retornar el archivo
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("Error generating estados de cuenta:", error);
    return NextResponse.json(
      { ok: false, error: "Error al generar estados de cuenta" },
      { status: 500 }
    );
  }
}
