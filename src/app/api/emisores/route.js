import { listEmisores } from "@/lib/users.js";
import { isDbConfigured } from "@/lib/db.js";

export async function GET() {
  if (!isDbConfigured()) return Response.json([]);
  const emisores = await listEmisores();
  return Response.json(emisores);
}

