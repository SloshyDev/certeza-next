import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { query, isDbConfigured } from "@/lib/db";
import { isAdminArea, canEditMesaVales } from "@/lib/roles";

const ALLOWED_FIELDS = {
    estatus: "tipo_ingreso_reingreso",
    folio: "folio",
    poliza: "poliza",
    compania: "compania",
    observacion: "observacion",
    tipo_solicitud: "tipo_solicitud",
    fecha_ingreso: "fecha_ingreso",
    fecha_ingreso_digital: "fecha_ingreso_digital",
    fecha_comercial: "fecha_comercial",
    fecha_mesa_vales: "fecha_mesa_vales",
    asesor_id: "asesor_id",
};

export async function PATCH(req) {
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
        const { id, field, value } = body;

        if (!id || !field) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        const dbColumn = ALLOWED_FIELDS[field];
        if (!dbColumn) {
            return NextResponse.json({ error: "Invalid field" }, { status: 400 });
        }

        // Update query
        const res = await query(
            `UPDATE ingresos SET ${dbColumn} = $1 WHERE id = $2 RETURNING *`,
            [value, id]
        );

        if (res.rowCount === 0) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, row: res.rows[0] });
    } catch (error) {
        console.error("Error updating ingresos:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
