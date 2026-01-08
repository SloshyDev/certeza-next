import { query } from "@/lib/extractor-db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parámetros de filtrado
    const searchTerm = searchParams.get("search") || "";
    const asesor = searchParams.get("asesor") || "";
    const gerente = searchParams.get("gerente") || "";
    const estado = searchParams.get("estado") || "";
    const fechaDesde = searchParams.get("fechaDesde") || "";
    const fechaHasta = searchParams.get("fechaHasta") || "";

    // Construir consulta con filtros
    let sqlQuery = `
      SELECT
        p.id_poliza,
        p.numero_folio,
        p.numero_poliza,
        p.estado,
        p.pago_mixto,
        p.ubicacion,
        p.poliza_cancelada_sustitucion,
        aseg.nombre AS asegurado,
        aseg.rfc,
        veh.descripcion_unidad,
        veh.placas,
        asegura.nombre AS aseguradora,
        ases.nombre AS asesor,
        ases.clave_asesor,
        g.nombre AS gerente,
        fp.nombre AS forma_pago,
        p.prima_neta,
        p.prima_total,
        p.fecha_desde,
        p.fecha_hasta,
        cd.completo AS documentos_completos,
        cd.documentos_faltantes,
        cd.fecha_ingreso_digital,
        cd.fecha_ingreso_fisico,
        val.numero_vale,
        val.fecha_ingreso_vales,
        val.quincena,
        val.estado_vale,
        p.created_at
      FROM
        polizas p
        LEFT JOIN asegurados aseg ON p.id_asegurado = aseg.id_asegurado
        LEFT JOIN vehiculos veh ON p.id_vehiculo = veh.id_vehiculo
        LEFT JOIN aseguradoras asegura ON p.id_aseguradora = asegura.id_aseguradora
        LEFT JOIN asesores ases ON p.id_asesor = ases.id_asesor
        LEFT JOIN gerentes g ON ases.id_gerente = g.id_gerente
        LEFT JOIN formas_pago fp ON p.id_forma_pago = fp.id_forma_pago
        LEFT JOIN control_documentos cd ON p.id_poliza = cd.id_poliza
        LEFT JOIN vales val ON p.id_poliza = val.id_poliza
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    // Aplicar filtros
    if (searchTerm) {
      sqlQuery += ` AND (
        p.numero_poliza ILIKE $${paramCount} OR
        p.numero_folio ILIKE $${paramCount} OR
        aseg.nombre ILIKE $${paramCount} OR
        aseg.rfc ILIKE $${paramCount} OR
        veh.placas ILIKE $${paramCount}
      )`;
      params.push(`%${searchTerm}%`);
      paramCount++;
    }

    if (asesor) {
      sqlQuery += ` AND ases.clave_asesor = $${paramCount}`;
      params.push(asesor);
      paramCount++;
    }

    if (gerente) {
      sqlQuery += ` AND g.nombre ILIKE $${paramCount}`;
      params.push(`%${gerente}%`);
      paramCount++;
    }

    if (estado) {
      sqlQuery += ` AND p.estado = $${paramCount}`;
      params.push(estado);
      paramCount++;
    }

    if (fechaDesde) {
      sqlQuery += ` AND p.fecha_desde >= $${paramCount}`;
      params.push(fechaDesde);
      paramCount++;
    }

    if (fechaHasta) {
      sqlQuery += ` AND p.fecha_hasta <= $${paramCount}`;
      params.push(fechaHasta);
      paramCount++;
    }

    sqlQuery += ` ORDER BY p.created_at DESC`;

    const result = await query(sqlQuery, params);

    return NextResponse.json({
      success: true,
      polizas: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error al obtener pólizas:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
