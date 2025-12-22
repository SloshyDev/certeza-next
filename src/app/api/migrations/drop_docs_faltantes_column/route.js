import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await query(`
      ALTER TABLE renovaciones 
      DROP COLUMN IF EXISTS documentos_faltantes;
    `);
    return NextResponse.json({
      success: true,
      message: "Columna documentos_faltantes eliminada correctamente",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
