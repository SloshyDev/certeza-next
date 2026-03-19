import { NextResponse } from "next/server";
import { listAsesores } from "@/lib/asesor";

export async function GET() {
  try {
    const asesores = await listAsesores();
    return NextResponse.json({ success: true, asesores });
  } catch (error) {
    console.error("Error en /api/asesores-list:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar asesores" },
      { status: 500 }
    );
  }
}
