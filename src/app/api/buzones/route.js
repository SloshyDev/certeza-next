
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { query, isDbConfigured } from "@/lib/db";

// Roles permitidos
const ALLOWED_ROLES = ["admin", "emisor", "coordinador", "supervisor_emi"];

function hasPermission(userRoles) {
    if (!userRoles || !Array.isArray(userRoles)) return false;
    return userRoles.some(r => ALLOWED_ROLES.includes(r));
}

export async function GET(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasPermission(session.user?.roles)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isDbConfigured()) return NextResponse.json({ error: "DB Error" }, { status: 500 });

    try {
        const res = await query(`SELECT email, activo FROM buzones_config ORDER BY email ASC`);
        return NextResponse.json({ buzones: res.rows });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!hasPermission(session.user?.roles)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { email, activo } = await req.json();
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const res = await query(
            `UPDATE buzones_config SET activo = $1, updated_at = NOW() WHERE email = $2 RETURNING *`,
            [activo, email]
        );

        if (res.rowCount === 0) {
            // Optional: Insert if not exists? Usually config is pre-populated, but upsert is better if dynamic.
            // For now assume update existing.
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, buzon: res.rows[0] });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
