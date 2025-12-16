import { isDbConfigured } from "@/lib/db.js";
import {
  getPolizasHistoryForBitacora,
  getBitacoraHistorial,
} from "@/lib/bitacora.js";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles.js";

export async function GET(req) {
  // Verificar autenticación
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });

  // Verificar rol
  if (!hasRole(session, ["viewer", "editor", "admin"]))
    return new Response("FORBIDDEN", { status: 403 });

  if (!isDbConfigured())
    return Response.json(
      { polizas_history: [], bitacora_historial: [] },
      { status: 200 }
    );
  const url = new URL(req.url);
  const idStr = url.searchParams.get("bitacoraId") || "";
  const bitacoraId = /^[0-9]+$/.test(idStr) ? Number(idStr) : null;
  if (bitacoraId == null)
    return Response.json(
      { polizas_history: [], bitacora_historial: [] },
      { status: 200 }
    );
  const pol = await getPolizasHistoryForBitacora(bitacoraId);
  const his = await getBitacoraHistorial(bitacoraId);
  return Response.json({ polizas_history: pol, bitacora_historial: his });
}
