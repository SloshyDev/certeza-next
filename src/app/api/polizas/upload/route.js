import { auth } from "@/../auth";
import { isDbConfigured, query } from "@/lib/db";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300; // 5 minutos para archivos grandes

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
 * @param {string} dateStr - Fecha en formato DD/MM/YYYY
 * @returns {string|null} - Fecha en formato YYYY-MM-DD o null
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === "") return null;

  const str = String(dateStr).trim();

  // Si ya está en formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Formato DD/MM/YYYY
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

/**
 * Busca múltiples asesores por sus claves en una sola consulta
 * @param {string[]} claves - Array de claves de asesores
 * @returns {Promise<Map<string, number>>} - Mapa de clave -> id
 */
async function getAsesoresByClaves(claves) {
  if (!claves || claves.length === 0) return new Map();

  const uniqueClaves = [...new Set(claves.filter((c) => c && c.trim()))];

  const result = await query(
    "SELECT id, clave FROM asesor WHERE clave = ANY($1)",
    [uniqueClaves]
  );

  const map = new Map();
  result.rows.forEach((row) => {
    map.set(row.clave, row.id);
  });

  return map;
}

/**
 * Busca múltiples pólizas existentes en una sola consulta
 * @param {string[]} noPolizas - Array de números de póliza
 * @returns {Promise<Set<string>>} - Set de no_poliza existentes
 */
async function getExistingPolizas(noPolizas) {
  if (!noPolizas || noPolizas.length === 0) return new Set();

  const uniquePolizas = [
    ...new Set(noPolizas.filter((p) => p && p.trim())),
  ].map((p) => String(p));

  const result = await query(
    "SELECT no_poliza FROM polizas WHERE no_poliza::text = ANY($1::text[])",
    [uniquePolizas]
  );

  const set = new Set();
  result.rows.forEach((row) => {
    set.add(String(row.no_poliza));
  });

  return set;
}

/**
 * Actualiza pólizas en batch usando CASE WHEN
 */
async function batchUpdatePolizas(polizasToUpdate, client) {
  if (polizasToUpdate.length === 0) return;

  const noPolizas = polizasToUpdate.map((p) => p.no_poliza);

  // Construir query con CASE WHEN para cada campo
  const buildCaseWhen = (field) => {
    return polizasToUpdate
      .map(
        (_, idx) =>
          `WHEN no_poliza = $${idx * 13 + 1} THEN $${
            idx * 13 +
            (field === "asesor_id"
              ? 2
              : field === "cia"
              ? 3
              : field === "estatus"
              ? 4
              : field === "quincena"
              ? 5
              : field === "f_desde"
              ? 6
              : field === "f_hasta"
              ? 7
              : field === "f_ingreso"
              ? 8
              : field === "f_vale_recibido"
              ? 9
              : field === "prima_total"
              ? 10
              : field === "prima_neta"
              ? 11
              : field === "forma_pago"
              ? 12
              : 13)
          }`
      )
      .join(" ");
  };

  const values = polizasToUpdate.flatMap((p) => [
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

  const updateQuery = `
    UPDATE polizas SET
      asesor_id = (CASE ${buildCaseWhen("asesor_id")} END)::INTEGER,
      cia = CASE ${buildCaseWhen("cia")} END,
      estatus = CASE ${buildCaseWhen("estatus")} END,
      quincena = CASE ${buildCaseWhen("quincena")} END,
      f_desde = (CASE ${buildCaseWhen("f_desde")} END)::DATE,
      f_hasta = (CASE ${buildCaseWhen("f_hasta")} END)::DATE,
      f_ingreso = (CASE ${buildCaseWhen("f_ingreso")} END)::DATE,
      f_vale_recibido = (CASE ${buildCaseWhen("f_vale_recibido")} END)::DATE,
      prima_total = (CASE ${buildCaseWhen("prima_total")} END)::NUMERIC,
      prima_neta = (CASE ${buildCaseWhen("prima_neta")} END)::NUMERIC,
      forma_pago = CASE ${buildCaseWhen("forma_pago")} END,
      folio = CASE ${buildCaseWhen("folio")} END,
      f_actualizacion = CURRENT_DATE,
      contador_cambios = COALESCE(contador_cambios, 0) + 1
    WHERE no_poliza = ANY($${values.length + 1})
  `;

  await client.query(updateQuery, [...values, noPolizas]);
}

/**
 * Crea pólizas en batch usando INSERT múltiple
 */
async function batchInsertPolizas(polizasToCreate, userEmail, client) {
  if (polizasToCreate.length === 0) return;

  const valuePlaceholders = polizasToCreate
    .map((_, idx) => {
      const base = idx * 14;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${
        base + 5
      }, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${
        base + 10
      }, $${base + 11}, $${base + 12}, $${base + 13}, $${base + 14})`;
    })
    .join(", ");

  const values = polizasToCreate.flatMap((p) => [
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
    userEmail,
  ]);

  const insertQuery = `
    INSERT INTO polizas (
      no_poliza, asesor_id, cia, estatus, quincena,
      f_desde, f_hasta, f_ingreso, f_vale_recibido,
      prima_total, prima_neta, forma_pago, folio,
      created_by
    ) VALUES ${valuePlaceholders}
  `;

  await client.query(insertQuery, values);
}

/**
 * POST /api/polizas/upload
 * Procesa un archivo Excel y actualiza pólizas masivamente con operaciones batch
 */
export async function POST(req) {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  if (!isDbConfigured())
    return new Response("DB_NOT_CONFIGURED", { status: 500 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json(
        { ok: false, error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Leer archivo Excel (raw: false mantiene valores como texto)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellText: true,
      raw: false,
    });

    // Obtener la primera hoja (asumiendo que los datos están ahí)
    const sheetName =
      workbook.SheetNames.find(
        (name) => name !== "INSTRUCCIONES" && name !== "Referencia de Campos"
      ) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: "",
      blankrows: false,
    });

    if (data.length === 0) {
      return Response.json(
        { ok: false, error: "El archivo Excel está vacío" },
        { status: 400 }
      );
    }

    const results = {
      total: data.length,
      actualizadas: 0,
      creadas: 0,
      errores: [],
    };

    // Fase 1: Validación y preparación de datos (rápido, sin DB)
    const validRows = [];
    const claves = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2;

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

        // Convertir fechas
        const f_desde = parseDate(row.f_desde);
        const f_hasta = parseDate(row.f_hasta);
        const f_ingreso = parseDate(row.f_ingreso);
        const f_vale_recibido = parseDate(row.f_vale_recibido);

        validRows.push({
          rowNum,
          no_poliza: noPolizaValue,
          clave_asesor: claveAsesorValue,
          cia: normalizeString(row.cia),
          estatus: normalizeString(row.estatus),
          quincena: normalizeString(row.quincena),
          f_desde,
          f_hasta,
          f_ingreso,
          f_vale_recibido,
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
      return Response.json({
        ok: false,
        error: "No hay filas válidas para procesar",
        ...results,
      });
    }

    // Fase 2: Consultas batch (asesores y pólizas existentes)
    const [asesoresMap, existingPolizasSet] = await Promise.all([
      getAsesoresByClaves(claves),
      getExistingPolizas(validRows.map((r) => r.no_poliza)),
    ]);

    // Fase 3: Preparar solo para UPDATE (no crear nuevas)
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
      if (!existingPolizasSet.has(String(row.no_poliza))) {
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

    // Fase 4: Operaciones UPSERT batch en transacción
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const CHUNK_SIZE = 100;

      // Procesar solo UPDATEs (no crear nuevas)
      for (let i = 0; i < polizasToUpdate.length; i += CHUNK_SIZE) {
        const chunk = polizasToUpdate.slice(i, i + CHUNK_SIZE);
        await batchUpdatePolizas(chunk, client);
        results.actualizadas += chunk.length;
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      await pool.end();
    }

    return Response.json({
      ok: true,
      ...results,
      mensaje: `Procesadas ${results.total} filas: ${results.actualizadas} actualizadas, ${results.errores.length} errores (no se crean nuevas pólizas)`,
    });
  } catch (error) {
    console.error("Error procesando archivo:", error);
    return Response.json(
      {
        ok: false,
        error: "Error al procesar el archivo",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
