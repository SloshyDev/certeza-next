import { NextResponse } from "next/server";
import { query } from "@/lib/extractor-db";
import { isExtractorDbConfigured } from "@/lib/db";

// Función para convertir fecha de DD/MM/YYYY a YYYY-MM-DD
function convertirFecha(fecha) {
  if (!fecha || fecha.trim() === "") return null;

  // Si ya está en formato ISO (YYYY-MM-DD), retornarla
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha;
  }

  // Convertir de DD/MM/YYYY a YYYY-MM-DD
  const partes = fecha.split("/");
  if (partes.length === 3) {
    const [dia, mes, año] = partes;
    return `${año}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }

  return null;
}

export async function POST(request) {
  try {
    // Verificar que la base de datos del extractor esté configurada
    if (!isExtractorDbConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Base de datos del extractor no configurada",
        },
        { status: 500 }
      );
    }

    const data = await request.json();

    // Extraer datos del request
    const {
      // Datos del asegurado
      nombre_asegurado,
      rfc,
      direccion,
      telefono,
      numero_empleado,
      tipo_trabajador,

      // Datos del vehículo
      descripcion_unidad,
      modelo,
      tipo_vehiculo,
      placas,
      numero_serie,
      numero_motor,

      // Datos de la póliza
      numero_folio,
      numero_poliza,
      tipo_solicitud,
      fecha_desde,
      fecha_hasta,
      fecha_emision,
      prima_neta,
      prima_total,
      pago_mixto,
      ubicacion,
      aseguradora,
      forma_pago,

      // Control y documentos
      fecha_ingreso_digital,
      fecha_ingreso_fisico,
      documentos_faltantes,
      completo,

      // Selección del usuario
      asesor_id,
      gerencia,
    } = data;

    // ============================================================================
    // PASO 1: Insertar o actualizar ASEGURADO
    // ============================================================================
    let id_asegurado = null;

    if (nombre_asegurado) {
      // Buscar si existe un asegurado con el mismo nombre o RFC
      const aseguradoExistente = await query(
        `SELECT id_asegurado FROM asegurados 
         WHERE nombre = $1 OR (rfc = $2 AND rfc IS NOT NULL)
         LIMIT 1`,
        [nombre_asegurado, rfc || null]
      );

      if (aseguradoExistente.rows.length > 0) {
        // Actualizar asegurado existente
        id_asegurado = aseguradoExistente.rows[0].id_asegurado;
        await query(
          `UPDATE asegurados 
           SET rfc = COALESCE($2, rfc),
               direccion = COALESCE($3, direccion),
               telefono = COALESCE($4, telefono),
               numero_empleado = COALESCE($5, numero_empleado),
               tipo_trabajador = COALESCE($6, tipo_trabajador),
               updated_at = NOW()
           WHERE id_asegurado = $1`,
          [
            id_asegurado,
            rfc || null,
            direccion || null,
            telefono || null,
            numero_empleado || null,
            tipo_trabajador || null,
          ]
        );
      } else {
        // Insertar nuevo asegurado
        const result = await query(
          `INSERT INTO asegurados (nombre, rfc, direccion, telefono, numero_empleado, tipo_trabajador, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id_asegurado`,
          [
            nombre_asegurado,
            rfc || null,
            direccion || null,
            telefono || null,
            numero_empleado || null,
            tipo_trabajador || null,
          ]
        );
        id_asegurado = result.rows[0].id_asegurado;
      }
    }

    // ============================================================================
    // PASO 2: Insertar o actualizar VEHÍCULO
    // ============================================================================
    let id_vehiculo = null;

    if (descripcion_unidad || placas || numero_serie) {
      // Buscar si existe un vehículo con las mismas placas o número de serie
      const vehiculoExistente = await query(
        `SELECT id_vehiculo FROM vehiculos 
         WHERE (placas = $1 AND placas IS NOT NULL) 
            OR (numero_serie = $2 AND numero_serie IS NOT NULL)
         LIMIT 1`,
        [placas || null, numero_serie || null]
      );

      if (vehiculoExistente.rows.length > 0) {
        // Actualizar vehículo existente
        id_vehiculo = vehiculoExistente.rows[0].id_vehiculo;
        await query(
          `UPDATE vehiculos 
           SET id_asegurado = COALESCE($2, id_asegurado),
               descripcion_unidad = COALESCE($3, descripcion_unidad),
               modelo = COALESCE($4, modelo),
               tipo = COALESCE($5, tipo),
               placas = COALESCE($6, placas),
               numero_serie = COALESCE($7, numero_serie),
               numero_motor = COALESCE($8, numero_motor)
           WHERE id_vehiculo = $1`,
          [
            id_vehiculo,
            id_asegurado,
            descripcion_unidad || null,
            modelo || null,
            tipo_vehiculo || null,
            placas || null,
            numero_serie || null,
            numero_motor || null,
          ]
        );
      } else {
        // Insertar nuevo vehículo
        const result = await query(
          `INSERT INTO vehiculos (id_asegurado, descripcion_unidad, modelo, tipo, placas, numero_serie, numero_motor, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING id_vehiculo`,
          [
            id_asegurado,
            descripcion_unidad || null,
            modelo || null,
            tipo_vehiculo || null,
            placas || null,
            numero_serie || null,
            numero_motor || null,
          ]
        );
        id_vehiculo = result.rows[0].id_vehiculo;
      }
    }

    // ============================================================================
    // PASO 3: Obtener IDs de aseguradora y forma de pago
    // ============================================================================
    let id_aseguradora = null;
    if (aseguradora) {
      const aseguradoraResult = await query(
        `SELECT id_aseguradora FROM aseguradoras WHERE nombre ILIKE $1 LIMIT 1`,
        [`%${aseguradora}%`]
      );
      if (aseguradoraResult.rows.length > 0) {
        id_aseguradora = aseguradoraResult.rows[0].id_aseguradora;
      }
    }

    let id_forma_pago = null;
    if (forma_pago) {
      const formaPagoResult = await query(
        `SELECT id_forma_pago FROM formas_pago WHERE nombre ILIKE $1 LIMIT 1`,
        [`%${forma_pago}%`]
      );
      if (formaPagoResult.rows.length > 0) {
        id_forma_pago = formaPagoResult.rows[0].id_forma_pago;
      }
    }

    // ============================================================================
    // PASO 4: Insertar PÓLIZA
    // ============================================================================
    const polizaResult = await query(
      `INSERT INTO polizas (
        numero_folio, numero_poliza, id_asegurado, id_vehiculo, 
        id_aseguradora, id_asesor, id_forma_pago, tipo_solicitud,
        fecha_desde, fecha_hasta, fecha_emision, 
        prima_neta, prima_total, pago_mixto, ubicacion,
        estado, fecha_captura, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW(), NOW())
      RETURNING id_poliza`,
      [
        numero_folio || null,
        numero_poliza || null,
        id_asegurado,
        id_vehiculo,
        id_aseguradora,
        asesor_id ? parseInt(asesor_id) : null,
        id_forma_pago,
        tipo_solicitud || null,
        convertirFecha(fecha_desde),
        convertirFecha(fecha_hasta),
        convertirFecha(fecha_emision),
        prima_neta ? parseFloat(prima_neta) : null,
        prima_total ? parseFloat(prima_total) : null,
        pago_mixto ? parseFloat(pago_mixto) : null,
        ubicacion || null,
        "ACTIVA", // Estado por defecto
      ]
    );

    const id_poliza = polizaResult.rows[0].id_poliza;

    // ============================================================================
    // PASO 5: Insertar CONTROL DE DOCUMENTOS
    // ============================================================================
    const documentosCompletos =
      !documentos_faltantes ||
      documentos_faltantes === "" ||
      documentos_faltantes === "NINGUNO";

    await query(
      `INSERT INTO control_documentos (
        id_poliza, fecha_ingreso_digital, fecha_ingreso_fisico,
        documentos_faltantes, completo, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        id_poliza,
        convertirFecha(fecha_ingreso_digital),
        convertirFecha(fecha_ingreso_fisico),
        documentos_faltantes || null,
        documentosCompletos,
      ]
    );

    // ============================================================================
    // PASO 6: Registrar en audit_log
    // ============================================================================
    await query(
      `INSERT INTO audit_log (tabla, id_registro, usuario, accion, datos_nuevos, fecha)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        "polizas",
        id_poliza,
        gerencia || "SISTEMA", // Usar gerencia como usuario temporal
        "INSERT",
        JSON.stringify({
          numero_poliza,
          asegurado: nombre_asegurado,
          asesor_id,
          gerencia,
        }),
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Póliza guardada exitosamente",
      data: {
        id_poliza,
        id_asegurado,
        id_vehiculo,
      },
    });
  } catch (error) {
    console.error("Error al guardar póliza:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al guardar en la base de datos",
      },
      { status: 500 }
    );
  }
}
