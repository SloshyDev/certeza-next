import { auth } from "@/../auth";
import { isDbConfigured } from "@/lib/db";
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
  if (!isDbConfigured())
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

        // Validación
        const validRows = [];
        const claves = [];

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const rowNum = i + 2;

          if ((i + 1) % 50 === 0) {
            const progress = 10 + (i / data.length) * 15;
            sendProgress({
              type: "progress",
              message: `Validando fila ${i + 1} de ${data.length}...`,
              progress: Math.round(progress),
            });
          }

          try {
            // Validar no_poliza (convertir explícitamente a string)
            const noPolizaValue = normalizeString(row.no_poliza);

            if (!noPolizaValue) {
              results.errores.push({
                fila: rowNum,
                error: `no_poliza es obligatorio (recibido: '${
                  row.no_poliza
                }', tipo: ${typeof row.no_poliza})`,
              });
              continue;
            }

            // Validar clave_asesor
            const claveAsesorValue = normalizeString(row.clave_asesor);

            if (!claveAsesorValue) {
              results.errores.push({
                fila: rowNum,
                error: `clave_asesor es obligatorio (recibido: '${
                  row.clave_asesor
                }', tipo: ${typeof row.clave_asesor})`,
              });
              continue;
            }

            claves.push(claveAsesorValue);

            validRows.push({
              rowNum,
              no_poliza: noPolizaValue,
              clave_asesor: claveAsesorValue,
              cia: normalizeString(row.cia),
              estatus: normalizeString(row.estatus),
              quincena: normalizeString(row.quincena),
              f_desde: parseDate(row.f_desde),
              f_hasta: parseDate(row.f_hasta),
              f_ingreso: parseDate(row.f_ingreso),
              f_vale_recibido: parseDate(row.f_vale_recibido),
              prima_total: parseNumber(row.prima_total),
              prima_neta: parseNumber(row.prima_neta),
              forma_pago: normalizeString(row.forma_pago),
              folio: normalizeString(row.folio),
            });
          } catch (error) {
            results.errores.push({
              fila: rowNum,
              error: error.message || "Error al validar datos",
            });
          }
        }

        if (validRows.length === 0) {
          sendProgress({
            type: "complete",
            ...results,
            mensaje: "No hay filas válidas para procesar",
            progress: 100,
          });
          controller.close();
          return;
        }

        sendProgress({
          type: "progress",
          message: "Consultando asesores y pólizas existentes...",
          progress: 30,
        });

        // Importar funciones de consulta batch
        const { Pool } = await import("pg");
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });

        const client = await pool.connect();

        try {
          // Consultar asesores y pólizas existentes
          const uniqueClaves = [
            ...new Set(claves.filter((c) => c && c.trim())),
          ];
          const uniquePolizas = [...new Set(validRows.map((r) => r.no_poliza))];

          const [asesoresResult, polizasResult] = await Promise.all([
            client.query("SELECT id, clave FROM asesor WHERE clave = ANY($1)", [
              uniqueClaves,
            ]),
            client.query(
              "SELECT no_poliza FROM polizas WHERE no_poliza = ANY($1)",
              [uniquePolizas]
            ),
          ]);

          const asesoresMap = new Map();
          asesoresResult.rows.forEach((row) =>
            asesoresMap.set(row.clave, row.id)
          );

          const existingPolizasSet = new Set();
          polizasResult.rows.forEach((row) =>
            existingPolizasSet.add(row.no_poliza)
          );

          sendProgress({
            type: "progress",
            message: "Preparando actualizaciones...",
            progress: 40,
          });

          // Preparar solo para UPDATE (no crear nuevas)
          const polizasToUpdate = [];

          for (const row of validRows) {
            const asesorId = asesoresMap.get(row.clave_asesor);

            if (!asesorId) {
              results.errores.push({
                fila: row.rowNum,
                error: `No se encontró asesor con clave: ${row.clave_asesor}`,
              });
              continue;
            }

            // Verificar que la póliza exista
            if (!existingPolizasSet.has(row.no_poliza)) {
              results.errores.push({
                fila: row.rowNum,
                error: `Póliza ${row.no_poliza} no existe en la base de datos (solo se actualizan pólizas existentes)`,
              });
              continue;
            }

            polizasToUpdate.push({
              no_poliza: row.no_poliza,
              asesor_id: parseInt(asesorId, 10),
              cia: row.cia,
              estatus: row.estatus,
              quincena: row.quincena,
              f_desde: row.f_desde,
              f_hasta: row.f_hasta,
              f_ingreso: row.f_ingreso,
              f_vale_recibido: row.f_vale_recibido,
              prima_total: row.prima_total,
              prima_neta: row.prima_neta,
              forma_pago: row.forma_pago,
              folio: row.folio,
            });
          }

          await client.query("BEGIN");

          const CHUNK_SIZE = 100;
          let processed = 0;
          const total = polizasToUpdate.length;

          // Procesar solo UPDATEs en chunks
          for (let i = 0; i < polizasToUpdate.length; i += CHUNK_SIZE) {
            const chunk = polizasToUpdate.slice(i, i + CHUNK_SIZE);

            // Batch update
            const noPolizas = chunk.map((p) => p.no_poliza);
            const values = chunk.flatMap((p) => [
              p.no_poliza,
              p.asesor_id,
              p.cia,
              p.estatus,
              p.quincena,
              p.f_desde,
              p.f_hasta,
              p.f_ingreso,
              p.f_vale_recibido,
              p.prima_total,
              p.prima_neta,
              p.forma_pago,
              p.folio,
            ]);

            const buildCaseWhen = (fieldIndex) => {
              return chunk
                .map(
                  (_, idx) =>
                    `WHEN no_poliza = $${idx * 13 + 1} THEN $${
                      idx * 13 + fieldIndex + 1
                    }`
                )
                .join(" ");
            };

            const updateQuery = `
              UPDATE polizas SET
                asesor_id = (CASE ${buildCaseWhen(1)} END)::INTEGER,
                cia = CASE ${buildCaseWhen(2)} END,
                estatus = CASE ${buildCaseWhen(3)} END,
                quincena = CASE ${buildCaseWhen(4)} END,
                f_desde = (CASE ${buildCaseWhen(5)} END)::DATE,
                f_hasta = (CASE ${buildCaseWhen(6)} END)::DATE,
                f_ingreso = (CASE ${buildCaseWhen(7)} END)::DATE,
                f_vale_recibido = (CASE ${buildCaseWhen(8)} END)::DATE,
                prima_total = (CASE ${buildCaseWhen(9)} END)::NUMERIC,
                prima_neta = (CASE ${buildCaseWhen(10)} END)::NUMERIC,
                forma_pago = CASE ${buildCaseWhen(11)} END,
                folio = CASE ${buildCaseWhen(12)} END,
                f_actualizacion = CURRENT_DATE,
                contador_cambios = COALESCE(contador_cambios, 0) + 1
              WHERE no_poliza = ANY($${values.length + 1})
            `;

            await client.query(updateQuery, [...values, noPolizas]);
            results.actualizadas += chunk.length;
            processed += chunk.length;

            const progress = 40 + (processed / total) * 50;
            sendProgress({
              type: "progress",
              message: `Actualizando pólizas: ${processed} de ${total}...`,
              progress: Math.round(progress),
              actualizadas: results.actualizadas,
              creadas: results.creadas,
            });
          }

          await client.query("COMMIT");

          sendProgress({
            type: "complete",
            ...results,
            mensaje: `Procesadas ${results.total} filas: ${results.actualizadas} actualizadas, ${results.errores.length} errores (no se crean nuevas pólizas)`,
            progress: 100,
          });
        } catch (error) {
          await client.query("ROLLBACK");
          sendProgress({
            type: "error",
            error: error.message || "Error al procesar",
            progress: 0,
          });
        } finally {
          client.release();
          await pool.end();
        }

        controller.close();
      } catch (error) {
        console.error("Error en stream:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: error.message || "Error desconocido",
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
