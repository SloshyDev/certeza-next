"use client";

import { useState, useRef } from "react";
import { 
  ArrowUpTrayIcon, 
  DocumentArrowDownIcon, 
  XMarkIcon, 
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline";

export default function BulkUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadStep, setUploadStep] = useState('initial'); // initial, uploading, success, error
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [liveStats, setLiveStats] = useState({ actualizadas: 0, creadas: 0 });
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/polizas/template");
      if (!response.ok) throw new Error("Error al descargar plantilla");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

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

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type)) {
      alert("Por favor selecciona un archivo Excel válido (.xlsx o .xls)");
      return;
    }

    setIsUploading(true);
    setUploadStep('uploading');
    setResults(null);
    setProgress(0);
    setProgressMessage("Iniciando...");
    setLiveStats({ actualizadas: 0, creadas: 0 });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/polizas/upload-stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al subir el archivo");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
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
                setUploadStep('success');
                if (onUploadSuccess) onUploadSuccess();
              } else if (data.type === "error") {
                throw new Error(data.error || "Error al procesar");
              }
            } catch (parseError) {
              console.error("Error parsing JSON:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error al subir archivo:", error);
      setUploadStep('error');
      setProgressMessage(error.message || "Error al procesar el archivo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setUploadStep('initial');
    setResults(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Carga Masiva de Pólizas</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sube tus registros desde un archivo Excel</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {uploadStep === 'initial' && (
            <div className="space-y-8">
              {/* Step 1: Download Template */}
              <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">1. Descargar Plantilla</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1 mb-3">
                    Descarga el formato Excel con los campos requeridos para la carga masiva.
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium shadow-sm"
                  >
                    {isDownloading ? (
                      <span className="animate-pulse">Descargando...</span>
                    ) : (
                      <>
                        <DocumentArrowDownIcon className="h-4 w-4" />
                        Descargar Plantilla
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Step 2: Upload File */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <CloudArrowUpIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">2. Subir Archivo</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
                    Selecciona el archivo Excel con tus registros completados.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm font-medium shadow-sm"
                  >
                    <ArrowUpTrayIcon className="h-4 w-4" />
                    Seleccionar Archivo
                  </button>
                </div>
              </div>
            </div>
          )}

          {uploadStep === 'uploading' && (
            <div className="text-center py-8">
              <div className="mb-6 relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
                <div 
                  className="absolute inset-0 border-4 border-blue-600 dark:border-blue-500 rounded-full border-t-transparent animate-spin"
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-700 dark:text-gray-200">{progress}%</span>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Procesando archivo...</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8">{progressMessage}</p>
              
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{liveStats.creadas}</div>
                  <div className="text-sm text-green-700 dark:text-green-300">Creadas</div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{liveStats.actualizadas}</div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Actualizadas</div>
                </div>
              </div>
            </div>
          )}

          {uploadStep === 'success' && results && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mb-3">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">¡Carga Completada!</h3>
                <p className="text-green-700 dark:text-green-300 mt-1">{results.mensaje}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 text-center border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{results.total}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total</div>
                </div>
                <div className="p-4 text-center border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{results.actualizadas + results.creadas}</div>
                  <div className="text-xs text-green-600 dark:text-green-400 uppercase tracking-wide mt-1">Exitosas</div>
                </div>
                <div className="p-4 text-center border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{results.errores.length}</div>
                  <div className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wide mt-1">Errores</div>
                </div>
              </div>

              {results.errores.length > 0 && (
                <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <h4 className="font-semibold text-red-900 dark:text-red-100 text-sm">Detalle de Errores</h4>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-red-700 dark:text-red-300 uppercase bg-red-50/50 dark:bg-red-900/10">
                        <tr>
                          <th className="px-4 py-2">Fila</th>
                          <th className="px-4 py-2">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100 dark:divide-red-800/50">
                        {results.errores.map((error, index) => (
                          <tr key={index} className="bg-white dark:bg-gray-800 hover:bg-red-50/30">
                            <td className="px-4 py-2 font-medium text-red-900 dark:text-red-200 w-20">#{error.fila}</td>
                            <td className="px-4 py-2 text-red-800 dark:text-red-300">{error.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {uploadStep === 'error' && (
            <div className="flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <ExclamationCircleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error en la carga</h3>
              <p className="text-red-600 dark:text-red-400 max-w-md mx-auto">{progressMessage}</p>
              <button
                onClick={() => setUploadStep('initial')}
                className="mt-6 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-medium"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors font-medium"
          >
            {uploadStep === 'success' ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}
