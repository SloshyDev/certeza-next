import { auth } from "@/../auth";
import { updateAplicacionAsesor } from "@/lib/aplicaciones";

export async function POST(req) {
  try {
    const session = await auth();
    const userRoles = session.user?.roles || [];
    if (!session || !userRoles.includes("admin")) {
      return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id, asesorId } = await req.json();

    if (!id || !asesorId) {
      return Response.json({ ok: false, error: "MISSING_PARAMS" }, { status: 400 });
    }

    const result = await updateAplicacionAsesor(id, asesorId);

    if (result.ok) {
      return Response.json({ ok: true });
    } else {
      return Response.json({ ok: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in POST /api/aplicaciones/update-asesor:", error);
    return Response.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
