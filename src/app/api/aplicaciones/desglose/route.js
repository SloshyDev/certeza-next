import { auth } from "@/../auth";
import { getAplicacionesDesglose } from "@/lib/aplicaciones";

export async function GET(req) {
  try {
    const session = await auth();
    if (!session) {
      return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const poliza = searchParams.get("poliza") || null;

    const applications = await getAplicacionesDesglose(poliza);

    return Response.json({
      ok: true,
      data: applications
    });
  } catch (error) {
    console.error("Error in GET /api/aplicaciones/desglose:", error);
    return Response.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
