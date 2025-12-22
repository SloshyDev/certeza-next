"use client";

import { useState } from "react";
import { DocumentArrowDownIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function DownloadRecibosTemplateButton({ filters }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [additionalFilters, setAdditionalFilters] = useState({
    soloFolioCompleto: false,
    soloDxnConVale: false,
  });

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Construir URL con los filtros actuales
      const params = new URLSearchParams();

      if (filters?.no_poliza) params.set("no_poliza", filters.no_poliza);
      if (filters?.asesor_id) params.set("asesor_id", filters.asesor_id);
      if (filters?.cia) params.set("cia", filters.cia);
      if (filters?.estatus) params.set("estatus", filters.estatus);
      if (filters?.quincena) params.set("quincena", filters.quincena);
      if (filters?.fecha_desde) params.set("fecha_desde", filters.fecha_desde);
      if (filters?.fecha_hasta) params.set("fecha_hasta", filters.fecha_hasta);

      // Agregar filtros adicionales del modal
      if (additionalFilters.soloFolioCompleto)
        params.set("solo_folio_completo", "true");
      if (additionalFilters.soloDxnConVale)
        params.set("solo_dxn_con_vale", "true");

      const apiUrl = `/api/recibos/template?${params.toString()}`;

      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Error al descargar plantilla");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;

      // Extraer nombre del archivo de los headers
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `calculo_recibos_${new Date().toISOString().slice(0, 10)}.xlsx`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Cerrar modal después de descargar
      setShowModal(false);
    } catch (error) {
      console.error("Error al descargar plantilla:", error);
      alert("Error al descargar la plantilla. Por favor intenta de nuevo.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isDownloading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        title="Descargar Plantilla de Recibos"
      >
        <DocumentArrowDownIcon className="h-5 w-5" />
        <span>Plantilla Recibos</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Opciones de Filtrado
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Selecciona reglas adicionales (opcionales):
              </p>

              {/* Checkbox 1 */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={additionalFilters.soloFolioCompleto}
                  onChange={(e) =>
                    setAdditionalFilters({
                      ...additionalFilters,
                      soloFolioCompleto: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">
                    Solo pólizas con estatus "FOLIO COMPLETO"
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Filtra únicamente pólizas que tengan el folio completado
                  </span>
                </div>
              </label>

              {/* Checkbox 2 */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={additionalFilters.soloDxnConVale}
                  onChange={(e) =>
                    setAdditionalFilters({
                      ...additionalFilters,
                      soloDxnConVale: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">
                    Solo pólizas DXN con F.Vale Recibido
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    Filtra pólizas con forma de pago DXN que tengan fecha de
                    vale recibido
                  </span>
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isDownloading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Descargando...
                  </span>
                ) : (
                  "Descargar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
