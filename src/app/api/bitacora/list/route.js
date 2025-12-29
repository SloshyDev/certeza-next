import { isDbConfigured } from "@/lib/db.js";
import { getBitacoraTableData } from "@/lib/bitacora.js";
import { auth } from "@/../auth";
import { resolveUserRoles, getUserAliasByEmail, isEmisor, isAdmin, isEditor } from "@/lib/roles.js";

export async function GET(req) {
  if (!isDbConfigured()) return Response.json([]);
  const session = await auth();
  const url = new URL(req.url);
  const start = url.searchParams.get("startDate");
  const end = url.searchParams.get("endDate");
  if (!start || !end) return Response.json([]);
  let emisorEmail = null;
  let emisorAlias = null;
  if (session) {
    if (isEmisor(session) && !isAdmin(session) && !isEditor(session)) {
      emisorEmail = session.user?.email || null;
      emisorAlias = session.user?.alias ?? null;
      if (!emisorAlias) {
        emisorAlias =
          (await getUserAliasByEmail(session.user?.email || "")) || null;
      }
    }
  }
  const rows = await getBitacoraTableData(start, end, emisorEmail, emisorAlias);
  return Response.json(rows);
}
