import { auth } from "@/../auth";
import { query, isDbConfigured } from "@/lib/db";

export async function GET(req) {
    const session = await auth();
    if (!session?.user?.email) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isDbConfigured()) {
        return Response.json({ found: false, error: "DB not configured" });
    }

    try {
        const email = session.user.email;
        // Query users table by mail
        const res = await query(
            "SELECT * FROM users WHERE LOWER(TRIM(mail)) = LOWER(TRIM($1))",
            [email]
        );

        if (res.rows.length === 0) {
            return Response.json({ found: false });
        }

        return Response.json({ found: true, user: res.rows[0] });
    } catch (error) {
        console.error("Error fetching user status:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    const session = await auth();
    if (!session?.user?.email) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { status } = body;

        const email = session.user.email;
        const res = await query(
            "UPDATE users SET status = $1 WHERE LOWER(TRIM(mail)) = LOWER(TRIM($2)) RETURNING *",
            [status, email]
        );

        if (res.rows.length === 0) {
            return Response.json(
                { error: "User not found in users table" },
                { status: 404 }
            );
        }

        return Response.json({ success: true, user: res.rows[0] });
    } catch (error) {
        console.error("Error updating user status:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
