import React, { useMemo } from "react";
import { formatCurrency } from "../utils";

export default function StatsCards({ data = [] }) {
  const stats = useMemo(() => {
    return {
      total: data.length,
      activas: data.filter((p) => p.estado === "ACTIVA").length,
      primaTotal: data.reduce(
        (sum, p) => sum + (parseFloat(p.prima_total) || 0),
        0
      ),
      docsPendientes: data.filter((p) => !p.documentos_completos).length,
    };
  }, [data]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-600 text-xs md:text-sm mb-1">
          Total Pólizas
        </div>
        <div className="text-2xl md:text-3xl font-bold text-blue-600">
          {stats.total}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-600 text-xs md:text-sm mb-1">Activas</div>
        <div className="text-2xl md:text-3xl font-bold text-green-600">
          {stats.activas}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-600 text-xs md:text-sm mb-1">
          Prima Total
        </div>
        <div className="text-xl md:text-2xl font-bold text-purple-600">
          {formatCurrency(stats.primaTotal)}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="text-gray-600 text-xs md:text-sm mb-1">
          Docs Pendientes
        </div>
        <div className="text-2xl md:text-3xl font-bold text-yellow-600">
          {stats.docsPendientes}
        </div>
      </div>
    </div>
  );
}
