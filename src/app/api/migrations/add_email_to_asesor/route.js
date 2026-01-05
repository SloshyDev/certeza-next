
import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
    try {
        await query(`
      ALTER TABLE asesor 
      ADD COLUMN IF NOT EXISTS email TEXT;
    `);
        return NextResponse.json({
            success: true,
            message: "Columna email agregada a tabla asesor correctamente",
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
