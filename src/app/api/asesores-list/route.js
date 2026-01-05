import { NextResponse } from "next/server";
import { getAsesores } from "@/lib/extractor";

export async function GET() {
  try {
    const asesores = await getAsesores();
    return NextResponse.json({ success: true, asesores });
  } catch (error) {
    console.error("Error en /api/asesores-list:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar asesores" },
      { status: 500 }
    );
  }
}
