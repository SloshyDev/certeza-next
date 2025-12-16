import { assignRole, revokeRole } from "@/lib/roles";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles.js";

export async function POST(req) {
  // Verificar autenticación
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  
  // Verificar rol - solo admin puede asignar roles
  if (!hasRole(session, ["admin"]))
    return new Response("FORBIDDEN", { status: 403 });

  const { userId, role } = await req.json();
  await assignRole(Number(userId), String(role));
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  // Verificar autenticación
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  
  // Verificar rol - solo admin puede revocar roles
  if (!hasRole(session, ["admin"]))
    return new Response("FORBIDDEN", { status: 403 });

  const { userId, role } = await req.json();
  await revokeRole(Number(userId), String(role));
  return Response.json({ ok: true });
}