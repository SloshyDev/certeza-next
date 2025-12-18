import { query, isDbConfigured } from "@/lib/db";

export async function POST(req) {
  try {
    if (!isDbConfigured()) return Response.json({ ok: false, error: "DB_NOT_CONFIGURED" }, { status: 500 });
    const body = await req.json();
    const bitacora_id = Number(body.bitacora_id);
    const asesor_id = Number(body.asesor_id);
    const no_poliza = String(body.no_poliza || "").trim();
    if (!bitacora_id || !asesor_id || !no_poliza) {
      return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }
    const res = await query(
      `INSERT INTO polizas (no_poliza, asesor_id, bitacora_id)
       VALUES ($1, $2, $3)
       RETURNING id, no_poliza, asesor_id, bitacora_id`,
      [no_poliza, asesor_id, bitacora_id]
    );
    const row = res.rows[0];
    return Response.json({ ok: true, row });
  } catch (e) {
    return Response.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

