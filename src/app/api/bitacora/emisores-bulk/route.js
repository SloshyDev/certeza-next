import { auth } from "@/../auth";
import { isDbConfigured, query } from "@/lib/db";
import { hasRole } from "@/lib/roles";

export async function POST(req) {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  if (!hasRole(session, ["admin"])) return new Response("FORBIDDEN", { status: 403 });
  if (!isDbConfigured()) return new Response("DB_NOT_CONFIGURED", { status: 500 });

  const body = await req.json();
  const toValue = String(body?.to_value || "").trim();
  let fromValues = Array.isArray(body?.from_values) ? body.from_values : [];
  const dryRun = !!body?.dry_run;
  fromValues = fromValues.map((s) => String(s || "").trim()).filter((s) => s !== "");
  const normFromUpper = fromValues.map((s) => s.toUpperCase());
  if (!toValue || normFromUpper.length === 0) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const whereSql = `UPPER(TRIM(emisor)) = ANY($1::text[])`;

  if (dryRun) {
    const res = await query(`SELECT COUNT(*)::int AS cnt FROM bitacora WHERE ${whereSql}`, [normFromUpper]);
    return Response.json({ ok: true, matched: res.rows[0]?.cnt || 0, updated: 0 });
  }

  const upd = await query(
    `UPDATE bitacora SET emisor = $2 WHERE ${whereSql} RETURNING id`,
    [normFromUpper, toValue]
  );
  const updated = upd.rowCount ?? upd.rows?.length ?? 0;
  return Response.json({ ok: true, matched: updated, updated });
}
