"use client";

import React, { useEffect, useState, useCallback } from "react";
import ExtractorModal from "@/components/ExtractorModal";
import BulkUploadModal from "./components/BulkUploadModal";
import { usePolizasFilters } from "./hooks/usePolizasFilters";
import { usePolizasData } from "./hooks/usePolizasData";
import StatsCards from "./components/StatsCards";
import FilterBar from "./components/FilterBar";
import PolizasTable from "./components/PolizasTable";

export default function PolizasExtractorPage() {
  const filters = usePolizasFilters();
  const { data, loading, error, fetchPolizas, deletePoliza } = usePolizasData();

  // Estado del modal del extractor
  const [isExtractorOpen, setIsExtractorOpen] = useState(false);
  // Estado del modal de carga masiva
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  // Carga inicial
  useEffect(() => {
    fetchPolizas("");
  }, [fetchPolizas]);

  const handleApplyFilters = useCallback(() => {
    const params = filters.getFilterParams();
    fetchPolizas(params);
  }, [filters, fetchPolizas]);

  const handleClearFilters = useCallback(() => {
    filters.clearFilters();
    // Esperar un poco para asegurar que el estado se limpie antes de recargar
    // O mejor, pasar string vacío explícitamente
    setTimeout(() => fetchPolizas(""), 100);
  }, [filters, fetchPolizas]);

  const handleDelete = useCallback(
    async (id_poliza, numero_poliza) => {
      const result = await deletePoliza(id_poliza, numero_poliza);
      if (result.success) {
        alert(`✅ Póliza ${numero_poliza} eliminada exitosamente`);
        // Recargar datos con filtros actuales
        const params = filters.getFilterParams();
        fetchPolizas(params);
      } else if (result.error) {
        alert(`❌ Error al eliminar: ${result.error}`);
      }
    },
    [deletePoliza, filters, fetchPolizas]
  );

  const handleExtractorSuccess = useCallback(() => {
    const params = filters.getFilterParams();
    fetchPolizas(params);
  }, [filters, fetchPolizas]);

  const handleBulkUploadSuccess = useCallback(() => {
    const params = filters.getFilterParams();
    fetchPolizas(params);
  }, [filters, fetchPolizas]);

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6">
      <div className="">
        {/* Filtros */}
        <FilterBar
          {...filters}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          loading={loading}
        />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4 md:mb-6">
            <p className="font-semibold">❌ Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Estadísticas */}
        <StatsCards data={data} />

        {/* Tabla */}
        <PolizasTable data={data} loading={loading} onDelete={handleDelete} />
      </div>

      {/* Botón Flotante para abrir el Extractor */}
      <button
        onClick={() => setIsExtractorOpen(true)}
        className="fixed bottom-6 left-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center gap-2 px-5 py-4 z-40 group"
        title="Abrir Extractor de Pólizas"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="font-semibold">Extraer PDF</span>
      </button>

      {/* Botón Flotante para Carga Masiva */}
      <button
        onClick={() => setIsBulkUploadOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-green-600 to-green-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center gap-2 px-5 py-4 z-40 group"
        title="Carga Masiva Excel"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span className="font-semibold">Carga Masiva</span>
      </button>

      {/* Modal del Extractor */}
      <ExtractorModal
        isOpen={isExtractorOpen}
        onClose={() => setIsExtractorOpen(false)}
        onSuccess={handleExtractorSuccess}
      />

      {/* Modal de Carga Masiva */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onUploadSuccess={handleBulkUploadSuccess}
      />
    </div>
  );
}
