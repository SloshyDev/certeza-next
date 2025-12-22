import { query, isDbConfigured } from "@/lib/db";
import { getPolizas, getPolizasCount } from "@/lib/polizas";
import { listAsesores } from "@/lib/asesor";

export async function GET(req) {
  try {
    if (!isDbConfigured()) {
      return Response.json(
        { ok: false, error: "DB_NOT_CONFIGURED" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Extraer filtros de los parámetros de búsqueda
    const filters = {
      no_poliza: searchParams.get("no_poliza") || "",
      asesor_id: searchParams.get("asesor_id") || "",
      cia: searchParams.get("cia") || "",
      estatus: searchParams.get("estatus") || "",
      quincena: searchParams.get("quincena") || "",
      fecha_desde: searchParams.get("fecha_desde") || "",
      fecha_hasta: searchParams.get("fecha_hasta") || "",
    };

    // Parámetros de paginación
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Obtener datos en paralelo
    const [polizas, total, asesores] = await Promise.all([
      getPolizas(filters, page, limit),
      getPolizasCount(filters),
      listAsesores(),
    ]);

    return Response.json({
      ok: true,
      polizas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      asesores,
    });
  } catch (e) {
    console.error("Error in GET /api/polizas:", e);
    return Response.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!isDbConfigured())
      return Response.json(
        { ok: false, error: "DB_NOT_CONFIGURED" },
        { status: 500 }
      );
    const body = await req.json();
    const bitacora_id = Number(body.bitacora_id);
    const asesor_id = Number(body.asesor_id);
    const no_poliza = String(body.no_poliza || "").trim();
    if (!bitacora_id || !asesor_id || !no_poliza) {
      return Response.json(
        { ok: false, error: "INVALID_INPUT" },
        { status: 400 }
      );
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
