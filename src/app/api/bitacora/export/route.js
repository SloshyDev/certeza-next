import { auth } from "@/../auth";
import { hasRole, resolveUserRoles, getUserAliasByEmail } from "@/lib/roles";
import { isDbConfigured, query } from "@/lib/db";
import { getBitacoraTableData } from "@/lib/bitacora";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function normDate(v, fb) {
  const s = typeof v === "string" ? v : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fb;
}

export async function GET(req) {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  if (!isDbConfigured())
    return new Response("DB_NOT_CONFIGURED", { status: 500 });

  const url = new URL(req.url);
  const now = new Date();
  const today = new Date(now).toISOString().slice(0, 10);
  const startDate = normDate(url.searchParams.get("startDate"), today);
  const endDate = normDate(url.searchParams.get("endDate"), today);

  let emisorEmail = null;
  let emisorAlias = null;
  const roles = await resolveUserRoles(session);
  const isEmisor = roles.includes("emisor");
  const isAdmin = roles.includes("admin");
  const isEditor = roles.includes("editor");
  if (isEmisor && !isAdmin && !isEditor) {
    emisorEmail = session.user?.email || null;
    emisorAlias = session.user?.alias ?? null;
    if (!emisorAlias) {
      emisorAlias =
        (await getUserAliasByEmail(session.user?.email || "")) || null;
    }
  }

  const data = await getBitacoraTableData(
    startDate,
    endDate,
    emisorEmail,
    emisorAlias
  );
  const ids = data.map((r) => r.id);
  let firstMap = new Map();
  if (ids.length) {
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
    firstMap = new Map(
      res.rows.map((r) => [
        r.bitacora_id,
        r.min_resp_ts ? new Date(r.min_resp_ts) : null,
      ])
    );
  }

  const tipos = [
    "EMISION",
    "COTIZACION",
    "CANCELACION",
    "ENDOSO",
    "REEXPEDICION",
    "OTRO",
  ];
  const generalAoA = [
    [
      "ID",
      "Emisor",
      "Asesor",
      "Tipo",
      "Estatus",
      "Asunto",
      "Fecha llegada",
      "Hora llegada",
      "Resp (min)",
      "Primera respuesta",
    ],
    ...data.map((r) => [
      r.id,
      r.emisor || "",
      r.asesor || "",
      r.tipo || "",
      r.estatus || "",
      r.asunto || "",
      r.dia_llegada || "",
      r.hora_llegada || "",
      r.tiempo_respuesta_min == null ? "" : r.tiempo_respuesta_min,
      firstMap.get(r.id)
        ? firstMap.get(r.id).toISOString().slice(0, 16).replace("T", " ")
        : "",
    ]),
  ];

  const byEmisorCalc = (() => {
    const m = new Map();
    for (const r of data) {
      const em = r.emisor || "(vacío)";
      if (!m.has(em)) m.set(em, []);
      m.get(em).push(r);
    }
    const rows = [];
    for (const [em, arr] of m.entries()) {
      const counts = Object.fromEntries(tipos.map((t) => [t, 0]));
      let acc = 0,
        c = 0;
      for (const r of arr) {
        const t = String(r.tipo || "").toUpperCase();
        if (counts[t] != null) counts[t]++;
        if (typeof r.tiempo_respuesta_min === "number") {
          acc += r.tiempo_respuesta_min;
          c++;
        }
      }
      const avg = c ? Math.round((acc / c) * 100) / 100 : "";
      rows.push([em, ...tipos.map((t) => counts[t]), avg]);
    }
    rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    return rows;
  })();

  const emisorAoA = [
    ["Emisor", ...tipos.map((t) => `# ${t}`), "Promedio resp (min)"],
  ].concat(byEmisorCalc);

  const asesoresSet = new Set(data.map((r) => r.asesor || ""));
  const asesorAoA = [["Asesor", ...tipos.map((t) => `# ${t}`)]].concat(
    Array.from(asesoresSet)
      .sort()
      .map((as) => {
        const rows = data.filter((r) => (r.asesor || "") === as);
        const counts = Object.fromEntries(tipos.map((t) => [t, 0]));
        for (const r of rows) {
          const t = String(r.tipo || "").toUpperCase();
          if (counts[t] != null) counts[t]++;
        }
        return [as || "(vacío)", ...tipos.map((t) => counts[t])];
      })
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(generalAoA),
    "General"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(emisorAoA),
    "Por Emisor"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(asesorAoA),
    "Por Asesor"
  );
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const dateStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=reporte-bitacora-${dateStamp}.xlsx`,
      "Cache-Control": "no-store",
    },
  });
}
