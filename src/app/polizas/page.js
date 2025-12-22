"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PolizasTable from "@/components/tables/PolizasTable";
import ExportPolizasButton from "./ExportButton";
import DownloadTemplateButton from "./DownloadTemplateButton";
import DownloadRecibosTemplateButton from "./DownloadRecibosTemplateButton";
import UploadPolizasButton from "./UploadPolizasButton";

export default function PolizasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [polizas, setPolizas] = useState([]);
  const [asesores, setAsesores] = useState([]);
  const [estatusOptions, setEstatusOptions] = useState([]);
  const [ciasOptions, setCiasOptions] = useState([]);
  const [quincenasOptions, setQuincenasOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado de los filtros
  const [filters, setFilters] = useState({
    no_poliza: searchParams.get("no_poliza") || "",
    asesor_id: searchParams.get("asesor_id") || "",
    cia: searchParams.get("cia") || "",
    estatus: searchParams.get("estatus") || "",
    quincena: searchParams.get("quincena") || "",
    fecha_desde: searchParams.get("fecha_desde") || "",
    fecha_hasta: searchParams.get("fecha_hasta") || "",
  });

  // Cargar datos iniciales
  useEffect(() => {
    fetchPolizas();
  }, [searchParams]);

  const fetchPolizas = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.no_poliza) params.set("no_poliza", filters.no_poliza);
      if (filters.asesor_id) params.set("asesor_id", filters.asesor_id);
      if (filters.cia) params.set("cia", filters.cia);
      if (filters.estatus) params.set("estatus", filters.estatus);
      if (filters.quincena) params.set("quincena", filters.quincena);
      if (filters.fecha_desde) params.set("fecha_desde", filters.fecha_desde);
      if (filters.fecha_hasta) params.set("fecha_hasta", filters.fecha_hasta);

      // Obtener todos los registros (la paginación se hace en el cliente)
      params.set("limit", "10000");

      const response = await fetch(`/api/polizas?${params.toString()}`);
      const data = await response.json();

      if (data.ok) {
        setPolizas(data.polizas || []);
        setAsesores(data.asesores || []);

        // Extraer opciones únicas de estatus, cias y quincenas
        const uniqueEstatus = [
          ...new Set(data.polizas.map((p) => p.estatus).filter(Boolean)),
        ];
        const uniqueCias = [
          ...new Set(data.polizas.map((p) => p.cia).filter(Boolean)),
        ];
        const uniqueQuincenas = [
          ...new Set(data.polizas.map((p) => p.quincena).filter(Boolean)),
        ];
        setEstatusOptions(uniqueEstatus.sort());
        setCiasOptions(uniqueCias.sort());
        setQuincenasOptions(uniqueQuincenas.sort());
      }
    } catch (error) {
      console.error("Error al cargar pólizas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();

    // Construir URL con los filtros
    const params = new URLSearchParams();
    if (filters.no_poliza) params.set("no_poliza", filters.no_poliza);
    if (filters.asesor_id) params.set("asesor_id", filters.asesor_id);
    if (filters.cia) params.set("cia", filters.cia);
    if (filters.estatus) params.set("estatus", filters.estatus);
    if (filters.quincena) params.set("quincena", filters.quincena);
    if (filters.fecha_desde) params.set("fecha_desde", filters.fecha_desde);
    if (filters.fecha_hasta) params.set("fecha_hasta", filters.fecha_hasta);

    router.push(`/polizas?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setFilters({
      no_poliza: "",
      asesor_id: "",
      cia: "",
      estatus: "",
      quincena: "",
      fecha_desde: "",
      fecha_hasta: "",
    });
    router.push("/polizas");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className=" mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Pólizas
              </h1>
              <p className="text-sm text-muted">
                Total de pólizas:{" "}
                <span className="font-semibold">{polizas.length}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <DownloadTemplateButton />
              <UploadPolizasButton onUploadSuccess={fetchPolizas} />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border p-4 sm:p-6 mb-6">
          <form onSubmit={handleFilterSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Número de Póliza */}
              <div>
                <label
                  htmlFor="no_poliza"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  No. Póliza
                </label>
                <input
                  type="text"
                  id="no_poliza"
                  name="no_poliza"
                  value={filters.no_poliza}
                  onChange={handleFilterChange}
                  placeholder="Buscar por póliza..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Asesor */}
              <div>
                <label
                  htmlFor="asesor_id"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Asesor
                </label>
                <select
                  id="asesor_id"
                  name="asesor_id"
                  value={filters.asesor_id}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {asesores.map((asesor) => (
                    <option key={asesor.id} value={asesor.id}>
                      {asesor.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Compañía */}
              <div>
                <label
                  htmlFor="cia"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Compañía
                </label>
                <select
                  id="cia"
                  name="cia"
                  value={filters.cia}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Todas</option>
                  {ciasOptions.map((cia) => (
                    <option key={cia} value={cia}>
                      {cia}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estatus */}
              <div>
                <label
                  htmlFor="estatus"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Estatus
                </label>
                <select
                  id="estatus"
                  name="estatus"
                  value={filters.estatus}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {estatusOptions.map((est) => (
                    <option key={est} value={est}>
                      {est}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quincena */}
              <div>
                <label
                  htmlFor="quincena"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Quincena
                </label>
                <select
                  id="quincena"
                  name="quincena"
                  value={filters.quincena}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Todas</option>
                  {quincenasOptions.map((quin) => (
                    <option key={quin} value={quin}>
                      {quin}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha Desde */}
              <div>
                <label
                  htmlFor="fecha_desde"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Fecha Desde
                </label>
                <input
                  type="date"
                  id="fecha_desde"
                  name="fecha_desde"
                  value={filters.fecha_desde}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Fecha Hasta */}
              <div>
                <label
                  htmlFor="fecha_hasta"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  id="fecha_hasta"
                  name="fecha_hasta"
                  value={filters.fecha_hasta}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-white rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-opacity font-medium"
              >
                Aplicar Filtros
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors font-medium"
              >
                Limpiar Filtros
              </button>
              <DownloadRecibosTemplateButton filters={filters} />
            </div>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
        )}

        {/* Tabla */}
        {!loading && <PolizasTable data={polizas} />}
      </div>

      {/* Botón de Exportar */}
      <ExportPolizasButton filters={filters} />
    </div>
  );
}
