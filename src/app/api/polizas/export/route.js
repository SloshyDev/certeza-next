import { auth } from "@/../auth";
import { isDbConfigured } from "@/lib/db";
import { getPolizas } from "@/lib/polizas";
import * as XLSX from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  const session = await auth();
  if (!session) return new Response("UNAUTHORIZED", { status: 401 });
  if (!isDbConfigured())
    return new Response("DB_NOT_CONFIGURED", { status: 500 });

  const { searchParams } = new URL(req.url);

  // Extraer filtros de los parámetros de búsqueda (mismo que en la lista)
  const filters = {
    no_poliza: searchParams.get("no_poliza") || "",
    asesor_id: searchParams.get("asesor_id") || "",
    cia: searchParams.get("cia") || "",
    estatus: searchParams.get("estatus") || "",
    fecha_desde: searchParams.get("fecha_desde") || "",
    fecha_hasta: searchParams.get("fecha_hasta") || "",
  };

  try {
    // Obtener todas las pólizas que coinciden con los filtros (sin límite)
    const polizas = await getPolizas(filters, 1, 10000);

    // Formatear datos para Excel
    const excelData = polizas.map((p) => ({
      ID: p.id,
      "No. Póliza": p.no_poliza || "",
      Asesor: p.asesor_nombre || "",
      Compañía: p.cia || "",
      Estatus: p.estatus || "",
      Quincena: p.quincena || "",
      "Fecha Desde": p.f_desde ? new Date(p.f_desde).toLocaleDateString() : "",
      "Fecha Hasta": p.f_hasta ? new Date(p.f_hasta).toLocaleDateString() : "",
      "Fecha Ingreso": p.f_ingreso
        ? new Date(p.f_ingreso).toLocaleDateString()
        : "",
      "Prima Total": p.prima_total || "",
      "Prima Neta": p.prima_neta || "",
      "Comisión %": p.commission_percentage || "",
      "Forma Pago": p.forma_pago || "",
      "No. Vale": p.no_vale || "",
      Folio: p.folio || "",
      "Check Mesa": p.check_mesa ? "Sí" : "No",
      "Creado Por": p.created_by || "",
      "Fecha Creación": p.created_at
        ? new Date(p.created_at).toLocaleString()
        : "",
    }));

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajustar anchos de columna
    const columnWidths = [
      { wch: 8 }, // ID
      { wch: 20 }, // No. Póliza
      { wch: 25 }, // Asesor
      { wch: 20 }, // Compañía
      { wch: 15 }, // Estatus
      { wch: 12 }, // Quincena
      { wch: 12 }, // Fecha Desde
      { wch: 12 }, // Fecha Hasta
      { wch: 12 }, // Fecha Ingreso
      { wch: 12 }, // Prima Total
      { wch: 12 }, // Prima Neta
      { wch: 10 }, // Comisión %
      { wch: 15 }, // Forma Pago
      { wch: 15 }, // No. Vale
      { wch: 15 }, // Folio
      { wch: 10 }, // Check Mesa
      { wch: 20 }, // Creado Por
      { wch: 18 }, // Fecha Creación
    ];
    worksheet["!cols"] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Pólizas");

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Generar nombre del archivo con timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `polizas_${timestamp}.xlsx`;

    // Retornar archivo Excel
    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting pólizas:", error);
    return new Response("ERROR_EXPORTING", { status: 500 });
  }
}
