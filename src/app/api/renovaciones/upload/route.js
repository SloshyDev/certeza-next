import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { query } from "@/lib/db";
import { auth } from "@/../auth";
import { isAdmin, isCoordinador } from "@/lib/roles";

export async function POST(req) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isAdmin(session) && !isCoordinador(session)) {
    return NextResponse.json(
      { error: "No tienes permisos para realizar esta acción" },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws);

    if (data.length === 0) {
      return NextResponse.json(
        { error: "El archivo está vacío o no tiene datos válidos" },
        { status: 400 }
      );
    }

    const asesoresRes = await query("SELECT id, clave FROM asesor");
    const asesoresMap = new Map();
    asesoresRes.rows.forEach((a) => {
      if (a.clave) asesoresMap.set(String(a.clave).trim().toUpperCase(), a.id);
    });

    let inserted = 0;
    let errors = [];

    const firstRow = data[0];
    if (!("POLIZA" in firstRow) || !("MES" in firstRow)) {
      return NextResponse.json(
        { error: "El archivo no tiene las columnas requeridas: POLIZA, MES" },
        { status: 400 }
      );
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +1 por 0-index, +1 por header

      const poliza = row["POLIZA"] ? String(row["POLIZA"]).trim() : null;
      const mes = row["MES"] ? String(row["MES"]).trim().toUpperCase() : null;
      const estatus = row["ESTATUS"]
        ? String(row["ESTATUS"]).trim().toUpperCase()
        : "PENDIENTE";
      const claveAsesor =
        row["CLAVE"] || row["CLAVE_ASESOR"] || row["clave_asesor"]
          ? String(
            row["CLAVE"] || row["CLAVE_ASESOR"] || row["clave_asesor"]
          ).trim()
          : null;

      if (!poliza || !mes) {
        errors.push(`Fila ${rowNum}: Falta Póliza o Mes`);
        continue;
      }

      let asesorId = null;
      if (claveAsesor) {
        const normClave = claveAsesor.toUpperCase();
        if (asesoresMap.has(normClave)) {
          asesorId = asesoresMap.get(normClave);
        } else {
          errors.push(
            `Fila ${rowNum}: Asesor con clave '${claveAsesor}' no encontrado en el sistema`
          );
        }
      }

      try {
        // Insertar registro
        // Nota: Ajustar según esquema real si hay más campos o si 'created_at' no existe.
        // Asumo tabla 'renovaciones' columnas: poliza, mes, estatus, asesor_id
        await query(
          `INSERT INTO renovaciones (poliza, mes, estatus, asesor_id) 
             VALUES ($1, $2, $3, $4)`,
          [poliza, mes, estatus, asesorId]
        );
        inserted++;
      } catch (e) {
        console.error(`Error insertando fila ${rowNum}:`, e);
        errors.push(`Fila ${rowNum}: Error al guardar en base de datos`);
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      errorCount: errors.length,
      errors: errors.slice(0, 100), // Limitar tamaño de respuesta
    });
  } catch (error) {
    console.error("Error procesando upload:", error);
    return NextResponse.json(
      { error: "Error interno del servidor procesando el archivo" },
      { status: 500 }
    );
  }
}
