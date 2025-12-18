import { z } from "zod";
import { query, isDbConfigured } from "@/lib/db.js";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles.js";

const PayloadSchema = z.object({
  id: z.number().int().positive(),
  emisor: z.string().min(1),
  motivo: z.string().min(1),
});

export async function PATCH(req) {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  if (!hasRole(session, ["admin", "editor"]))
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
  const { id, emisor, motivo } = parsed.data;

  const prevRes = await query(
    `SELECT emisor, estatus, motivo FROM bitacora WHERE id = $1`,
    [id]
  );
  const prev = prevRes.rows[0] || {};

  if (
    (prev.emisor ?? "") === emisor &&
    (prev.motivo ?? "") === motivo &&
    (prev.estatus ?? "") === "PENDIENTE"
  ) {
    return Response.json({
      ok: true,
      row: { id, emisor, estatus: "PENDIENTE" },
    });
  }

  const upd = await query(
    `UPDATE bitacora
     SET emisor = $2, estatus = $3, motivo = $4
     WHERE id = $1
       AND (
         COALESCE(emisor,'') <> $2 OR
         COALESCE(motivo,'') <> $4 OR
         COALESCE(estatus,'') <> $3
       )
     RETURNING id, emisor, estatus`,
    [id, emisor, "PENDIENTE", motivo]
  );
  const row = upd.rows[0] || null;

  if (row) {
    // historial registrado por trigger en BD
  }

  return Response.json({ ok: !!row, row });
}
