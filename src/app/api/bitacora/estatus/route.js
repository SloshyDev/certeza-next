import { z } from "zod";
import { query, isDbConfigured } from "@/lib/db.js";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles.js";

const EstatusSchema = z.enum([
  "COMPLETO",
  "PENDIENTE ASESOR",
  "PENDIENTE COMPAÑIA",
  "PENDIENTE",
  "ERROR",
  "NO PROCEDE",
  "CAMBIO EMISOR",
]);

const PayloadSchema = z.object({
  id: z.number().int().positive(),
  estatus: EstatusSchema,
});

export async function PATCH(req) {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  if (!hasRole(session, ["admin", "editor", "emisor", "coordinador"]))
    return new Response("FORBIDDEN", { status: 403 });
  if (!isDbConfigured()) return Response.json({ ok: false }, { status: 500 });

  const json = await req.json();
  const parsed = PayloadSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { id, estatus } = parsed.data;

  const prevRes = await query(`SELECT estatus FROM bitacora WHERE id = $1`, [
    id,
  ]);
  const prev = prevRes.rows[0]?.estatus ?? null;

  if ((prev ?? "") === estatus) {
    return Response.json({ ok: true, row: { id, estatus } });
  }

  const upd = await query(
    `UPDATE bitacora
     SET estatus = $2
     WHERE id = $1 AND COALESCE(estatus,'') <> $2
     RETURNING id, estatus`,
    [id, estatus]
  );
  const row = upd.rows[0] || null;

  if (row) {
    // historial registrado por trigger en BD
  }

  return Response.json({ ok: !!row, row });
}
