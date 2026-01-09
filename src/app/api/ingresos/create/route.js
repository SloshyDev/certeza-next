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
            fecha_ingreso_digital,
            asesor_id,
            folio,
            poliza,
            compania,
            tipo_solicitud,
            estatus, // tipo_ingreso_reingreso
            observacion
        } = body;

        // Basic verification
        if (!fecha_ingreso_digital || !asesor_id) {
            return NextResponse.json({ error: "Fecha y Asesor son requeridos" }, { status: 400 });
        }

        // Check for duplicates
        if (folio && !body.confirmDuplicate) {
            const existingFolio = await query(
                `SELECT i.id, i.folio, i.poliza, i.compania, i.fecha_ingreso_digital, 
                        i.tipo_ingreso_reingreso, a.nombre as asesor_nombre
                 FROM ingresos i
                 LEFT JOIN asesor a ON i.asesor_id = a.id
                 WHERE i.folio = $1`,
                [folio]
            );
            if (existingFolio.rowCount > 0) {
                const duplicate = existingFolio.rows[0];
                return NextResponse.json({
                    error: `El folio ${folio} ya está registrado`,
                    isDuplicate: true,
                    duplicateData: {
                        folio: duplicate.folio,
                        poliza: duplicate.poliza || 'N/A',
                        compania: duplicate.compania || 'N/A',
                        asesor: duplicate.asesor_nombre || 'N/A',
                        fecha: duplicate.fecha_ingreso_digital,
                        estatus: duplicate.tipo_ingreso_reingreso || 'N/A'
                    }
                }, { status: 409 });
            }
        }

        if (poliza) {
            const existingPoliza = await query(`SELECT id FROM ingresos WHERE poliza = $1`, [poliza]);
            if (existingPoliza.rowCount > 0) {
                return NextResponse.json({ error: `La póliza ${poliza} ya está registrada` }, { status: 400 });
            }
        }

        const res = await query(
            `INSERT INTO ingresos (
                fecha_ingreso_digital, 
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
                fecha_ingreso_digital,
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
