import { auth } from "@/../auth";
import { isDbConfigured } from "@/lib/db";
import { resolveUserRoles, getUserAliasByEmail } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  const roles = await resolveUserRoles(session);
  const alias = isDbConfigured()
    ? await getUserAliasByEmail(session.user?.email || "")
    : null;
  return Response.json({
    email: session.user?.email || "",
    name: session.user?.name || "",
    alias: alias || null,
    roles,
  });
}
