import { NextResponse } from "next/server";
import { query, isDbConfigured } from "@/lib/db";

export async function GET() {
  try {
    if (!isDbConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Base de datos no configurada",
      });
    }

    // Verificar qué tablas existen
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    // Verificar estructura de asegurados si existe
    let aseguradosInfo = null;
    try {
      const columnsResult = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'asegurados'
        ORDER BY ordinal_position
      `);
      aseguradosInfo = columnsResult.rows;
    } catch (e) {
      aseguradosInfo = { error: e.message };
    }

    return NextResponse.json({
      success: true,
      tables: tablesResult.rows.map((r) => r.table_name),
      aseguradosInfo,
      connectionString: process.env.DATABASE_URL
        ? "✓ Configurado"
        : "✗ No configurado",
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}
