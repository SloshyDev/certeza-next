import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    await query(`
      ALTER TABLE renovaciones 
      ADD COLUMN IF NOT EXISTS documentos_faltantes TEXT;
    `);
    return NextResponse.json({
      success: true,
      message: "Columna documentos_faltantes agregada correctamente",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
