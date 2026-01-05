"use client";

import { useState, useRef } from "react";
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export default function UploadPolizasButtonNew({ onChangesDetected }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/polizas/preview-changes", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al analizar archivo");
      }

      console.log("Datos recibidos del servidor:", data);

      if (data.totalCambios > 0 || data.totalNuevas > 0) {
        if (onChangesDetected) {
          onChangesDetected(data);
        }
      } else {
        if (data.rowsProcessed === 0 && data.detectedColumns?.length > 0) {
          alert(`No se pudo leer ninguna póliza. Verifique que la columna de póliza tenga uno de estos nombres: "NO POLIZA", "POLIZA", "NUMERO POLIZA".\n\nColumnas detectadas en su archivo:\n${data.detectedColumns.join(", ")}`);
        } else {
          alert(`El archivo fue procesado (${data.rowsProcessed} filas) pero no se detectaron cambios respecto a la base de datos.`);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      alert(error.message || "Error al analizar el archivo");
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
        onClick={() => fileInputRef.current?.click()}
        disabled={isAnalyzing}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isAnalyzing ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            <span>Analizando...</span>
          </>
        ) : (
          <>
            <ArrowUpTrayIcon className="h-5 w-5" />
            <span>Subir Excel</span>
          </>
        )}
      </button>
    </>
  );
}


