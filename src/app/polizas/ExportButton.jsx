"use client";

import { useState } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

export default function ExportPolizasButton({ filters }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Construir URL con los filtros actuales
      const params = new URLSearchParams();

      if (filters.no_poliza) params.set("no_poliza", filters.no_poliza);
      if (filters.asesor_id) params.set("asesor_id", filters.asesor_id);
      if (filters.cia) params.set("cia", filters.cia);
      if (filters.estatus) params.set("estatus", filters.estatus);
      if (filters.fecha_desde) params.set("fecha_desde", filters.fecha_desde);
      if (filters.fecha_hasta) params.set("fecha_hasta", filters.fecha_hasta);

      const url = `/api/polizas/export?${params.toString()}`;

      // Descargar archivo
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al exportar");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      // Extraer nombre del archivo de los headers o usar uno por defecto
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `polizas_${new Date().toISOString().slice(0, 10)}.xlsx`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error al exportar:", error);
      alert("Error al exportar las pólizas. Por favor intenta de nuevo.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      aria-label="Exportar a Excel"
      title="Exportar a Excel"
    >
      {isExporting ? (
        <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
      ) : (
        <ArrowDownTrayIcon className="h-6 w-6" />
      )}
    </button>
  );
}
