"use client";

import { TableCellsIcon } from "@heroicons/react/24/outline";

export default function ExportButton({ data }) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const headers = ["ID", "Póliza", "Mes", "Asesor", "Estatus"];
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        [
          row.id,
          `"${(row.poliza || "").replace(/"/g, '""')}"`,
          `"${(row.mes || "").replace(/"/g, '""')}"`,
          `"${(row.asesor_nombre || "").replace(/"/g, '""')}"`,
          `"${(row.estatus || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `renovaciones_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleExport}
      className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-transform hover:scale-105 active:scale-95 gap-2"
      aria-label="Exportar a CSV"
      title="Exportar a CSV"
    >
      <TableCellsIcon className="h-6 w-6" />
      Exportar
    </button>
  );
}
