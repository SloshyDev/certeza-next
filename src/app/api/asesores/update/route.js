
import { query, isDbConfigured } from "@/lib/db.js";
import { auth } from "@/../auth";

export async function POST(req) {
    try {
        const session = await auth();
        // Verify admin role
        const isAdmin = session?.user?.roles?.includes("admin");
        if (!isAdmin) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isDbConfigured()) {
            return Response.json({ error: "DB not configured" }, { status: 500 });
        }

        const { id, email } = await req.json();

        if (!id) {
            return Response.json({ error: "Missing ID" }, { status: 400 });
        }

        await query(
            `UPDATE asesor SET email = $1 WHERE id = $2`,
            [email || null, id]
        );

        return Response.json({ success: true });
    } catch (error) {
        console.error("Error updating advisor:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
