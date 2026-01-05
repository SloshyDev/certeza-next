import { NextResponse } from "next/server";
import { getGerentes } from "@/lib/extractor";

export async function GET() {
  try {
    const gerentes = await getGerentes();
    return NextResponse.json({ success: true, gerentes });
  } catch (error) {
    console.error("Error en /api/gerentes-list:", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar gerentes" },
      { status: 500 }
    );
  }
}
