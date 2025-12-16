import { query, isDbConfigured } from "@/lib/db.js";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles.js";

export async function DELETE(_req, context) {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  if (!hasRole(session, ["admin"])) return new Response("FORBIDDEN", { status: 403 });
  if (!isDbConfigured()) return Response.json({ ok: false }, { status: 500 });

  const resolvedParams = context && context.params ? await context.params : {};
  const idStr = resolvedParams?.id ?? "";
  const id = /^[0-9]+$/.test(String(idStr)) ? Number(idStr) : null;
  if (!id) return Response.json({ ok: false }, { status: 400 });

  try {
    const res = await query(`DELETE FROM bitacora WHERE id = $1`, [id]);
    return Response.json({ ok: true, count: res.rowCount || 0 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
