"use client";

import { useState } from "react";
import { PlusCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function GenerarRecibosButton({ filters }) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [comisionFaltante, setComisionFaltante] = useState(null);
  const [comisionPorcentaje, setComisionPorcentaje] = useState("");

  const handleGenerarRecibos = async () => {
    setLoading(true);
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

      const response = await fetch(
        `/api/recibos/generar?${params.toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Si falta comisión, mostrar modal
        if (data.error === "COMISION_FALTANTE" && data.poliza) {
          setComisionFaltante(data.poliza);
          setComisionPorcentaje("");
          return;
        }
        throw new Error(data.error || "Error al generar recibos");
      }

      alert(
        `Recibos generados exitosamente:\n- ${data.recibosCreados} nuevos recibos creados\n- ${data.recibosActualizados} recibos actualizados`
      );

      // Recargar página para ver los cambios
      window.location.reload();
    } catch (error) {
      console.error("Error al generar recibos:", error);
      alert(
        error.message || "Error al generar recibos. Por favor intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAsignarComision = async () => {
    if (!comisionPorcentaje || isNaN(comisionPorcentaje)) {
      alert("Por favor ingresa un porcentaje de comisión válido");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/polizas/${comisionFaltante.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commission_percentage: parseFloat(comisionPorcentaje),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al asignar comisión");
      }

      // Cerrar modal y continuar con generación
      setComisionFaltante(null);
      setComisionPorcentaje("");

      // Reintentar generar recibos
      await handleGenerarRecibos();
    } catch (error) {
      console.error("Error al asignar comisión:", error);
      alert(
        error.message ||
          "Error al asignar comisión. Por favor intenta de nuevo."
      );
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleGenerarRecibos}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        title="Generar Recibos"
      >
        <PlusCircleIcon className="h-5 w-5" />
        <span>{loading ? "Generando..." : "Generar Recibos"}</span>
      </button>

      {/* Modal para asignar comisión */}
      {comisionFaltante && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Comisión Faltante
              </h3>
              <button
                onClick={() => setComisionFaltante(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                La póliza <strong>{comisionFaltante.no_poliza}</strong> no tiene
                un porcentaje de comisión asignado.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Porcentaje de Comisión (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={comisionPorcentaje}
                  onChange={(e) => setComisionPorcentaje(e.target.value)}
                  placeholder="Ej: 15.5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setComisionFaltante(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAsignarComision}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Asignar y Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
