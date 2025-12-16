import { listAsesores } from "@/lib/asesor.js";
import { isDbConfigured } from "@/lib/db.js";

export async function GET() {
  if (!isDbConfigured()) return Response.json([]);
  const rows = await listAsesores();
  return Response.json(rows);
}

