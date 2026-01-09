import * as XLSX from "xlsx";

export const runtime = "nodejs";

/**
 * GET /api/polizas/template
 * Genera y descarga una plantilla Excel para actualizar pólizas masivamente
 */
export async function GET() {
  try {
    // Datos de ejemplo para la plantilla
    const templateData = [
      {
        no_poliza: "POL-2025-001",
        clave_asesor: "ASE001",
        cia: "AXA",
        estatus: "VIGENTE",
        quincena: "2025-01",
        f_desde: "2025-01-01",
        f_hasta: "2026-01-01",
        f_ingreso: "2025-01-15",
        f_vale_recibido: "2025-01-20",
        prima_total: "15000.00",
        prima_neta: "14000.00",
        forma_pago: "ANUAL",
        no_vale: "VALE-001",
        folio: "FOL-001",
      },
      {
        no_poliza: "POL-2025-002",
        clave_asesor: "ASE002",
        cia: "MAPFRE",
        estatus: "PENDIENTE",
        quincena: "2025-01",
        f_desde: "2025-02-01",
        f_hasta: "2026-02-01",
        f_ingreso: "2025-02-10",
        f_vale_recibido: "",
        prima_total: "25000.00",
        prima_neta: "23500.00",
        forma_pago: "MENSUAL",
        no_vale: "",
        folio: "FOL-002",
      },
    ];

    // Instrucciones para usar la plantilla
    const instructions = [
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "Lea estas instrucciones antes de llenar el archivo",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA": "",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "⚠️ IMPORTANTE: Este archivo SOLO ACTUALIZA pólizas existentes, NO crea nuevas pólizas.",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "   Si una póliza no existe en la base de datos, se reportará como error.",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA": "",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "1. El campo 'no_poliza' es obligatorio para identificar y actualizar pólizas existentes.",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "2. Los campos obligatorios son: no_poliza, clave_asesor",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "3. Formatos de fecha: DD/MM/YYYY (ejemplo: 27/12/2023) o YYYY-MM-DD",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "4. Valores de 'estatus' permitidos: VIGENTE, CANCELADA, PENDIENTE",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "5. La 'clave_asesor' debe corresponder a un asesor existente en el sistema",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "6. Los montos deben ir sin símbolos (ejemplo: 15000.00, no $15,000.00)",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "7. La 'quincena' debe tener formato: YYYY-QQ (ejemplo: 2025-01 para primera quincena del año)",
      },
      {
        "INSTRUCCIONES PARA USAR LA PLANTILLA":
          "8. Elimine esta hoja de instrucciones antes de subir el archivo",
      },
    ];

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();

    // Hoja de instrucciones
    const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
    instructionsSheet["!cols"] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "INSTRUCCIONES");

    // Hoja de plantilla con datos de ejemplo
    const templateSheet = XLSX.utils.json_to_sheet(templateData);

    // Ajustar anchos de columna
    templateSheet["!cols"] = [
      { wch: 20 }, // no_poliza
      { wch: 15 }, // clave_asesor
      { wch: 25 }, // nombre_asegurado
      { wch: 15 }, // rfc
      { wch: 30 }, // direccion
      { wch: 15 }, // telefono
      { wch: 15 }, // numero_empleado
      { wch: 15 }, // tipo_trabajador
      { wch: 20 }, // descripcion_unidad
      { wch: 10 }, // modelo
      { wch: 15 }, // tipo_vehiculo
      { wch: 15 }, // placas
      { wch: 20 }, // numero_serie
      { wch: 20 }, // numero_motor
      { wch: 20 }, // cia
      { wch: 12 }, // estatus
      { wch: 12 }, // quincena
      { wch: 12 }, // f_desde
      { wch: 12 }, // f_hasta
      { wch: 12 }, // f_ingreso
      { wch: 15 }, // f_vale_recibido
      { wch: 15 }, // prima_total
      { wch: 15 }, // prima_neta
      { wch: 15 }, // forma_pago
      { wch: 15 }, // no_vale
      { wch: 15 }, // folio
    ];

    XLSX.utils.book_append_sheet(workbook, templateSheet, "Datos");

    // Hoja de referencia de campos
    const fieldsReference = [
      {
        Campo: "no_poliza",
        Tipo: "Texto",
        Obligatorio: "Sí",
        Descripción: "Número de la póliza (identifica la póliza a actualizar)",
      },
      {
        Campo: "clave_asesor",
        Tipo: "Texto",
        Obligatorio: "Sí",
        Descripción: "Clave del asesor asignado (debe existir en el sistema)",
      },
      {
        Campo: "nombre_asegurado",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Nombre completo del asegurado",
      },
      {
        Campo: "rfc",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "RFC del asegurado (13 caracteres)",
      },
      {
        Campo: "direccion",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Dirección completa del asegurado",
      },
      {
        Campo: "telefono",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Teléfono de contacto",
      },
      {
        Campo: "numero_empleado",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Número de empleado (si aplica)",
      },
      {
        Campo: "tipo_trabajador",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Tipo de trabajador (Base, Confianza, etc.)",
      },
      {
        Campo: "descripcion_unidad",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Descripción del vehículo (Marca, Submarca)",
      },
      {
        Campo: "modelo",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Año modelo del vehículo",
      },
      {
        Campo: "tipo_vehiculo",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Tipo de vehículo (Automóvil, Camioneta, etc.)",
      },
      {
        Campo: "placas",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Placas del vehículo",
      },
      {
        Campo: "numero_serie",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Número de serie (VIN)",
      },
      {
        Campo: "numero_motor",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Número de motor",
      },
      {
        Campo: "cia",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Nombre de la compañía aseguradora",
      },
      {
        Campo: "estatus",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Estatus de la póliza: VIGENTE, CANCELADA, PENDIENTE",
      },
      {
        Campo: "quincena",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Quincena correspondiente (formato: YYYY-QQ)",
      },
      {
        Campo: "f_desde",
        Tipo: "Fecha",
        Obligatorio: "No",
        Descripción: "Fecha de inicio de vigencia (YYYY-MM-DD)",
      },
      {
        Campo: "f_hasta",
        Tipo: "Fecha",
        Obligatorio: "No",
        Descripción: "Fecha de fin de vigencia (YYYY-MM-DD)",
      },
      {
        Campo: "f_ingreso",
        Tipo: "Fecha",
        Obligatorio: "No",
        Descripción: "Fecha de ingreso al sistema (YYYY-MM-DD)",
      },
      {
        Campo: "f_vale_recibido",
        Tipo: "Fecha",
        Obligatorio: "No",
        Descripción: "Fecha en que se recibió el vale (YYYY-MM-DD)",
      },
      {
        Campo: "prima_total",
        Tipo: "Número",
        Obligatorio: "No",
        Descripción: "Monto total de la prima (sin símbolos)",
      },
      {
        Campo: "prima_neta",
        Tipo: "Número",
        Obligatorio: "No",
        Descripción: "Monto neto de la prima (sin símbolos)",
      },
      {
        Campo: "forma_pago",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Forma de pago (ANUAL, MENSUAL, etc.)",
      },
      {
        Campo: "no_vale",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Número de vale",
      },
      {
        Campo: "folio",
        Tipo: "Texto",
        Obligatorio: "No",
        Descripción: "Número de folio",
      },
    ];

    const referenceSheet = XLSX.utils.json_to_sheet(fieldsReference);
    referenceSheet["!cols"] = [
      { wch: 25 }, // Campo
      { wch: 12 }, // Tipo
      { wch: 25 }, // Obligatorio
      { wch: 60 }, // Descripción
    ];
    XLSX.utils.book_append_sheet(
      workbook,
      referenceSheet,
      "Referencia de Campos"
    );

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Nombre del archivo
    const filename = `plantilla_polizas_${new Date()
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
    console.error("Error generando plantilla:", error);
    return new Response("ERROR_GENERATING_TEMPLATE", { status: 500 });
  }
}
