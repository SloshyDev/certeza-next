"use client";
import { useState, useEffect, useCallback } from "react";
import { MagnifyingGlassIcon, DocumentTextIcon, ArrowLeftIcon, ArrowPathIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import AplicacionesDesgloseTable from "@/components/tables/AplicacionesDesgloseTable";

export default function AplicacionesDesglosePage() {
  const [poliza, setPoliza] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchDesglose = useCallback(async (searchPoliza = "") => {
    setLoading(true);
    setError(null);
    try {
      const url = searchPoliza.trim() 
        ? `/api/aplicaciones/desglose?poliza=${encodeURIComponent(searchPoliza.trim())}`
        : `/api/aplicaciones/desglose`;
        
      const res = await fetch(url);
      const result = await res.json();

      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.error || "Error al obtener los datos");
      }
    } catch (err) {
      console.error("Error fetching breakdown:", err);
      setError("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDesglose();
  }, [fetchDesglose]);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchDesglose(poliza);
  };

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-transparent py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Link href="/admin" className="hover:text-primary transition-colors flex items-center gap-1 text-xs font-medium">
                <ArrowLeftIcon className="w-3 h-3" /> Volver al Panel
              </Link>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl flex items-center gap-3">
              <DocumentTextIcon className="w-10 h-10 text-primary" />
              Desglose de Aplicaciones
            </h1>
            <p className="text-muted-foreground text-sm max-w-2xl">
              Visualiza el historial completo de cambios y estatus de las aplicaciones.
            </p>
          </div>
        </div>

        {/* Search Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-border p-6 shadow-sm shadow-primary/5">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                value={poliza}
                onChange={(e) => setPoliza(e.target.value)}
                placeholder="Filtrar por número de póliza (opcional)"
                className="block w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900/50 border-none rounded-2xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all gap-2"
            >
              {loading ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                "Buscar / Actualizar"
              )}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {data ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  {poliza.trim() ? (
                    <>Resultados para <span className="text-primary">"{poliza}"</span></>
                  ) : (
                    <>Aplicaciones Recientes</>
                  )}
                  <span className="text-xs font-normal text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {data.length} registros
                  </span>
                </h2>
              </div>
              <AplicacionesDesgloseTable data={data} />
            </div>
          ) : loading && (
            <div className="py-20 text-center space-y-4">
              <ArrowPathIcon className="w-12 h-12 text-primary animate-spin mx-auto opacity-20" />
              <p className="text-muted-foreground animate-pulse">Cargando aplicaciones...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
