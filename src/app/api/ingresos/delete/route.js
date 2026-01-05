
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { query, isDbConfigured } from "@/lib/db";
import { canEditMesaVales } from "@/lib/roles";

export async function DELETE(req) {
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
        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        }

        const res = await query(`DELETE FROM ingresos WHERE id = $1 RETURNING id`, [id]);

        if (res.rowCount === 0) {
            return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
        }

        return NextResponse.json({ success: true, id: res.rows[0].id });
    } catch (error) {
        console.error("Error deleting ingreso:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
