import { assignRole, revokeRole } from "@/lib/roles";

export async function POST(req) {
  const { userId, role } = await req.json();
  await assignRole(Number(userId), String(role));
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  const { userId, role } = await req.json();
  await revokeRole(Number(userId), String(role));
  return Response.json({ ok: true });
}
