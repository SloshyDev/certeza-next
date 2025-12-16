import { isDbConfigured } from "@/lib/db.js";
import { searchBitacoraByIdOrAsunto } from "@/lib/bitacora.js";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles.js";

export async function GET(req) {
  // Verificar autenticación
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });

  // Verificar rol
  if (!hasRole(session, ["viewer", "editor", "admin"]))
    return new Response("FORBIDDEN", { status: 403 });

  if (!isDbConfigured()) return Response.json([], { status: 200 });
  const url = new URL(req.url);
  const idStr = url.searchParams.get("id") || "";
  const asuntoStr = url.searchParams.get("asunto") || "";
  const id = /^[0-9]+$/.test(idStr) ? Number(idStr) : null;
  const asunto = asuntoStr.trim() !== "" ? asuntoStr.trim() : null;
  if (id == null && asunto == null) return Response.json([], { status: 200 });
  const rows = await searchBitacoraByIdOrAsunto(id, asunto);
  return Response.json(rows);
}
