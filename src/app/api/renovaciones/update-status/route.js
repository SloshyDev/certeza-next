import { NextResponse } from "next/server";

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
    const body = await req.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron datos para actualizar" },
        { status: 400 }
      );
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
    // Note: In a batch update like this, we can't easily count "notFound" without a separate query.
    // The frontend logic for "chunk 0" success implies we just need to return success.

    return NextResponse.json({
      success: true,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Error processing update-status:", error);
    return NextResponse.json(
      { error: "Error interno del servidor procesando la actualización" },
      { status: 500 }
    );
  }
}
