import { query, isDbConfigured } from "@/lib/db";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

/**
 * POST /api/polizas/preview-changes
 * Analiza un archivo Excel y retorna los cambios que se aplicarían
 */
export async function POST(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { ok: false, error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json(
        { ok: false, error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Leer archivo Excel
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    if (jsonData.length === 0) {
      return Response.json(
        { ok: false, error: "El archivo está vacío" },
        { status: 400 }
      );
    }

    // Obtener todas las pólizas existentes
    const polizasExistentes = await query(
      `SELECT id, no_poliza, cia, forma_pago, f_desde, f_hasta, f_ingreso, f_vale_recibido, prima_total, 
              prima_neta, estatus, folio, commission_percentage, quincena, asesor_id
       FROM polizas`
    );

    const polizasMap = {};
    polizasExistentes.rows.forEach((p) => {
      polizasMap[String(p.no_poliza)] = p;
    });

    // Obtener catálogo de asesores para mapeo Clave -> ID y ID -> Nombre
    const asesoresRes = await query(`SELECT id, nombre, clave FROM asesor`);
    const asesoresByClave = {};
    const asesoresById = {};

    asesoresRes.rows.forEach(asesor => {
      if (asesor.clave) {
        asesoresByClave[String(asesor.clave).trim()] = asesor;
      }
      asesoresById[asesor.id] = asesor;
    });

    const cambios = [];
    const nuevas = [];
    const canceladas = [];
    const noActualizadas = []; // Pólizas ignoradas por ser renovación

    // Obtener IDs de pólizas que ya tienen recibos de cancelación
    const polizasConCancelacionRes = await query(
      `SELECT distinct poliza_id 
       FROM recibos 
       WHERE estatus_comision = 'CANCELADO' 
          OR estatus_pago = 'CANCELADO'
          OR comision < 0 
          OR prima_total < 0`
    );
    const polizasConCancelacionSet = new Set(
      polizasConCancelacionRes.rows.map((r) => r.poliza_id)
    );

    // Función para convertir fecha DD/MM/YYYY a YYYY-MM-DD
    function convertirFecha(fechaStr) {
      if (!fechaStr) return "";
      const str = String(fechaStr).trim();

      // Si ya está en formato YYYY-MM-DD, devolverla tal cual
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }

      // Si está en formato DD/MM/YYYY o D/M/YYYY o con guiones
      const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (match) {
        const dia = match[1].padStart(2, '0');
        const mes = match[2].padStart(2, '0');
        const anio = match[3];
        return `${anio}-${mes}-${dia}`;
      }

      // Si es número de Excel (días desde 1900-01-01)
      if (!isNaN(str)) {
        const days = parseInt(str);
        const date = new Date(1900, 0, days - 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

      return str;
    }

    let rowsProcessed = 0;
    const polizasEnExcel = new Set(); // Track policies found in Excel

    // Analizar cada fila del Excel
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];

      // Mostrar todas las claves de la primera fila para debug
      if (i === 0) {
        console.log("\n=== COLUMNAS DEL EXCEL ===");
        console.log(Object.keys(row));
        console.log("==========================\n");
      }

      const noPoliza = String(
        row["NO POLIZA"] ||
        row["No Poliza"] ||
        row["no_poliza"] ||
        row["NO_POLIZA"] ||
        row["POLIZA"] ||
        row["Poliza"] ||
        row["poliza"] ||
        row["NUMERO POLIZA"] ||
        row["Numero Poliza"] ||
        row["NUMERO DE POLIZA"] ||
        ""
      ).trim();

      if (!noPoliza) continue;
      rowsProcessed++;
      polizasEnExcel.add(noPoliza); // Add to set

      // Intentar múltiples variaciones de nombres de columnas para estatus
      const estatusRaw =
        row["ESTATUS"] ||
        row["Estatus"] ||
        row["estatus"] ||
        row["STATUS"] ||
        row["Status"] ||
        row["status"] ||
        row["ESTADO"] ||
        row["Estado"] ||
        row["estado"] ||
        "";


      // Lógica de búsqueda de Asesor por Clave
      const rawAsesor = String(
        row["ASESOR_ID"] ||
        row["Asesor ID"] ||
        row["asesor_id"] ||
        row["ID ASESOR"] ||
        row["CLAVE_ASESOR"] ||
        row["Clave Asesor"] ||
        row["clave_asesor"] ||
        row["CLAVE ASESOR"] ||
        row["Clave asesor"] ||
        row["ASESOR"] ||
        row["Asesor"] ||
        row["asesor"] ||
        ""
      ).trim();

      let asesorIdFound = null;
      let asesorNombreFound = "";

      if (rawAsesor) {
        // 1. Buscar por Clave en el catálogo
        const asesorPorClave = asesoresByClave[rawAsesor];
        if (asesorPorClave) {
          asesorIdFound = asesorPorClave.id;
          asesorNombreFound = asesorPorClave.nombre;
        } else {
          // 2. Fallback: Si no existe la clave, asumir que podría ser un ID directo (legacy)
          const possibleId = parseInt(rawAsesor);
          if (!isNaN(possibleId)) {
            asesorIdFound = possibleId;
            const asesorPorId = asesoresById[possibleId];
            asesorNombreFound = asesorPorId ? asesorPorId.nombre : `ID: ${possibleId}`;
          }
        }
      }

      const excelData = {
        no_poliza: noPoliza,
        cia: String(row["CIA"] || row["Compañía"] || row["cia"] || "").trim(),
        forma_pago: String(
          row["FORMA PAGO"] ||
          row["Forma Pago"] ||
          row["FORMA_PAGO"] ||
          row["forma_pago"] ||
          ""
        ).trim(),
        f_desde: convertirFecha(
          row["F DESDE"] ||
          row["F. Desde"] ||
          row["F_DESDE"] ||
          row["f_desde"] ||
          ""
        ),
        f_hasta: convertirFecha(
          row["F HASTA"] ||
          row["F. Hasta"] ||
          row["F_HASTA"] ||
          row["f_hasta"] ||
          row["f_hasta"] ||
          ""
        ),
        f_ingreso: convertirFecha(
          row["F INGRESO"] ||
          row["F. Ingreso"] ||
          row["F_INGRESO"] ||
          row["f_ingreso"] ||
          ""
        ),
        f_vale_recibido: convertirFecha(
          row["F VALE RECIBIDO"] ||
          row["F. Vale Recibido"] ||
          row["F_VALE_RECIBIDO"] ||
          row["f_vale_recibido"] ||
          ""
        ),
        prima_total: parseFloat(
          row["PRIMA TOTAL"] ||
          row["Prima Total"] ||
          row["PRIMA_TOTAL"] ||
          row["prima_total"] ||
          0
        ),
        prima_neta: parseFloat(
          row["PRIMA NETA"] ||
          row["Prima Neta"] ||
          row["PRIMA_NETA"] ||
          row["prima_neta"] ||
          0
        ),
        estatus: String(estatusRaw).trim().toUpperCase(),
        folio: String(
          row["FOLIO"] || row["Folio"] || row["folio"] || ""
        ).trim(),
        commission_percentage: parseFloat(
          row["% COMISION"] ||
          row["% Comisión"] ||
          row["%_COMISION"] ||
          row["COMISION"] ||
          row["comision"] ||
          0
        ),
        quincena: String(
          row["QUINCENA"] || row["Quincena"] || row["quincena"] || ""
        ).trim(),
        asesor_id: asesorIdFound,
        asesor_nombre: asesorNombreFound, // Guardamos el nombre para mostrar en UI
      };

      // Debug log para las primeras 3 filas
      if (i < 3) {
        console.log(`\n--- Fila ${i + 1} (Póliza: ${noPoliza}) ---`);
        console.log(`Estatus raw del Excel:`, estatusRaw);
        console.log(`Estatus procesado:`, excelData.estatus);
        console.log(`Asesor ID extraído:`, excelData.asesor_id);
        console.log(`Datos completos:`, excelData);
      }

      const polizaExistente = polizasMap[noPoliza];

      if (!polizaExistente) {
        // Póliza nueva
        nuevas.push({ fila: i + 2, ...excelData });
      } else {
        // Check for RENOVACION in Folio - ONLY for existing policies
        if (excelData.folio === "RENOVACION" || excelData.folio === "RENOVACIÓN") {
          noActualizadas.push({
            fila: i + 2,
            motivo: "Folio marcado como RENOVACION",
            ...excelData
          });
          continue;
        }

        // Verificar cambios
        const cambiosDetectados = [];

        // Normalizar valores de BD para comparación
        const estatusDB = String(polizaExistente.estatus || "")
          .trim()
          .toUpperCase();
        const ciaDB = String(polizaExistente.cia || "").trim();
        const formaPagoDB = String(polizaExistente.forma_pago || "").trim();
        const fIngresoDB = polizaExistente.f_ingreso
          ? new Date(polizaExistente.f_ingreso).toISOString().split('T')[0]
          : "";
        const fValeRecibidoDB = polizaExistente.f_vale_recibido
          ? new Date(polizaExistente.f_vale_recibido).toISOString().split('T')[0]
          : "";
        const fDesdeDB = polizaExistente.f_desde
          ? new Date(polizaExistente.f_desde).toISOString().split('T')[0]
          : "";
        const fHastaDB = polizaExistente.f_hasta
          ? new Date(polizaExistente.f_hasta).toISOString().split('T')[0]
          : "";


        // Debug log para detectar por qué no se detecta el cambio
        if (i < 3) {
          console.log(`\nPóliza ${noPoliza}:`);
          console.log(`  Estatus DB: "${estatusDB}"`);
          console.log(`  Estatus Excel: "${excelData.estatus}"`);
          console.log(`  ¿Son diferentes?: ${excelData.estatus !== estatusDB}`);
          console.log(`  Asesor ID DB: ${polizaExistente.asesor_id}`);
          console.log(`  Asesor ID Excel: ${excelData.asesor_id}`);
          console.log(
            `  ¿Asesor diferente?: ${parseInt(excelData.asesor_id) !==
            parseInt(polizaExistente.asesor_id || 0)
            }`
          );
        }

        if (excelData.cia && excelData.cia !== ciaDB) {
          cambiosDetectados.push({
            campo: "CIA",
            anterior: ciaDB || "N/A",
            nuevo: excelData.cia,
          });
        }

        if (excelData.forma_pago && excelData.forma_pago !== formaPagoDB) {
          cambiosDetectados.push({
            campo: "Forma Pago",
            anterior: formaPagoDB || "N/A",
            nuevo: excelData.forma_pago,
          });
        }

        if (excelData.f_ingreso && excelData.f_ingreso !== fIngresoDB) {
          cambiosDetectados.push({
            campo: "F. Ingreso",
            anterior: fIngresoDB || "N/A",
            nuevo: excelData.f_ingreso,
          });
        }

        if (excelData.f_vale_recibido && excelData.f_vale_recibido !== fValeRecibidoDB) {
          cambiosDetectados.push({
            campo: "F. Vale Recibido",
            anterior: fValeRecibidoDB || "N/A",
            nuevo: excelData.f_vale_recibido,
          });
        }

        if (excelData.f_desde && excelData.f_desde !== fDesdeDB) {
          cambiosDetectados.push({
            campo: "F. Desde",
            anterior: fDesdeDB || "N/A",
            nuevo: excelData.f_desde,
          });
        }

        if (excelData.f_hasta && excelData.f_hasta !== fHastaDB) {
          cambiosDetectados.push({
            campo: "F. Hasta",
            anterior: fHastaDB || "N/A",
            nuevo: excelData.f_hasta,
          });
        }

        if (
          excelData.prima_total &&
          Math.abs(
            excelData.prima_total - parseFloat(polizaExistente.prima_total || 0)
          ) > 0.01
        ) {
          cambiosDetectados.push({
            campo: "Prima Total",
            anterior: parseFloat(polizaExistente.prima_total || 0).toFixed(2),
            nuevo: excelData.prima_total.toFixed(2),
          });
        }

        if (
          excelData.prima_neta &&
          Math.abs(
            excelData.prima_neta - parseFloat(polizaExistente.prima_neta || 0)
          ) > 0.01
        ) {
          cambiosDetectados.push({
            campo: "Prima Neta",
            anterior: parseFloat(polizaExistente.prima_neta || 0).toFixed(2),
            nuevo: excelData.prima_neta.toFixed(2),
          });
        }

        // Comparar estatus - siempre verificar si hay diferencia, incluso si está vacío
        if (excelData.estatus !== estatusDB) {
          cambiosDetectados.push({
            campo: "Estatus",
            anterior: estatusDB || "N/A",
            nuevo: excelData.estatus || "N/A",
          });
        }

        if (
          excelData.folio &&
          excelData.folio !== String(polizaExistente.folio || "").trim()
        ) {
          cambiosDetectados.push({
            campo: "Folio",
            anterior: String(polizaExistente.folio || "").trim() || "N/A",
            nuevo: excelData.folio,
          });
        }

        if (
          excelData.commission_percentage &&
          Math.abs(
            excelData.commission_percentage -
            parseFloat(polizaExistente.commission_percentage || 0)
          ) > 0.01
        ) {
          cambiosDetectados.push({
            campo: "% Comisión",
            anterior: parseFloat(
              polizaExistente.commission_percentage || 0
            ).toFixed(2),
            nuevo: excelData.commission_percentage.toFixed(2),
          });
        }

        if (
          excelData.quincena &&
          excelData.quincena !== String(polizaExistente.quincena || "").trim()
        ) {
          cambiosDetectados.push({
            campo: "Quincena",
            anterior: String(polizaExistente.quincena || "").trim() || "N/A",
            nuevo: excelData.quincena,
          });
        }

        // Detectar cambio de asesor comparando IDs, pero mostrando nombres
        if (
          excelData.asesor_id &&
          parseInt(excelData.asesor_id) !==
          parseInt(polizaExistente.asesor_id || 0)
        ) {
          const asesorAnteriorObj = asesoresById[polizaExistente.asesor_id];
          const nombreAnterior = asesorAnteriorObj ? asesorAnteriorObj.nombre : (polizaExistente.asesor_id || "Sin Asesor");

          cambiosDetectados.push({
            campo: "Asesor",
            anterior: String(nombreAnterior),
            nuevo: String(excelData.asesor_nombre || excelData.asesor_id),
          });
        }

        if (cambiosDetectados.length > 0) {
          const cambio = {
            id: polizaExistente.id,
            fila: i + 2,
            no_poliza: noPoliza,
            cambios: cambiosDetectados,
            datosNuevos: excelData,
            selected: true, // Por defecto seleccionado para actualizar
          };

          // Detectar si hay cambio en % de comisión
          const cambioComision = cambiosDetectados.find(
            (c) => c.campo === "% Comisión"
          );
          if (cambioComision) {
            cambio.tieneCambioComision = true;
            cambio.cambiarComision = true; // Por defecto activado
            cambio.comisionAnterior = cambioComision.anterior;
            cambio.comisionNueva = cambioComision.nuevo;
          }

          // Detectar si hay cambio de asesor
          const cambioAsesor = cambiosDetectados.find(
            (c) => c.campo === "Asesor"
          );
          if (cambioAsesor) {
            cambio.tieneCambioAsesor = true;
            cambio.duplicarPoliza = false; // Por defecto desactivado, requiere confirmación
            cambio.asesorAnterior = cambioAsesor.anterior;
            cambio.asesorNuevo = cambioAsesor.nuevo;
          }

          // Si es CANCELADA o REEXPEDIDA, marcar para generar descuentos
          if (
            excelData.estatus === "CANCELADA" ||
            excelData.estatus === "REEXPEDIDA"
          ) {
            cambio.requiereDescuento = true;
            cambio.descuento = {
              prima_total: parseFloat(polizaExistente.prima_total || 0),
              prima_neta: parseFloat(polizaExistente.prima_neta || 0),
              comision:
                (parseFloat(polizaExistente.prima_neta || 0) *
                  parseFloat(polizaExistente.commission_percentage || 0)) /
                100,
            };
            if (!polizasConCancelacionSet.has(polizaExistente.id)) {
              canceladas.push(cambio);
            }
          }

          cambios.push(cambio);
        }
      }
    }



    // Identificar pólizas en BD que no vinieron en el Excel
    const noEncontradas = [];
    polizasExistentes.rows.forEach(p => {
      if (!polizasEnExcel.has(String(p.no_poliza))) {
        const asesor = asesoresById[p.asesor_id];
        noEncontradas.push({
          no_poliza: p.no_poliza,
          estatus: p.estatus,
          cia: p.cia,
          asesor_nombre: asesor ? asesor.nombre : 'Sin Asesor',
          prima_total: p.prima_total
        });
      }
    });

    console.log("\n=== RESUMEN DE ANÁLISIS ===");
    console.log(`Total cambios detectados: ${cambios.length}`);
    console.log(`Total nuevas: ${nuevas.length}`);
    console.log(`Total no encontradas en Excel: ${noEncontradas.length}`);
    console.log(`Total cambios detectados: ${cambios.length}`);
    console.log(`Total nuevas: ${nuevas.length}`);
    console.log(`Total no encontradas en Excel: ${noEncontradas.length}`);
    console.log(`Total canceladas: ${canceladas.length}`);
    console.log(`Total no actualizadas (Renovación): ${noActualizadas.length}`);
    if (cambios.length > 0) {
      console.log("\nPrimeros 3 cambios:");
      cambios.slice(0, 3).forEach((c) => {
        console.log(`  - Póliza ${c.no_poliza}: ${c.cambios.length} cambio(s)`);
        c.cambios.forEach((ch) =>
          console.log(`    * ${ch.campo}: ${ch.anterior} → ${ch.nuevo}`)
        );
      });
    }
    console.log("=========================\n");

    return Response.json({
      ok: true,
      cambios,
      nuevas,
      canceladas,
      noEncontradas,
      noActualizadas,
      totalCambios: cambios.length,
      totalNuevas: nuevas.length,
      totalCanceladas: canceladas.length,
      totalNoEncontradas: noEncontradas.length,
      totalNoActualizadas: noActualizadas.length,
      rowsProcessed,
      detectedColumns: jsonData.length > 0 ? Object.keys(jsonData[0]) : [],
    });
  } catch (error) {
    console.error("Error previewing changes:", error);
    return Response.json(
      { ok: false, error: "Error al analizar el archivo" },
      { status: 500 }
    );
  }
}
