import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { query, isDbConfigured } from "@/lib/db";
import { isAdminArea } from "@/lib/roles";

export async function PATCH(req) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Optional: Enforce specific roles if needed. 
    // For now, assuming anyone who can access the page can edit, 
    // or restrict to admin area users if standard practice.
    // The user didn't specify restrictions, but typically updates are restricted.
    if (!isAdminArea(session)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isDbConfigured()) {
        return NextResponse.json({ error: "DB not configured" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { id, estatus } = body;

        if (!id || !estatus) {
            return NextResponse.json({ error: "Missing fields" }, { status: 400 });
        }

        // Update query
        const res = await query(
            "UPDATE ingresos SET tipo_ingreso_reingreso = $1 WHERE id = $2 RETURNING *",
            [estatus, id]
        );

        if (res.rowCount === 0) {
            return NextResponse.json({ error: "Record not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, row: res.rows[0] });
    } catch (error) {
        console.error("Error updating ingresos status:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
