import { listRoles, createRole } from "@/lib/roles";

export async function GET() {
  const roles = await listRoles();
  return Response.json(roles);
}

export async function POST(req) {
  const body = await req.json();
  const created = await createRole(body);
  return Response.json(created ?? {}, { status: created ? 201 : 200 });
}
