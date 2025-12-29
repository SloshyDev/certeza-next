import { isDbConfigured } from "@/lib/db.js";
import { searchBitacoraByIdOrAsunto } from "@/lib/bitacora.js";
import { getUserAliasByEmail, resolveUserRoles, isEmisor, isAdmin, isEditor } from "@/lib/roles.js";
import { auth } from "@/../auth";

export async function GET(req) {
  // Verificar autenticación
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });

  // Usuarios autenticados pueden buscar; se restringe por emisor si aplica

  if (!isDbConfigured()) return Response.json([], { status: 200 });
  const url = new URL(req.url);
  const idStr = url.searchParams.get("id") || "";
  const asuntoStr = url.searchParams.get("asunto") || "";
  const id = /^[0-9]+$/.test(idStr) ? Number(idStr) : null;
  const asunto = asuntoStr.trim() !== "" ? asuntoStr.trim() : null;
  if (id == null && asunto == null) return Response.json([], { status: 200 });
  let emisorEmail = null;
  let emisorAlias = null;

  if (isEmisor(session) && !isAdmin(session) && !isEditor(session)) {
    emisorEmail = session.user?.email || null;
    emisorAlias = session.user?.alias ?? null;
    if (!emisorAlias) {
      emisorAlias = await getUserAliasByEmail(session.user?.email || "");
    }
  }
  const rows = await searchBitacoraByIdOrAsunto(
    id,
    asunto,
    emisorEmail,
    emisorAlias
  );
  return Response.json(rows);
}
