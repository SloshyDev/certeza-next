"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

export default function UploadRecibosButton({ onSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [showModal, setShowModal] = useState(false);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset
    setProgress("");
    setResult(null);
    setShowModal(true);
    setIsUploading(true);

    try {
      // Leer Excel
      setProgress("Leyendo archivo...");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: "",
      });

      if (!jsonData || jsonData.length === 0) {
        throw new Error("El archivo está vacío");
      }

      setProgress(`Procesando ${jsonData.length} filas...`);

      // Enviar a API
      const res = await fetch("/api/recibos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: jsonData }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Error al procesar recibos");
      }

      setResult(responseData);
      setProgress("✅ Proceso completado");

      // Recargar stats
      if (onSuccess && responseData.creados > 0) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
      }
    } catch (error) {
      setResult({
        ok: false,
        error: error.message,
        creados: 0,
        errores: [],
      });
      setProgress("❌ Error en el proceso");
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  }

  function closeModal() {
    setShowModal(false);
    setResult(null);
    setProgress("");
  }

  return (
    <>
      {/* Floating Button */}
      <label
        htmlFor="recibos-upload"
        className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg cursor-pointer transition-all hover:scale-110 z-50"
        title="Cargar recibos desde Excel"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </label>

      <input
        type="file"
        id="recibos-upload"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileUpload}
        disabled={isUploading}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-lg font-semibold">
                {isUploading ? "Procesando Recibos..." : "Resultado"}
              </h3>
              {!isUploading && (
                <button
                  onClick={closeModal}
                  className="text-muted hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Progress */}
              {isUploading && (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                  <p className="text-muted">{progress}</p>
                </div>
              )}

              {/* Result */}
              {!isUploading && result && (
                <div className="space-y-4">
                  {result.ok === false ? (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
                        ❌ Error
                      </p>
                      <p className="text-red-800 dark:text-red-200">
                        {result.error}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                          ✅ Proceso completado
                        </p>
                        <p className="text-green-800 dark:text-green-200">
                          <strong>{result.creados}</strong> recibos creados
                          exitosamente
                        </p>
                      </div>

                      {result.errores && result.errores.length > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
                            ⚠️ Errores ({result.errores.length})
                          </p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {result.errores.map((err, idx) => (
                              <div
                                key={idx}
                                className="text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900 rounded p-2"
                              >
                                <span className="font-medium">
                                  Fila {err.fila}:
                                </span>{" "}
                                {err.error}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {!isUploading && (
              <div className="border-t border-border p-4 flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
