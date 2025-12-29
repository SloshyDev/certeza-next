"use client";

import { useState } from "react";

export default function DescargarEstadosCuentaButton() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const handleDescargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append("fecha_inicio", fechaInicio);
      if (fechaFin) params.append("fecha_fin", fechaFin);

      const response = await fetch(
        `/api/recibos/estados-cuenta?${params.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Error al generar estados de cuenta");
        return;
      }

      // Descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Estados_Cuenta_${fechaInicio || "todos"}_${
        fechaFin || "todos"
      }.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowModal(false);
      setFechaInicio("");
      setFechaFin("");
    } catch (error) {
      console.error("Error:", error);
      alert("Error al descargar estados de cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Descargar Estados de Cuenta
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-card border bg-black/40 backdrop-blur-sm border-border rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-lg font-semibold text-white">
                Estados de Cuenta por Asesor
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-foreground"
                disabled={loading}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-muted">
                Descarga un archivo Excel con las comisiones pagadas separadas
                por asesor.
              </p>

              <div>
                <label className="block text-sm font-medium mb-1 text-white">
                  Fecha Inicio (opcional)
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-white">
                  Fecha Fin (opcional)
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="border-t border-border p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/80"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleDescargar}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Generando..." : "Descargar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
