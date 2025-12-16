import { listRoles, createRole } from "@/lib/roles";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles.js";

export async function GET() {
  // Verificar autenticación
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  
  // Verificar rol - solo admin puede ver roles
  if (!hasRole(session, ["admin"]))
    return new Response("FORBIDDEN", { status: 403 });

  const roles = await listRoles();
  return Response.json(roles);
}

export async function POST(req) {
  // Verificar autenticación
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  
  // Verificar rol - solo admin puede crear roles
  if (!hasRole(session, ["admin"]))
    return new Response("FORBIDDEN", { status: 403 });

  const body = await req.json();
  const created = await createRole(body);
  return Response.json(created ?? {}, { status: created ? 201 : 200 });
}