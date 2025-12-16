import { isDbConfigured } from "@/lib/db.js";
import { getPolizasHistoryForBitacora, getBitacoraHistorial } from "@/lib/bitacora.js";

export async function GET(req) {
  if (!isDbConfigured()) return Response.json({ polizas_history: [], bitacora_historial: [] }, { status: 200 });
  const url = new URL(req.url);
  const idStr = url.searchParams.get("bitacoraId") || "";
  const bitacoraId = /^[0-9]+$/.test(idStr) ? Number(idStr) : null;
  if (bitacoraId == null) return Response.json({ polizas_history: [], bitacora_historial: [] }, { status: 200 });
  const pol = await getPolizasHistoryForBitacora(bitacoraId);
  const his = await getBitacoraHistorial(bitacoraId);
  return Response.json({ polizas_history: pol, bitacora_historial: his });
}

