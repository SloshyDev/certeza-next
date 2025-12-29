"use client";

import { useState } from "react";
import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";

export default function UploadEstadosCuentaButton({ onUploadSuccess }) {
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [nombreQuincena, setNombreQuincena] = useState("");
  const [excelData, setExcelData] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Procesar todas las hojas excepto la primera (GENERAL)
        const detalles = [];

        workbook.SheetNames.forEach((sheetName, index) => {
          // Saltar la hoja GENERAL
          if (sheetName === "GENERAL" || index === 0) return;

          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // Saltar las primeras 2 filas (título y encabezados)
          // La fila 3 tiene los encabezados
          const headers = jsonData[2];

          // Procesar datos desde la fila 4 en adelante
          for (let i = 3; i < jsonData.length; i++) {
            const row = jsonData[i];

            // Si la fila está vacía o es la fila de totales, saltar
            if (
              !row ||
              row.length === 0 ||
              row[0] === "" ||
              row[6] === "TOTAL:"
            )
              continue;

            detalles.push({
              asesor_nombre: sheetName,
              asesor_clave: jsonData[0][0]?.split("(")[1]?.split(")")[0] || "",
              no_poliza: row[0],
              cia: row[1],
              forma_pago: row[2],
              prima_total: parseFloat(row[3]) || 0,
              prima_neta: parseFloat(row[4]) || 0,
              porcentaje_comision: parseFloat(row[5]) || 0,
              no_recibo: parseInt(row[6]) || null,
              comision: parseFloat(row[7]) || 0,
              f_pago_comision: row[8],
              f_desde: row[9],
              f_hasta: row[10],
              estatus_pago: row[11],
              estatus_comision: row[12],
            });
          }
        });

        if (detalles.length === 0) {
          alert("No se encontraron datos válidos en el archivo");
          return;
        }

        setExcelData(detalles);
        setShowModal(true);
      } catch (error) {
        console.error("Error al leer el archivo:", error);
        alert(
          "Error al procesar el archivo. Verifica que sea un Excel válido."
        );
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!nombreQuincena.trim()) {
      alert("Por favor ingresa el nombre de la quincena");
      return;
    }

    if (!excelData || excelData.length === 0) {
      alert("No hay datos para cargar");
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/estados-cuenta/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_quincena: nombreQuincena.trim(),
          detalles: excelData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar estado de cuenta");
      }

      alert(
        `Estado de cuenta cargado exitosamente:\n- Quincena: ${nombreQuincena}\n- ${
          data.detalles_insertados
        } registros insertados\n- Total comisiones: $${data.total_comisiones.toFixed(
          2
        )}`
      );

      setShowModal(false);
      setNombreQuincena("");
      setExcelData(null);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Error al cargar estado de cuenta:", error);
      alert(
        error.message ||
          "Error al cargar estado de cuenta. Por favor intenta de nuevo."
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors cursor-pointer font-medium">
        <ArrowUpTrayIcon className="h-5 w-5" />
        <span>Cargar Estado de Cuenta</span>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>

      {/* Modal para nombre de quincena */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nombre de Quincena
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setNombreQuincena("");
                  setExcelData(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Se encontraron <strong>{excelData?.length || 0}</strong>{" "}
                registros en el archivo.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre de la Quincena (ej: "Quincena 24 - 2025")
                </label>
                <input
                  type="text"
                  value={nombreQuincena}
                  onChange={(e) => setNombreQuincena(e.target.value)}
                  placeholder="Ej: Quincena 24 - 2025"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isUploading}
                />
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Importante:</strong> Una vez cargados, los datos
                  serán inmutables y no podrán modificarse.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setNombreQuincena("");
                  setExcelData(null);
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
                disabled={isUploading}
              >
                {isUploading ? "Cargando..." : "Cargar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
