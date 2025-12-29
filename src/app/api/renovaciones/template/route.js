import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    // Definir encabezados
    const headers = ["POLIZA", "MES", "ESTATUS", "ASESOR"];

    // Crear libro y hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // Agregar ejemplo
    XLSX.utils.sheet_add_aoa(
      ws,
      [["12345-AB", "ENERO", "PENDIENTE", "9051"]],
      { origin: -1 }
    );

    // Ajustar anchos de columna
    ws["!cols"] = [
      { wch: 20 }, // POLIZA
      { wch: 15 }, // MES
      { wch: 15 }, // ESTATUS
      { wch: 30 }, // ASESOR
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");

    // Generar buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Retornar respuesta con headers para descarga
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition":
          'attachment; filename="plantilla_renovaciones.xlsx"',
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    console.error("Error generando plantilla:", error);
    return NextResponse.json(
      { error: "Error generando plantilla" },
      { status: 500 }
    );
  }
}
