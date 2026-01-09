import React from "react";

export default function FilterBar({
  searchTerm,
  setSearchTerm,
  selectedAsesor,
  setSelectedAsesor,
  selectedGerente,
  setSelectedGerente,
  selectedEstado,
  setSelectedEstado,
  fechaDesde,
  setFechaDesde,
  fechaHasta,
  setFechaHasta,
  asesores,
  gerentes,
  onApply,
  onClear,
  loading,
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4 md:mb-6">
      <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">🔍</span> Filtros Rápidos
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4">
        {/* Búsqueda general */}
        <div className="lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Búsqueda General
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por póliza, folio, asegurado, RFC, placas..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
            onKeyDown={(e) => e.key === "Enter" && onApply()}
          />
        </div>

        {/* Asesor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Asesor
          </label>
          <select
            value={selectedAsesor}
            onChange={(e) => setSelectedAsesor(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="">Todos los asesores</option>
            {asesores.map((asesor) => (
              <option key={asesor.id} value={asesor.clave}>
                {asesor.clave} - {asesor.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Gerente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gerencia
          </label>
          <select
            value={selectedGerente}
            onChange={(e) => setSelectedGerente(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="">Todas las gerencias</option>
            {gerentes.map((gerente) => (
              <option key={gerente.id} value={gerente.nombre}>
                {gerente.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <select
            value={selectedEstado}
            onChange={(e) => setSelectedEstado(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVA">ACTIVA</option>
            <option value="CANCELADA">CANCELADA</option>
            <option value="PENDIENTE">PENDIENTE</option>
          </select>
        </div>

        {/* Fecha Desde */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vigencia Desde
          </label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          />
        </div>

        {/* Fecha Hasta */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vigencia Hasta
          </label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          />
        </div>
      </div>

      {/* Botones de filtro */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={onApply}
          disabled={loading}
          className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
        >
          {loading ? "Buscando..." : "🔍 Aplicar Filtros"}
        </button>
        <button
          onClick={onClear}
          disabled={loading}
          className="flex-1 sm:flex-none bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
        >
          🗑️ Limpiar
        </button>
      </div>
    </div>
  );
}
