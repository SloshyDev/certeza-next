"use client";

import { useState, useRef } from "react";
import { PlusCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function CreatePolizasButton({ onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea un archivo Excel
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type)) {
      alert("Por favor selecciona un archivo Excel válido (.xlsx o .xls)");
      return;
    }

    setIsUploading(true);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/polizas/create-bulk", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear pólizas");
      }

      setResults(data);
      setShowModal(true);

      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Notificar al componente padre
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Error al crear pólizas:", error);
      alert(
        error.message || "Error al crear pólizas. Por favor intenta de nuevo."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Botón flotante */}
      <button
        onClick={handleButtonClick}
        disabled={isUploading}
        className="fixed bottom-32 right-6 z-40 inline-flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        title="Crear Pólizas desde Excel"
      >
        {isUploading ? (
          <>
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            <span>Creando...</span>
          </>
        ) : (
          <>
            <PlusCircleIcon className="h-6 w-6" />
            <span>Crear Pólizas</span>
          </>
        )}
      </button>

      {/* Modal de resultados */}
      {showModal && results && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Resultado de Creación
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Resumen */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    Pólizas Creadas
                  </p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {results.creadas || 0}
                  </p>
                </div>

                {results.errores && results.errores.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      Errores
                    </p>
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300">
                      {results.errores.length}
                    </p>
                  </div>
                )}
              </div>

              {/* Lista de errores */}
              {results.errores && results.errores.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Errores encontrados:
                  </h4>
                  <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <ul className="space-y-2 text-sm text-red-800 dark:text-red-200">
                      {results.errores.map((error, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-red-600 dark:text-red-400">
                            •
                          </span>
                          <span>{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {results.creadas > 0 && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ✓ Las pólizas se han creado exitosamente. La página se
                    recargará automáticamente.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowModal(false);
                  if (results.creadas > 0) {
                    window.location.reload();
                  }
                }}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
