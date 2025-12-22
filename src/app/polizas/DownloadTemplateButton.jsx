"use client";

import { useState } from "react";
import { DocumentArrowDownIcon } from "@heroicons/react/24/outline";

export default function DownloadTemplateButton() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/polizas/template");
      if (!response.ok) throw new Error("Error al descargar plantilla");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Extraer nombre del archivo de los headers
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `plantilla_polizas_${new Date().toISOString().slice(0, 10)}.xlsx`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al descargar plantilla:", error);
      alert("Error al descargar la plantilla. Por favor intenta de nuevo.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      title="Descargar Plantilla Excel"
    >
      {isDownloading ? (
        <>
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
          <span>Descargando...</span>
        </>
      ) : (
        <>
          <DocumentArrowDownIcon className="h-5 w-5" />
          <span>Descargar Plantilla</span>
        </>
      )}
    </button>
  );
}
