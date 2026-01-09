import { auth } from "@/../auth";
import { isExtractorDbConfigured, query } from "@/lib/extractor-db";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

/**
 * Convierte valor de Excel a número
 * @param {any} value - Valor a convertir
 * @returns {number|null}
 */
function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Normaliza string: trim y convierte vacío a null
 * @param {any} value - Valor a normalizar
 * @returns {string|null}
 */
function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === "" || str === "undefined" ? null : str;
}

/**
 * Convierte fecha de formato DD/MM/YYYY a YYYY-MM-DD
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === "") return null;

  const str = String(dateStr).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

/**
 * POST /api/polizas/upload-stream
 * Procesa archivo con actualizaciones de progreso en tiempo real
 */
export async function POST(req) {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  if (!isExtractorDbConfigured())
    return new Response("DB_NOT_CONFIGURED", { status: 500 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const sendProgress = (data) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        const formData = await req.formData();
        const file = formData.get("file");

        if (!file) {
          sendProgress({
            type: "error",
            error: "No se proporcionó ningún archivo",
            progress: 0,
          });
          controller.close();
          return;
        }

        sendProgress({
          type: "progress",
          message: "Leyendo archivo...",
          progress: 5,
        });

        // Leer archivo Excel (raw: true mantiene valores como texto)
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const workbook = XLSX.read(buffer, {
          type: "buffer",
          cellText: true,
          raw: false,
        });

        const sheetName =
          workbook.SheetNames.find(
            (name) =>
              name !== "INSTRUCCIONES" && name !== "Referencia de Campos"
          ) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, {
          raw: false,
          defval: "",
          blankrows: false,
        });

        if (data.length === 0) {
          sendProgress({
            type: "error",
            error: "El archivo Excel está vacío",
            progress: 0,
          });
          controller.close();
          return;
        }

        sendProgress({
          type: "progress",
          message: `Validando ${data.length} filas...`,
          progress: 10,
        });

        const results = {
          total: data.length,
          actualizadas: 0,
          creadas: 0,
          errores: [],
        };

        // Procesar cada fila
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const rowNum = i + 2;

          if ((i + 1) % 10 === 0) {
            const progress = 10 + (i / data.length) * 80;
            sendProgress({
              type: "progress",
              message: `Procesando fila ${i + 1} de ${data.length}...`,
              progress: Math.round(progress),
            });
          }

          try {
            // Validar campos obligatorios
            const noPoliza = normalizeString(row.no_poliza);
            const claveAsesor = normalizeString(row.clave_asesor);

            if (!noPoliza) {
              results.errores.push({
                fila: rowNum,
                error: "no_poliza es obligatorio",
              });
              continue;
            }

            if (!claveAsesor) {
              results.errores.push({
                fila: rowNum,
                error: "clave_asesor es obligatorio",
              });
              continue;
            }

            // ============================================================================
            // 1. Resolver IDs de catálogos (Asesor, Aseguradora, Forma Pago)
            // ============================================================================
            
            // Buscar asesor
            const asesorResult = await query(
              "SELECT id_asesor FROM asesores WHERE clave_asesor = $1",
              [claveAsesor]
            );
            
            if (asesorResult.rows.length === 0) {
              results.errores.push({
                fila: rowNum,
                error: `Asesor no encontrado: ${claveAsesor}`,
              });
              continue;
            }
            const idAsesor = asesorResult.rows[0].id_asesor;

            // Buscar aseguradora (si se proporciona)
            let idAseguradora = null;
            const cia = normalizeString(row.cia);
            if (cia) {
              // Intentar buscar exacta o similar
              const ciaResult = await query(
                "SELECT id_aseguradora FROM aseguradoras WHERE nombre ILIKE $1",
                [`%${cia}%`]
              );
              
              if (ciaResult.rows.length > 0) {
                idAseguradora = ciaResult.rows[0].id_aseguradora;
              } else {
                // Crear si no existe (opcional, aquí asumimos que debe existir o creamos una genérica)
                const newCia = await query(
                  "INSERT INTO aseguradoras (nombre) VALUES ($1) RETURNING id_aseguradora",
                  [cia]
                );
                idAseguradora = newCia.rows[0].id_aseguradora;
              }
            }

            // Buscar forma de pago (si se proporciona)
            let idFormaPago = null;
            const formaPago = normalizeString(row.forma_pago);
            if (formaPago) {
              const fpResult = await query(
                "SELECT id_forma_pago FROM formas_pago WHERE nombre ILIKE $1",
                [`%${formaPago}%`]
              );
              
              if (fpResult.rows.length > 0) {
                idFormaPago = fpResult.rows[0].id_forma_pago;
              } else {
                // Default a alguna forma de pago o crear
                const newFp = await query(
                  "INSERT INTO formas_pago (nombre, numero_recibos) VALUES ($1, 1) RETURNING id_forma_pago",
                  [formaPago]
                );
                idFormaPago = newFp.rows[0].id_forma_pago;
              }
            }

            // ============================================================================
            // 2. Insertar o actualizar ASEGURADO
            // ============================================================================
            let idAsegurado = null;
            const nombreAsegurado = normalizeString(row.nombre_asegurado);
            const rfc = normalizeString(row.rfc);

            if (nombreAsegurado) {
              const aseguradoExistente = await query(
                `SELECT id_asegurado FROM asegurados 
                 WHERE nombre = $1 OR (rfc = $2 AND rfc IS NOT NULL)
                 LIMIT 1`,
                [nombreAsegurado, rfc || null]
              );

              if (aseguradoExistente.rows.length > 0) {
                idAsegurado = aseguradoExistente.rows[0].id_asegurado;
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
                    idAsegurado,
                    rfc,
                    normalizeString(row.direccion),
                    normalizeString(row.telefono),
                    normalizeString(row.numero_empleado),
                    normalizeString(row.tipo_trabajador),
                  ]
                );
              } else {
                const newAsegurado = await query(
                  `INSERT INTO asegurados (nombre, rfc, direccion, telefono, numero_empleado, tipo_trabajador)
                   VALUES ($1, $2, $3, $4, $5, $6)
                   RETURNING id_asegurado`,
                  [
                    nombreAsegurado,
                    rfc,
                    normalizeString(row.direccion),
                    normalizeString(row.telefono),
                    normalizeString(row.numero_empleado),
                    normalizeString(row.tipo_trabajador),
                  ]
                );
                idAsegurado = newAsegurado.rows[0].id_asegurado;
              }
            }

            // ============================================================================
            // 3. Insertar o actualizar VEHÍCULO
            // ============================================================================
            let idVehiculo = null;
            const placas = normalizeString(row.placas);
            const serie = normalizeString(row.numero_serie);
            const descUnidad = normalizeString(row.descripcion_unidad);

            if (descUnidad || placas || serie) {
              const vehiculoExistente = await query(
                `SELECT id_vehiculo FROM vehiculos 
                 WHERE (placas = $1 AND placas IS NOT NULL) 
                    OR (numero_serie = $2 AND numero_serie IS NOT NULL)
                 LIMIT 1`,
                [placas, serie]
              );

              if (vehiculoExistente.rows.length > 0) {
                idVehiculo = vehiculoExistente.rows[0].id_vehiculo;
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
                    idVehiculo,
                    idAsegurado, // Asociar con el asegurado procesado (si existe)
                    descUnidad,
                    normalizeString(row.modelo),
                    normalizeString(row.tipo_vehiculo),
                    placas,
                    serie,
                    normalizeString(row.numero_motor),
                  ]
                );
              } else {
                const newVehiculo = await query(
                  `INSERT INTO vehiculos (id_asegurado, descripcion_unidad, modelo, tipo, placas, numero_serie, numero_motor)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)
                   RETURNING id_vehiculo`,
                  [
                    idAsegurado,
                    descUnidad,
                    normalizeString(row.modelo),
                    normalizeString(row.tipo_vehiculo),
                    placas,
                    serie,
                    normalizeString(row.numero_motor),
                  ]
                );
                idVehiculo = newVehiculo.rows[0].id_vehiculo;
              }
            }

            // ============================================================================
            // 4. Insertar o actualizar PÓLIZA
            // ============================================================================
            
            // Verificar si existe la póliza
            const polizaExistente = await query(
              "SELECT id_poliza FROM polizas WHERE numero_poliza = $1 LIMIT 1",
              [noPoliza]
            );

            if (polizaExistente.rows.length > 0) {
              // Actualizar
              await query(
                `UPDATE polizas
                 SET id_asegurado = COALESCE($2, id_asegurado),
                     id_vehiculo = COALESCE($3, id_vehiculo),
                     id_aseguradora = COALESCE($4, id_aseguradora),
                     id_asesor = $5,
                     id_forma_pago = COALESCE($6, id_forma_pago),
                     fecha_desde = COALESCE($7, fecha_desde),
                     fecha_hasta = COALESCE($8, fecha_hasta),
                     fecha_emision = COALESCE($9, fecha_emision),
                     prima_neta = COALESCE($10, prima_neta),
                     prima_total = COALESCE($11, prima_total),
                     ubicacion = COALESCE($12, ubicacion),
                     estado = COALESCE($13, estado),
                     numero_folio = COALESCE($14, numero_folio),
                     updated_at = NOW()
                 WHERE id_poliza = $1`,
                [
                  polizaExistente.rows[0].id_poliza,
                  idAsegurado,
                  idVehiculo,
                  idAseguradora,
                  idAsesor,
                  idFormaPago,
                  parseDate(row.f_desde),
                  parseDate(row.f_hasta),
                  parseDate(row.f_ingreso), // Usamos f_ingreso como fecha_emision por simplicidad si no hay otra
                  parseNumber(row.prima_neta),
                  parseNumber(row.prima_total),
                  null, // ubicacion no viene en el excel explícitamente, o podríamos mapearlo
                  normalizeString(row.estatus),
                  normalizeString(row.folio)
                ]
              );
              results.actualizadas++;
            } else {
              // Insertar
              await query(
                `INSERT INTO polizas (
                  numero_poliza, id_asegurado, id_vehiculo, id_aseguradora, id_asesor,
                  id_forma_pago, fecha_desde, fecha_hasta, fecha_emision,
                  prima_neta, prima_total, estado, numero_folio
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                  noPoliza,
                  idAsegurado,
                  idVehiculo,
                  idAseguradora,
                  idAsesor,
                  idFormaPago,
                  parseDate(row.f_desde),
                  parseDate(row.f_hasta),
                  parseDate(row.f_ingreso),
                  parseNumber(row.prima_neta),
                  parseNumber(row.prima_total),
                  normalizeString(row.estatus) || 'ACTIVA',
                  normalizeString(row.folio)
                ]
              );
              results.creadas++;
            }

            // ============================================================================
            // 5. Insertar VALES (si aplica)
            // ============================================================================
            const noVale = normalizeString(row.no_vale);
            if (noVale) {
              // Necesitamos el ID de la póliza (recién creada o actualizada)
              const polizaIdRes = await query(
                "SELECT id_poliza FROM polizas WHERE numero_poliza = $1 LIMIT 1",
                [noPoliza]
              );
              
              if (polizaIdRes.rows.length > 0) {
                const idPoliza = polizaIdRes.rows[0].id_poliza;
                
                // Verificar si existe el vale
                const valeExistente = await query(
                  "SELECT id_vale FROM vales WHERE numero_vale = $1 AND id_poliza = $2",
                  [noVale, idPoliza]
                );

                if (valeExistente.rows.length === 0) {
                  await query(
                    `INSERT INTO vales (id_poliza, numero_vale, fecha_ingreso_vales, quincena, estado_vale)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [
                      idPoliza,
                      noVale,
                      parseDate(row.f_vale_recibido),
                      normalizeString(row.quincena),
                      'Pendiente'
                    ]
                  );
                }
              }
            }

          } catch (error) {
            console.error(`Error en fila ${rowNum}:`, error);
            results.errores.push({
              fila: rowNum,
              error: error.message || "Error desconocido al procesar fila",
            });
          }
        }

        sendProgress({
          type: "complete",
          message: "Proceso completado",
          progress: 100,
          results,
        });
        controller.close();
      } catch (error) {
        console.error("Error general:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: error.message || "Error interno del servidor",
              progress: 0,
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
