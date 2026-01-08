"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import ExtractorModal from "@/components/ExtractorModal";

export default function PolizasExtractorPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAsesor, setSelectedAsesor] = useState("");
  const [selectedGerente, setSelectedGerente] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // Listas para filtros
  const [asesores, setAsesores] = useState([]);
  const [gerentes, setGerentes] = useState([]);

  // Estado del modal del extractor
  const [isExtractorOpen, setIsExtractorOpen] = useState(false);

  useEffect(() => {
    loadAsesores();
    loadGerentes();
    loadPolizas();
  }, []);

  const loadAsesores = async () => {
    try {
      const response = await fetch("/api/asesores-list");
      const data = await response.json();
      if (data.success) {
        setAsesores(data.asesores || []);
      }
    } catch (err) {
      console.error("Error al cargar asesores:", err);
    }
  };

  const loadGerentes = async () => {
    try {
      const response = await fetch("/api/gerentes-list");
      const data = await response.json();
      if (data.success) {
        setGerentes(data.gerentes || []);
      }
    } catch (err) {
      console.error("Error al cargar gerentes:", err);
    }
  };

  const loadPolizas = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedAsesor) params.append("asesor", selectedAsesor);
      if (selectedGerente) params.append("gerente", selectedGerente);
      if (selectedEstado) params.append("estado", selectedEstado);
      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);

      const response = await fetch(`/api/polizas/list?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.polizas || []);
      } else {
        setError(result.error || "Error al cargar pólizas");
      }
    } catch (err) {
      setError("Error al conectar con el servidor");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadPolizas();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedAsesor("");
    setSelectedGerente("");
    setSelectedEstado("");
    setFechaDesde("");
    setFechaHasta("");
    setTimeout(() => loadPolizas(), 100);
  };

  const handleDelete = async (id_poliza, numero_poliza) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar la póliza ${numero_poliza}?\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/polizas/delete?id=${id_poliza}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Póliza ${numero_poliza} eliminada exitosamente`);
        loadPolizas(); // Recargar datos
      } else {
        alert(`❌ Error al eliminar: ${result.error}`);
      }
    } catch (err) {
      console.error("Error al eliminar:", err);
      alert(`❌ Error al eliminar: ${err.message}`);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return "-";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value);
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-MX");
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "documentos_faltantes",
        header: "Docs Faltantes",
        cell: (info) => (
          <span className="text-xs">{info.getValue() || "-"}</span>
        ),
      },
      {
        accessorKey: "fecha_ingreso_digital",
        header: "Fecha Ing. Digital",
        cell: (info) => formatDate(info.getValue()),
      },
      {
        accessorKey: "quincena",
        header: "Quincena",
        cell: (info) => (
          <span className="text-xs">{info.getValue() || "-"}</span>
        ),
      },
      {
        accessorKey: "gerente",
        header: "Gerencia",
      },
      {
        accessorKey: "asesor",
        header: "Asesor",
        cell: (info) => (
          <div>
            <div className="text-xs text-gray-500">
              {info.row.original.clave_asesor}
            </div>
            <div className="text-sm">{info.getValue() || "-"}</div>
          </div>
        ),
      },
      {
        accessorKey: "numero_folio",
        header: "Folio",
        cell: (info) => (
          <span className="font-mono text-sm">{info.getValue() || "-"}</span>
        ),
      },
      {
        accessorKey: "asegurado",
        header: "Asegurado",
        cell: (info) => (
          <div>
            <div className="font-semibold text-sm">
              {info.getValue() || "-"}
            </div>
            <div className="text-xs text-gray-500">{info.row.original.rfc}</div>
          </div>
        ),
      },
      {
        accessorKey: "numero_poliza",
        header: "Póliza",
        cell: (info) => (
          <span className="font-mono font-semibold text-blue-600 text-sm">
            {info.getValue() || "-"}
          </span>
        ),
      },
      {
        accessorKey: "poliza_cancelada_sustitucion",
        header: "Póliza Cancelada",
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue() || "-"}</span>
        ),
      },
      {
        accessorKey: "aseguradora",
        header: "Aseguradora",
      },
      {
        accessorKey: "prima_total",
        header: "Prima Total",
        cell: (info) => (
          <span className="font-semibold">
            {formatCurrency(info.getValue())}
          </span>
        ),
      },
      {
        accessorKey: "prima_neta",
        header: "Prima Neta",
        cell: (info) => formatCurrency(info.getValue()),
      },
      {
        accessorKey: "pago_mixto",
        header: "Pago Mixto",
        cell: (info) => formatCurrency(info.getValue()),
      },
      {
        accessorKey: "numero_vale",
        header: "Nº Vale",
        cell: (info) => (
          <span className="font-mono text-xs">{info.getValue() || "-"}</span>
        ),
      },
      {
        accessorKey: "fecha_ingreso_vales",
        header: "Fecha Ing. Vales",
        cell: (info) => formatDate(info.getValue()),
      },
      {
        accessorKey: "estado_vale",
        header: "Estado Vale",
        cell: (info) => (
          <span className="text-xs">{info.getValue() || "-"}</span>
        ),
      },
      {
        accessorKey: "fecha_desde",
        header: "Vigencia Desde",
        cell: (info) => formatDate(info.getValue()),
      },
      {
        accessorKey: "fecha_hasta",
        header: "Vigencia Hasta",
        cell: (info) => formatDate(info.getValue()),
      },
      {
        accessorKey: "forma_pago",
        header: "Forma Pago",
      },
      {
        accessorKey: "estado",
        header: "Estado Póliza",
        cell: (info) => {
          const estado = info.getValue();
          const colorClass =
            estado === "ACTIVA"
              ? "bg-green-100 text-green-800"
              : estado === "CANCELADA"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800";
          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}
            >
              {estado || "PENDIENTE"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Acciones",
        cell: (info) => (
          <button
            onClick={() =>
              handleDelete(
                info.row.original.id_poliza,
                info.row.original.numero_poliza
              )
            }
            className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition font-semibold"
            title="Eliminar póliza"
          >
            🗑️ Eliminar
          </button>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-3 md:p-6">
      <div className="">
        {/* Filtros */}
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
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
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
              onClick={handleApplyFilters}
              disabled={loading}
              className="flex-1 sm:flex-none bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
            >
              {loading ? "Buscando..." : "🔍 Aplicar Filtros"}
            </button>
            <button
              onClick={handleClearFilters}
              disabled={loading}
              className="flex-1 sm:flex-none bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-sm md:text-base"
            >
              🗑️ Limpiar
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4 md:mb-6">
            <p className="font-semibold">❌ Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-600 text-xs md:text-sm mb-1">
              Total Pólizas
            </div>
            <div className="text-2xl md:text-3xl font-bold text-blue-600">
              {data.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-600 text-xs md:text-sm mb-1">Activas</div>
            <div className="text-2xl md:text-3xl font-bold text-green-600">
              {data.filter((p) => p.estado === "ACTIVA").length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-600 text-xs md:text-sm mb-1">
              Prima Total
            </div>
            <div className="text-xl md:text-2xl font-bold text-purple-600">
              {formatCurrency(
                data.reduce(
                  (sum, p) => sum + (parseFloat(p.prima_total) || 0),
                  0
                )
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-gray-600 text-xs md:text-sm mb-1">
              Docs Pendientes
            </div>
            <div className="text-2xl md:text-3xl font-bold text-yellow-600">
              {data.filter((p) => !p.documentos_completos).length}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Vista móvil (cards) */}
          <div className="block md:hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando pólizas...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-xl mb-2">📭</p>
                <p>No se encontraron pólizas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {table.getRowModel().rows.map((row) => (
                  <div key={row.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono font-semibold text-blue-600 text-sm">
                          {row.original.numero_poliza || "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Folio: {row.original.numero_folio || "-"}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          row.original.estado === "ACTIVA"
                            ? "bg-green-100 text-green-800"
                            : row.original.estado === "CANCELADA"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {row.original.estado || "PENDIENTE"}
                      </span>
                    </div>
                    <div className="text-sm font-semibold">
                      {row.original.asegurado || "-"}
                    </div>
                    <div className="text-xs text-gray-600">
                      {row.original.descripcion_unidad || "-"}
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="text-xs text-gray-500">
                        {row.original.asesor}
                      </div>
                      <div className="font-semibold text-sm">
                        {formatCurrency(row.original.prima_total)}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleDelete(
                          row.original.id_poliza,
                          row.original.numero_poliza
                        )
                      }
                      className="w-full bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition font-semibold mt-2"
                    >
                      🗑️ Eliminar Póliza
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vista desktop (tabla) */}
          <div className="hidden md:block overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-6 text-gray-600 text-lg">
                  Cargando pólizas...
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-2">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getIsSorted() && (
                              <span>
                                {header.column.getIsSorted() === "asc"
                                  ? "↑"
                                  : "↓"}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <p className="text-4xl mb-4">📭</p>
                        <p className="text-lg">No se encontraron pólizas</p>
                        <p className="text-sm mt-2">
                          Intenta ajustar los filtros
                        </p>
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition">
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-4 py-3 whitespace-nowrap"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginación */}
          {!loading && data.length > 0 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-700">
                  Mostrando{" "}
                  <span className="font-semibold">
                    {table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                      1}
                  </span>{" "}
                  a{" "}
                  <span className="font-semibold">
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                      data.length
                    )}
                  </span>{" "}
                  de <span className="font-semibold">{data.length}</span>{" "}
                  resultados
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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

      {/* Modal del Extractor */}
      <ExtractorModal
        isOpen={isExtractorOpen}
        onClose={() => setIsExtractorOpen(false)}
        onSuccess={() => loadPolizas()}
      />
    </div>
  );
}
