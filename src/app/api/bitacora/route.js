import { z } from "zod";
import { query, isDbConfigured } from "@/lib/db.js";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles.js";

const TipoEnum = z.enum([
  "EMISION",
  "COTIZACION",
  "CANCELACION",
  "ENDOSO",
  "REEXPEDICION",
  "RENOVACION",
  "OTRO",
]);

const CreateSchema = z.object({
  emisor: z.string().min(1),
  tipo: TipoEnum,
  asesor: z.number().int().positive(),
  asunto: z.string().min(1),
  dia_llegada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora_llegada: z.string().regex(/^\d{2}:\d{2}$/),
  fecha_asignada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora_asignado: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(req) {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  if (!hasRole(session, ["admin", "editor"]))
    return new Response("FORBIDDEN", { status: 403 });
  if (!isDbConfigured()) return Response.json({ ok: false }, { status: 500 });
  const json = await req.json();
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const {
    emisor,
    tipo,
    asesor,
    asunto,
    dia_llegada,
    hora_llegada,
    fecha_asignada,
    hora_asignado,
  } = parsed.data;

  const insertRes = await query(
    `INSERT INTO bitacora (
       emisor, tipo, asesor, asunto,
       dia_llegada, hora_llegada,
       fecha_asignada, hora_asignado,
       fecha_creacion
     ) VALUES (
       $1, $2, $3, $4,
       $5::date, $6::time,
       $7::date, $8::time,
       NOW()
     )
     RETURNING id`,
    [
      emisor,
      tipo,
      asesor,
      asunto,
      dia_llegada,
      hora_llegada,
      fecha_asignada,
      hora_asignado,
    ]
  );
  const row = insertRes.rows[0];
  const id = row?.id;
  if (!id) return Response.json({ ok: false }, { status: 500 });

  const selectRes = await query(
    `SELECT b.id,
            COALESCE(a.nombre, '') AS asesor,
            COALESCE(b.tipo, '') AS tipo,
            COALESCE(b.asunto, '') AS asunto,
            CASE WHEN b.hora_llegada IS NOT NULL THEN to_char(b.hora_llegada, 'HH24:MI') ELSE '' END AS hora_llegada,
            CASE WHEN b.dia_llegada IS NOT NULL THEN to_char(b.dia_llegada, 'YYYY-MM-DD') ELSE '' END AS dia_llegada,
            COALESCE(b.estatus, '') AS estatus,
            COALESCE(p.no_poliza, '') AS no_poliza,
            COALESCE(b.emisor, '') AS emisor
     FROM bitacora b
     LEFT JOIN asesor a ON a.id = b.asesor
     LEFT JOIN polizas p ON p.bitacora_id = b.id
     WHERE b.id = $1`,
    [id]
  );
  const r = selectRes.rows[0];
  const payload = {
    id: r.id,
    asesor: r.asesor || "",
    tipo: r.tipo || "",
    asunto: r.asunto || "",
    hora_llegada: r.hora_llegada || "",
    dia_llegada: r.dia_llegada || "",
    estatus: r.estatus || "",
    tiempo_respuesta_min: null,
    no_poliza: r.no_poliza || "",
    emisor: r.emisor || "",
  };
  return Response.json({ ok: true, row: payload }, { status: 201 });
}
