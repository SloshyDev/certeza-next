import { z } from "zod";
import { query, isDbConfigured } from "@/lib/db.js";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles.js";

const TipoSchema = z.enum([
  "EMISION",
  "COTIZACION",
  "CANCELACION",
  "ENDOSO",
  "REEXPEDICION",
  "RENOVACION",
  "OTRO",
]);

const PayloadSchema = z.object({
  id: z.number().int().positive(),
  tipo: TipoSchema,
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
  const { id, tipo } = parsed.data;
  const res = await query(
    `UPDATE bitacora SET tipo = $2 WHERE id = $1 RETURNING id, tipo`,
    [id, tipo]
  );
  const row = res.rows[0] || null;
  return Response.json({ ok: !!row, row });
}
