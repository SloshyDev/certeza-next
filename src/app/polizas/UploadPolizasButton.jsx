"use client";

import { useState, useRef } from "react";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function UploadPolizasButton({ onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [liveStats, setLiveStats] = useState({ actualizadas: 0, creadas: 0 });
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
    setProgress(0);
    setProgressMessage("Iniciando...");
    setLiveStats({ actualizadas: 0, creadas: 0 });

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Usar endpoint con streaming para progreso en tiempo real
      const response = await fetch("/api/polizas/upload-stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al subir el archivo");
      }

      // Leer stream de eventos
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; // Buffer para manejar chunks fragmentados

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Agregar el nuevo chunk al buffer
        buffer += decoder.decode(value, { stream: true });

        // Procesar líneas completas (terminadas en \n\n para SSE)
        const lines = buffer.split("\n\n");

        // La última parte podría estar incompleta, mantenerla en el buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              const data = JSON.parse(jsonStr);

              if (data.type === "progress") {
                setProgress(data.progress || 0);
                setProgressMessage(data.message || "Procesando...");
                if (data.actualizadas !== undefined) {
                  setLiveStats({
                    actualizadas: data.actualizadas,
                    creadas: data.creadas,
                  });
                }
              } else if (data.type === "complete") {
                setProgress(100);
                setProgressMessage("Completado");
                setResults(data);
                setShowModal(true);

                // Notificar al componente padre
                if (onUploadSuccess) {
                  onUploadSuccess();
                }
              } else if (data.type === "error") {
                throw new Error(data.error || "Error al procesar");
              }
            } catch (parseError) {
              console.error("Error parsing JSON:", parseError, "Line:", line);
              // Continuar con el siguiente mensaje en lugar de fallar
            }
          }
        }
      }
    } catch (error) {
      console.error("Error al subir archivo:", error);
      alert(
        error.message ||
          "Error al procesar el archivo. Por favor intenta de nuevo."
      );
      setProgress(0);
      setProgressMessage("");
    } finally {
      setIsUploading(false);
      // Limpiar input para permitir subir el mismo archivo de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const closeModal = () => {
    setShowModal(false);
    setResults(null);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={handleButtonClick}
        disabled={isUploading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        title="Subir Excel para actualizar pólizas"
      >
        {isUploading ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            <span>{progress}%</span>
          </>
        ) : (
          <>
            <ArrowUpTrayIcon className="h-5 w-5" />
            <span>Subir Excel</span>
          </>
        )}
      </button>

      {/* Barra de progreso flotante */}
      {isUploading && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-xl p-4 w-80 z-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">
                Procesando archivo
              </h4>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {progress}%
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>

            <p className="text-xs text-muted">{progressMessage}</p>

            {/* Estadísticas en tiempo real */}
            {(liveStats.actualizadas > 0 || liveStats.creadas > 0) && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {liveStats.actualizadas}
                  </p>
                  <p className="text-xs text-muted">Actualizadas</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {liveStats.creadas}
                  </p>
                  <p className="text-xs text-muted">Creadas</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de resultados */}
      {showModal && results && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Resultados de la Actualización
              </h3>
              <button
                onClick={closeModal}
                className="text-muted hover:text-foreground transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {/* Resumen */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    {results.mensaje}
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {results.total}
                      </p>
                      <p className="text-xs text-muted">Total procesadas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {results.actualizadas + results.creadas}
                      </p>
                      <p className="text-xs text-muted">Exitosas</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {results.errores.length}
                      </p>
                      <p className="text-xs text-muted">Errores</p>
                    </div>
                  </div>
                </div>

                {/* Detalle de operaciones exitosas */}
                {(results.actualizadas > 0 || results.creadas > 0) && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                      ✓ Operaciones Exitosas
                    </h4>
                    <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                      {results.actualizadas > 0 && (
                        <li>
                          • {results.actualizadas} póliza(s) actualizada(s)
                        </li>
                      )}
                      {results.creadas > 0 && (
                        <li>• {results.creadas} póliza(s) creada(s)</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Errores */}
                {results.errores.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                      ⚠ Errores Encontrados
                    </h4>
                    <div className="max-h-48 overflow-y-auto">
                      <ul className="text-sm text-red-800 dark:text-red-200 space-y-2">
                        {results.errores.map((error, index) => (
                          <li
                            key={index}
                            className="border-b border-red-200 dark:border-red-800 pb-2 last:border-0"
                          >
                            <span className="font-medium">
                              Fila {error.fila}:
                            </span>{" "}
                            {error.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-primary text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-opacity font-medium"
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
