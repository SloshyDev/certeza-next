import { isDbConfigured } from "@/lib/db.js";
import { getBitacoraTableData } from "@/lib/bitacora.js";

export async function GET(req) {
  if (!isDbConfigured()) return Response.json([]);
  const url = new URL(req.url);
  const start = url.searchParams.get("startDate");
  const end = url.searchParams.get("endDate");
  if (!start || !end) return Response.json([]);
  const rows = await getBitacoraTableData(start, end);
  return Response.json(rows);
}

