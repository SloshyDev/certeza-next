import { NextResponse } from "next/server";
import { getIngresosTableData } from "@/lib/ingresos";
import * as XLSX from "xlsx";

function normalizeDate(dateStr, fallback) {
    if (!dateStr) return fallback;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    return fallback;
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        // Defaults
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const firstDay = `${yyyy}-${mm}-01`;
        const today = now.toISOString().slice(0, 10);

        const startDate = normalizeDate(searchParams.get("startDate"), firstDay);
        const endDate = normalizeDate(searchParams.get("endDate"), today);

        const filters = {
            asesor: searchParams.get("asesor") || "",
            folio: searchParams.get("folio") || "",
            poliza: searchParams.get("poliza") || "",
            compania: searchParams.get("compania") || "",
            estatus: searchParams.get("estatus") || "",
            solicitud: searchParams.get("solicitud") || "",
        };

        const data = await getIngresosTableData(startDate, endDate, filters);

        // Map data to user-friendly headers
        const exportData = data.map(item => ({
            "Fecha Ingreso": item.fecha_ingreso,
            "Estatus": item.tipo_ingreso_reingreso,
            "Folio": item.folio,
            "Asesor": item.asesor,
            "Póliza": item.poliza,
            "Compañía": item.compania,
            "Solicitud": item.tipo_solicitud,
            "Recibe": item.recibe,
            "Ingreso Digital": item.fecha_ingreso_digital,
            "Ingreso Comercial": item.fecha_comercial,
            "Mesa Vales": item.fecha_mesa_vales,
            "Reingreso": item.reingreso ? "Sí" : "No",
            "Observación": item.observacion,
        }));

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // Adjust column widths roughly
        const wscols = [
            { wch: 15 }, // Fecha Ingreso
            { wch: 15 }, // Estatus
            { wch: 10 }, // Folio
            { wch: 25 }, // Asesor
            { wch: 20 }, // Poliza
            { wch: 15 }, // Compania
            { wch: 10 }, // Solicitud
            { wch: 15 }, // Recibe
            { wch: 15 }, // Ingreso Digital
            { wch: 15 }, // Ingreso Comercial
            { wch: 15 }, // Mesa Vales
            { wch: 10 }, // Reingreso
            { wch: 40 }, // Observacion
        ];
        worksheet["!cols"] = wscols;

        XLSX.utils.book_append_sheet(workbook, worksheet, "Ingresos");

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="Ingresos_${startDate}_${endDate}.xlsx"`,
            },
        });
    } catch (error) {
        console.error("Export Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
