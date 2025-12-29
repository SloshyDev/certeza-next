"use client";

import { useState, useRef } from "react";
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export default function UploadPolizasButtonNew({ onUploadSuccess }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [showCanceladasModal, setShowCanceladasModal] = useState(false);
  const [cambios, setCambios] = useState([]);
  const [nuevas, setNuevas] = useState([]);
  const [canceladas, setCanceladas] = useState([]);
  const [descuentosExcel, setDescuentosExcel] = useState(null);
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
      console.log(
        `Total cambios: ${data.totalCambios}, Nuevas: ${data.totalNuevas}, Canceladas: ${data.totalCanceladas}`
      );

      setCambios(data.cambios || []);
      setNuevas(data.nuevas || []);
      setCanceladas(data.canceladas || []);

      // Primero verificar si hay cambios o nuevas (incluyendo canceladas)
      if (data.totalCambios > 0 || data.totalNuevas > 0) {
        // Si hay canceladas, mostrar ese modal primero
        if (data.totalCanceladas > 0) {
          setShowCanceladasModal(true);
        } else {
          setShowChangesModal(true);
        }
      } else {
        alert("No se detectaron cambios en el archivo");
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

  const handleToggleChange = (index) => {
    setCambios((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleToggleComision = (index) => {
    setCambios((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, cambiarComision: !c.cambiarComision } : c
      )
    );
  };

  const handleToggleDuplicarPoliza = (index) => {
    setCambios((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, duplicarPoliza: !c.duplicarPoliza } : c
      )
    );
  };

  const handleSelectAll = () => {
    setCambios((prev) => prev.map((c) => ({ ...c, selected: true })));
  };

  const handleDeselectAll = () => {
    setCambios((prev) => prev.map((c) => ({ ...c, selected: false })));
  };

  const handleApplyChanges = async () => {
    const cambiosSeleccionados = cambios.filter((c) => c.selected);

    if (cambiosSeleccionados.length === 0 && nuevas.length === 0) {
      alert("No hay cambios seleccionados para aplicar");
      return;
    }

    setIsApplying(true);
    try {
      const response = await fetch("/api/polizas/apply-changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cambiosSeleccionados,
          nuevas,
          canceladas: canceladas.filter((c) => c.selected),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al aplicar cambios");
      }

      // Si hay descuentos, guardar el Excel
      if (data.descuentosExcel) {
        setDescuentosExcel(data.descuentosExcel);
      }

      // Construir mensaje de ajustes si los hay
      let mensajeAjustes = "";
      if (data.ajustesAplicados && data.ajustesAplicados.length > 0) {
        mensajeAjustes = `\n\n📋 Ajustes aplicados (${data.totalAjustes}):\n`;
        data.ajustesAplicados.forEach((ajuste) => {
          if (ajuste.tipo === "forma_pago") {
            mensajeAjustes += `\n• ${ajuste.poliza}: ${ajuste.forma_anterior} → ${ajuste.nueva_forma_pago}\n`;
            mensajeAjustes += `  - Recibos pagados: ${ajuste.recibos_pagados} (debió ${ajuste.recibos_debidos})\n`;
            mensajeAjustes += `  - Comisión pagada: $${ajuste.comision_pagada.toFixed(
              2
            )}\n`;
            mensajeAjustes += `  - Comisión debida: $${ajuste.comision_debida.toFixed(
              2
            )}\n`;
            mensajeAjustes += `  - Diferencia: $${ajuste.diferencia.toFixed(
              2
            )} (Recibo #${ajuste.no_recibo_ajuste})\n`;
            mensajeAjustes += `  - Nueva comisión: ${ajuste.nueva_comision_porcentaje}%`;
          }
        });
      }

      alert(
        `Actualización exitosa:\n- ${
          data.actualizadas
        } pólizas actualizadas\n- ${data.creadas} pólizas creadas\n${
          data.totalCanceladas > 0
            ? `- ${data.totalCanceladas} cancelaciones (descarga archivo de descuentos)`
            : ""
        }${mensajeAjustes}`
      );

      setShowChangesModal(false);
      setShowCanceladasModal(false);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error("Error:", error);
      alert(error.message || "Error al aplicar cambios");
    } finally {
      setIsApplying(false);
    }
  };

  const handleDownloadDescuentos = () => {
    if (!descuentosExcel) return;

    const byteCharacters = atob(descuentosExcel);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Descuentos_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setDescuentosExcel(null);
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

      {/* Modal para pólizas canceladas */}
      {showCanceladasModal && canceladas.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">
                Pólizas Canceladas / Reexpedidas - Descuentos
              </h3>
              <button
                onClick={() => setShowCanceladasModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Las siguientes pólizas están marcadas como CANCELADA o
                  REEXPEDIDA. Se generará un archivo Excel con descuentos
                  (valores negativos) que deberás cargar en la página de
                  Recibos.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Póliza
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        CIA
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Prima Total
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Prima Neta
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Comisión
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        Motivo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {canceladas.map((c, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-4 py-3 text-sm font-medium">
                          {c.no_poliza}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {c.datosNuevos.cia}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          -${c.descuento.prima_total.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          -${c.descuento.prima_neta.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          -${c.descuento.comision.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                            {c.datosNuevos.estatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-border">
              <button
                onClick={() => setShowCanceladasModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowCanceladasModal(false);
                  setShowChangesModal(true);
                }}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                disabled={isApplying}
              >
                Continuar con Actualización
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cambios */}
      {showChangesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Cambios Detectados
                </h3>
                <p className="text-sm text-muted">
                  {cambios.filter((c) => c.selected).length} de {cambios.length}{" "}
                  seleccionados para actualizar
                </p>
              </div>
              <button
                onClick={() => setShowChangesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Seleccionar Todos
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Deseleccionar Todos
                </button>
              </div>

              <div className="space-y-4">
                {cambios.map((cambio, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 ${
                      cambio.selected
                        ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10"
                        : "border-border bg-white dark:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={cambio.selected}
                          onChange={() => handleToggleChange(idx)}
                          className="h-5 w-5 rounded text-blue-600"
                        />
                        <div>
                          <h4 className="font-semibold text-foreground">
                            Póliza: {cambio.no_poliza}
                          </h4>
                          <p className="text-xs text-muted">
                            Fila {cambio.fila}
                          </p>
                        </div>
                      </div>
                      {cambio.requiereDescuento && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                          Requiere Descuento
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {cambio.cambios.map((c, cidx) => (
                        <div
                          key={cidx}
                          className="bg-white dark:bg-gray-700 rounded p-3"
                        >
                          <p className="text-xs font-medium text-muted mb-1">
                            {c.campo}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm line-through text-red-600 dark:text-red-400">
                              {c.anterior || "N/A"}
                            </span>
                            <span className="text-xs">→</span>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              {c.nuevo || "N/A"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {cambio.tieneCambioComision && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                              Cambio en % de Comisión
                            </p>
                            <div className="text-xs text-blue-700 dark:text-blue-300">
                              <span className="line-through">
                                {cambio.comisionAnterior}%
                              </span>{" "}
                              →{" "}
                              <span className="font-medium">
                                {cambio.comisionNueva}%
                              </span>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cambio.cambiarComision}
                              onChange={() => handleToggleComision(idx)}
                              className="h-4 w-4 rounded text-blue-600"
                            />
                            <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                              Aplicar cambio
                            </span>
                          </label>
                        </div>
                        {!cambio.cambiarComision && (
                          <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 italic">
                            ℹ️ Se mantendrá la comisión actual (
                            {cambio.comisionAnterior}%)
                          </div>
                        )}
                      </div>
                    )}

                    {cambio.tieneCambioAsesor && (
                      <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-1">
                              ⚠️ Cambio de Asesor
                            </p>
                            <div className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                              <span className="line-through">
                                Asesor ID: {cambio.asesorAnterior}
                              </span>{" "}
                              →{" "}
                              <span className="font-medium">
                                Asesor ID: {cambio.asesorNuevo}
                              </span>
                            </div>
                            <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 p-2 rounded">
                              <p className="font-medium mb-1">
                                Al confirmar se realizará:
                              </p>
                              <ul className="list-disc list-inside space-y-0.5 ml-2">
                                <li>
                                  La póliza actual se renombrará a{" "}
                                  <strong>{cambio.no_poliza}_1</strong>
                                </li>
                                <li>
                                  Su estatus cambiará a{" "}
                                  <strong>DUPLICADA</strong>
                                </li>
                                <li>
                                  Se creará una nueva póliza con el número{" "}
                                  <strong>{cambio.no_poliza}</strong> para el
                                  nuevo asesor
                                </li>
                                <li>
                                  Los recibos existentes se mantendrán con el
                                  asesor anterior
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer mt-3">
                          <input
                            type="checkbox"
                            checked={cambio.duplicarPoliza}
                            onChange={() => handleToggleDuplicarPoliza(idx)}
                            className="h-4 w-4 rounded text-orange-600"
                          />
                          <span className="text-xs font-medium text-orange-800 dark:text-orange-200">
                            Confirmo que deseo duplicar la póliza
                          </span>
                        </label>
                        {!cambio.duplicarPoliza && (
                          <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 italic">
                            ⚠️ El cambio de asesor NO se aplicará hasta que
                            confirmes la duplicación
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-border">
              <button
                onClick={() => setShowChangesModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                disabled={isApplying}
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyChanges}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                disabled={isApplying}
              >
                {isApplying ? "Aplicando..." : "Aplicar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para descargar descuentos */}
      {descuentosExcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-center text-foreground mb-2">
              Actualización Completada
            </h3>

            <p className="text-sm text-center text-muted mb-6">
              Se generó un archivo de descuentos. Descárgalo y súbelo en la
              página de
              <strong> Recibos</strong> para aplicar los valores negativos.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDownloadDescuentos}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Descargar Archivo de Descuentos
              </button>
              <button
                onClick={() => {
                  setDescuentosExcel(null);
                  if (onUploadSuccess) onUploadSuccess();
                }}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
