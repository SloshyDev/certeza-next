import { z } from "zod";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles";
import { isDbConfigured, query } from "@/lib/db";

const PayloadSchema = z.object({
  id: z.number().int().positive(),
  fecha_respondido: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora_respondido: z.string().regex(/^\d{2}:\d{2}$/),
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
  const { id, fecha_respondido, hora_respondido } = parsed.data;

  // Solo establecer si no existe
  const prevRes = await query(
    `SELECT fecha_respondido, hora_respondido, fecha_asignada, hora_asignado FROM bitacora WHERE id = $1`,
    [id]
  );
  const prev = prevRes.rows[0] || {};
  const hasPrev = prev.fecha_respondido && prev.hora_respondido;
  if (hasPrev) {
    return Response.json({ ok: false, error: "ALREADY_SET" }, { status: 400 });
  }

  const upd = await query(
    `UPDATE bitacora
     SET fecha_respondido = $2::date, hora_respondido = $3::time
     WHERE id = $1
     RETURNING id,
               COALESCE(tipo,'') AS tipo,
               COALESCE(asunto,'') AS asunto,
               CASE WHEN hora_llegada IS NOT NULL THEN to_char(hora_llegada,'HH24:MI') ELSE '' END AS hora_llegada,
               CASE WHEN dia_llegada IS NOT NULL THEN to_char(dia_llegada,'YYYY-MM-DD') ELSE '' END AS dia_llegada,
               COALESCE(estatus,'') AS estatus,
               COALESCE(emisor,'') AS emisor,
               fecha_asignada,
               hora_asignado,
               fecha_respondido,
               hora_respondido`,
    [id, fecha_respondido, hora_respondido]
  );
  const row = upd.rows[0] || null;
  if (!row) return Response.json({ ok: false }, { status: 500 });

  // Calcular tiempo_respuesta_min
  let tiempo_respuesta_min = null;
  if (row.fecha_asignada && row.hora_asignado && row.fecha_respondido && row.hora_respondido) {
    const calc = await query(
      `SELECT FLOOR(EXTRACT(EPOCH FROM (($1::date + $2::time) - ($3::date + $4::time))) / 60)::int AS mins`,
      [row.fecha_respondido, row.hora_respondido, row.fecha_asignada, row.hora_asignado]
    );
    tiempo_respuesta_min = calc.rows[0]?.mins ?? null;
  }

  const payload = {
    id: row.id,
    tipo: row.tipo,
    asunto: row.asunto,
    hora_llegada: row.hora_llegada,
    dia_llegada: row.dia_llegada,
    estatus: row.estatus,
    emisor: row.emisor,
    tiempo_respuesta_min,
  };

  return Response.json({ ok: true, row: payload });
}
