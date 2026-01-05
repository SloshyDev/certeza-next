import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { query, isDbConfigured } from "@/lib/db";
import { canEditMesaVales } from "@/lib/roles";

export async function POST(req) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canEditMesaVales(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isDbConfigured()) {
        return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const {
            fecha_ingreso,
            asesor_id,
            folio,
            poliza,
            compania,
            tipo_solicitud,
            estatus, // tipo_ingreso_reingreso
            observacion
        } = body;

        // Basic verification
        if (!fecha_ingreso || !asesor_id) {
            return NextResponse.json({ error: "Fecha y Asesor son requeridos" }, { status: 400 });
        }

        const res = await query(
            `INSERT INTO ingresos (
                fecha_ingreso, 
                asesor_id, 
                folio, 
                poliza, 
                compania, 
                tipo_solicitud, 
                tipo_ingreso_reingreso, 
                observacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *`,
            [
                fecha_ingreso,
                asesor_id,
                folio || null,
                poliza || null,
                compania || null,
                tipo_solicitud || null,
                estatus || 'INGRESO',
                observacion || null
            ]
        );

        return NextResponse.json({ success: true, row: res.rows[0] });

    } catch (error) {
        console.error("Error creating ingreso:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
