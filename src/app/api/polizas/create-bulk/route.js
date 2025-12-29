import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { query, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/polizas/create-bulk
 * Crea pólizas masivamente desde un Excel con no_poliza y asesor_id
 */
export async function POST(req) {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Base de datos no configurada" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Leer archivo Excel
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellText: true,
      raw: false,
      defval: "",
    });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "El archivo está vacío" },
        { status: 400 }
      );
    }

    // Validar columnas requeridas
    const firstRow = rows[0];
    const hasNoPoliza = "no_poliza" in firstRow;
    const hasAsesorId = "asesor_id" in firstRow;

    if (!hasNoPoliza || !hasAsesorId) {
      return NextResponse.json(
        {
          ok: false,
          error: "El archivo debe contener las columnas: no_poliza, asesor_id",
        },
        { status: 400 }
      );
    }

    const errores = [];
    const polizasToCreate = [];
    const seenPolizas = new Map(); // Track duplicates within the file

    // Validar y preparar datos
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 porque la fila 1 son los headers

      const no_poliza = String(row.no_poliza || "").trim();
      const asesor_id = String(row.asesor_id || "").trim();

      // Validar campos obligatorios
      if (!no_poliza) {
        errores.push(`Fila ${rowNum}: no_poliza es obligatorio`);
        continue;
      }

      if (!asesor_id) {
        errores.push(`Fila ${rowNum}: asesor_id es obligatorio`);
        continue;
      }

      // Validar que asesor_id sea un número
      const asesorIdNum = parseInt(asesor_id, 10);
      if (isNaN(asesorIdNum)) {
        errores.push(`Fila ${rowNum}: asesor_id debe ser un número válido`);
        continue;
      }

      // Check for duplicates within the file
      if (seenPolizas.has(no_poliza)) {
        errores.push(
          `Fila ${rowNum}: La póliza ${no_poliza} está duplicada en el archivo (ya vista en fila ${seenPolizas.get(
            no_poliza
          )})`
        );
        continue;
      }

      seenPolizas.set(no_poliza, rowNum);

      polizasToCreate.push({
        no_poliza,
        asesor_id: asesorIdNum,
        rowNum,
      });
    }

    // Si hay errores críticos, retornar sin procesar
    if (polizasToCreate.length === 0) {
      return NextResponse.json({
        ok: true,
        creadas: 0,
        errores,
      });
    }

    // Obtener IDs de asesores válidos
    const asesorIds = [...new Set(polizasToCreate.map((p) => p.asesor_id))];
    const asesoresResult = await query(
      `SELECT id FROM asesor WHERE id = ANY($1::int[])`,
      [asesorIds]
    );
    const validAsesorIds = new Set(asesoresResult.rows.map((r) => r.id));

    // Validar que los asesores existan
    for (const poliza of polizasToCreate) {
      if (!validAsesorIds.has(poliza.asesor_id)) {
        errores.push(
          `Fila ${poliza.rowNum}: El asesor con ID ${poliza.asesor_id} no existe`
        );
      }
    }

    // Filtrar pólizas válidas
    const polizasValidas = polizasToCreate.filter((p) =>
      validAsesorIds.has(p.asesor_id)
    );

    if (polizasValidas.length === 0) {
      return NextResponse.json({
        ok: true,
        creadas: 0,
        errores,
      });
    }

    // Verificar pólizas duplicadas
    const noPolizas = polizasValidas.map((p) => p.no_poliza);
    const existingResult = await query(
      `SELECT no_poliza FROM polizas WHERE no_poliza = ANY($1::text[])`,
      [noPolizas]
    );
    const existingPolizas = new Set(
      existingResult.rows.map((r) => r.no_poliza)
    );

    // Filtrar solo las que no existen
    const polizasNoExistentes = polizasValidas.filter(
      (p) => !existingPolizas.has(p.no_poliza)
    );

    // Agregar errores de duplicados
    for (const poliza of polizasValidas) {
      if (existingPolizas.has(poliza.no_poliza)) {
        errores.push(
          `Fila ${poliza.rowNum}: La póliza ${poliza.no_poliza} ya existe`
        );
      }
    }

    if (polizasNoExistentes.length === 0) {
      return NextResponse.json({
        ok: true,
        creadas: 0,
        errores,
      });
    }

    // Insertar pólizas
    const values = [];
    const placeholders = [];
    let paramIndex = 1;

    for (let i = 0; i < polizasNoExistentes.length; i++) {
      const poliza = polizasNoExistentes[i];
      placeholders.push(`($${paramIndex}, $${paramIndex + 1})`);
      values.push(poliza.no_poliza, poliza.asesor_id);
      paramIndex += 2;
    }

    await query(
      `INSERT INTO polizas (no_poliza, asesor_id)
       VALUES ${placeholders.join(", ")}`,
      values
    );

    return NextResponse.json({
      ok: true,
      creadas: polizasNoExistentes.length,
      errores,
    });
  } catch (error) {
    console.error("Error creating polizas:", error);
    return NextResponse.json(
      { ok: false, error: "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
