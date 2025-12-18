import { z } from "zod";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles";
import { query, isDbConfigured } from "@/lib/db";

const BodySchema = z.object({ ids: z.array(z.number().int().positive()).min(1) });

export async function POST(req) {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  if (!hasRole(session, ["viewer", "editor", "admin"]))
    return new Response("FORBIDDEN", { status: 403 });
  if (!isDbConfigured()) return Response.json({ results: [] }, { status: 200 });

  const body = await req.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success)
    return Response.json({ results: [], error: "INVALID_INPUT" }, { status: 400 });
  const ids = parsed.data.ids;

  const res = await query(
    `WITH input_ids AS (SELECT UNNEST($1::int[]) AS id),
      hist AS (
        SELECT bitacora_id, MIN(resp_ts) AS min_resp_ts
        FROM (
          SELECT bh.bitacora_id,
                 (bh.fecha_respondido_nueva::timestamp + bh.hora_respondido_nueva) AS resp_ts
          FROM bitacora_historial bh
          JOIN input_ids ii ON ii.id = bh.bitacora_id
          WHERE bh.fecha_respondido_nueva IS NOT NULL AND bh.hora_respondido_nueva IS NOT NULL
          UNION ALL
          SELECT bh.bitacora_id,
                 (bh.fecha_respondido_anterior::timestamp + bh.hora_respondido_anterior) AS resp_ts
          FROM bitacora_historial bh
          JOIN input_ids ii ON ii.id = bh.bitacora_id
          WHERE bh.fecha_respondido_anterior IS NOT NULL AND bh.hora_respondido_anterior IS NOT NULL
          UNION ALL
          SELECT b.id AS bitacora_id,
                 (b.fecha_respondido::timestamp + b.hora_respondido) AS resp_ts
          FROM bitacora b
          JOIN input_ids ii ON ii.id = b.id
          WHERE b.fecha_respondido IS NOT NULL AND b.hora_respondido IS NOT NULL
        ) u
        GROUP BY bitacora_id
      )
      SELECT bitacora_id, min_resp_ts FROM hist`,
    [ids]
  );

  const map = new Map(res.rows.map((r) => [r.bitacora_id, r.min_resp_ts ? new Date(r.min_resp_ts).toISOString() : null]));
  const results = ids.map((id) => ({ id, first_response_iso: map.get(id) || null }));
  return Response.json({ results });
}

