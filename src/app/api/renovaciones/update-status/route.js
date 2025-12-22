import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { query } from "@/lib/db";
import { auth } from "@/../auth";

export async function POST(req) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const roles = session.user?.roles || [];
  if (!roles.includes("admin") && !roles.includes("coordinador")) {
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

    const updates = [];

    // Iterar sobre los datos y preparar actualizaciones
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Búsqueda flexible de columnas
      const keys = Object.keys(row);
      // Busca columna que contenga "POLIZA" (case insensitive)
      const polizaKey = keys.find((k) => k.toUpperCase().includes("POLIZA"));
      // Busca columna que contenga "DOCUMENTOS" o "FALTANTES"
      const docsKey = keys.find(
        (k) =>
          k.toUpperCase().includes("DOCUMENTOS") ||
          k.toUpperCase().includes("FALTANTES")
      );

      if (!polizaKey) continue;

      const poliza = String(row[polizaKey]).trim();
      const rawStatus = docsKey
        ? String(row[docsKey] || "")
            .trim()
            .toUpperCase()
        : "";

      let estatus = "PENDIENTE";

      // Lógica de mapeo basada en las instrucciones del componente
      if (!rawStatus) {
        estatus = "PENDIENTE";
      } else if (
        rawStatus.includes("RECHAZO") ||
        rawStatus.includes("FALTAN")
      ) {
        estatus = "PENDIENTE";
      } else if (rawStatus === "FOLIO COMPLETO") {
        estatus = "COLOCADA";
      } else if (rawStatus.startsWith("CANCEL")) {
        estatus = "CANCELADA";
      } else if (rawStatus.startsWith("REEXPED")) {
        estatus = "REEXPEDIDA";
      } else {
        // Si no coincide con reglas específicas, usamos el valor tal cual (o PENDIENTE si se prefiere)
        // La instrucción decía "Otros valores se guardan tal cual como estatus"
        estatus = rawStatus;
      }

      updates.push({ poliza, estatus });
    }

    if (updates.length === 0) {
      return NextResponse.json({ updated: 0, success: true, notFound: 0 });
    }

    // Batch Update usando VALUES para eficiencia
    // Postgres: UPDATE table SET ... FROM (VALUES ...) WHERE ...

    const valuesClause = updates
      .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
      .join(", ");

    const params = updates.flatMap((u) => [u.poliza, u.estatus]);

    const queryStr = `
      UPDATE renovaciones AS t 
      SET estatus = c.estatus 
      FROM (VALUES ${valuesClause}) AS c(poliza, estatus) 
      WHERE t.poliza = c.poliza
    `;

    const res = await query(queryStr, params);

    const updatedCount = res.rowCount || 0;
    const notFoundCount = updates.length - updatedCount;

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      notFound: notFoundCount > 0 ? notFoundCount : 0,
    });
  } catch (error) {
    console.error("Error processing update-status:", error);
    return NextResponse.json(
      { error: "Error interno del servidor procesando el archivo" },
      { status: 500 }
    );
  }
}
