"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import UploadRecibosButton from "./UploadRecibosButton";
import RecibosTable from "@/components/tables/RecibosTable";
import DescargarEstadosCuentaButton from "@/components/DescargarEstadosCuentaButton";
import ExportComisionesPendientesButton from "./ExportComisionesPendientesButton";
import UploadComisionesButton from "./UploadComisionesButton";

export default function RecibosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [mounted, setMounted] = useState(false);
  const [recibosData, setRecibosData] = useState([]);
  const [allRecibosData, setAllRecibosData] = useState([]);
  const [loadingTable, setLoadingTable] = useState(true);
  const [asesores, setAsesores] = useState([]);
  const [ciasOptions, setCiasOptions] = useState([]);
  const [estatusOptions, setEstatusOptions] = useState([]);
  const [quincenasOptions, setQuincenasOptions] = useState([]);

  // Estado de los filtros
  const [filters, setFilters] = useState({
    no_poliza: searchParams.get("no_poliza") || "",
    asesor_id: searchParams.get("asesor_id") || "",
    cia: searchParams.get("cia") || "",
    estatus_pago: searchParams.get("estatus_pago") || "",
    folio: searchParams.get("folio") || "",
    quincena: searchParams.get("quincena") || "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/sign-in");
      return;
    }
    if (session && !session.user?.roles?.includes("admin")) {
      alert("No tienes permisos para acceder a esta página. Solo usuarios con rol Admin pueden ver recibos.");
      router.push("/");
      return;
    }
    setMounted(true);
    loadAsesores();
    loadRecibos();
  }, [status, session, router]);

  useEffect(() => {
    if (allRecibosData.length > 0) {
      applyFilters();
    }
  }, [filters, allRecibosData]);

  async function loadAsesores() {
    try {
      const res = await fetch("/api/asesores");
      if (res.ok) {
        const data = await res.json();
        setAsesores(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error loading asesores:", error);
    }
  }

  async function loadRecibos() {
    setLoadingTable(true);
    try {
      const res = await fetch("/api/recibos/list?limit=1000");
      if (res.ok) {
        const json = await res.json();
        const data = json.data || [];
        setAllRecibosData(data);

        // Extraer opciones únicas
        const uniqueCias = [...new Set(data.map((r) => r.cia).filter(Boolean))];
        const uniqueEstatus = [
          ...new Set(
            data
              .flatMap((r) => (r.recibos || []).map((rec) => rec.estatus_pago))
              .filter(Boolean)
          ),
        ];
        const uniqueQuincenas = [
          ...new Set(data.map((r) => r.quincena).filter(Boolean)),
        ];
        setCiasOptions(uniqueCias.sort());
        setEstatusOptions(uniqueEstatus.sort());
        setQuincenasOptions(uniqueQuincenas.sort());
      }
    } catch (error) {
      console.error("Error loading recibos:", error);
    } finally {
      setLoadingTable(false);
    }
  }

  function applyFilters() {
    let filtered = [...allRecibosData];

    if (filters.no_poliza) {
      filtered = filtered.filter((r) =>
        r.no_poliza?.toLowerCase().includes(filters.no_poliza.toLowerCase())
      );
    }

    if (filters.asesor_id) {
      filtered = filtered.filter(
        (r) => String(r.asesor_id) === String(filters.asesor_id)
      );
    }

    if (filters.cia) {
      filtered = filtered.filter((r) => r.cia === filters.cia);
    }

    if (filters.estatus_pago) {
      filtered = filtered.filter((r) => {
        const recibos = r.recibos || [];
        return recibos.some((rec) => rec.estatus_pago === filters.estatus_pago);
      });
    }

    if (filters.folio) {
      filtered = filtered.filter((r) =>
        r.folio?.toLowerCase().includes(filters.folio.toLowerCase())
      );
    }

    if (filters.quincena) {
      filtered = filtered.filter((r) => r.quincena === filters.quincena);
    }

    setRecibosData(filtered);
  }

  function handleUploadSuccess() {
    loadRecibos();
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filters.no_poliza) params.set("no_poliza", filters.no_poliza);
    if (filters.asesor_id) params.set("asesor_id", filters.asesor_id);
    if (filters.cia) params.set("cia", filters.cia);
    if (filters.estatus_pago) params.set("estatus_pago", filters.estatus_pago);
    if (filters.folio) params.set("folio", filters.folio);
    if (filters.quincena) params.set("quincena", filters.quincena);
    router.push(`/recibos?${params.toString()}`);
  };

  const handleClearFilters = () => {
    setFilters({
      no_poliza: "",
      asesor_id: "",
      cia: "",
      estatus_pago: "",
      folio: "",
      quincena: "",
    });
    router.push("/recibos");
  };

  if (!mounted) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Recibos
              </h1>
              <p className="text-sm text-muted">
                Total de pólizas con recibos:{" "}
                <span className="font-semibold">{recibosData.length}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <DescargarEstadosCuentaButton />
              <ExportComisionesPendientesButton />
              <UploadComisionesButton onSuccess={handleUploadSuccess} />
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

              {/* Estatus de Pago */}
              <div>
                <label
                  htmlFor="estatus_pago"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Estatus de Pago
                </label>
                <select
                  id="estatus_pago"
                  name="estatus_pago"
                  value={filters.estatus_pago}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Todos</option>
                  {estatusOptions.map((estatus) => (
                    <option key={estatus} value={estatus}>
                      {estatus}
                    </option>
                  ))}
                </select>
              </div>

              {/* Folio */}
              <div>
                <label
                  htmlFor="folio"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Folio
                </label>
                <input
                  type="text"
                  id="folio"
                  name="folio"
                  value={filters.folio}
                  onChange={handleFilterChange}
                  placeholder="Buscar por folio..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
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
                  {quincenasOptions.map((quincena) => (
                    <option key={quincena} value={quincena}>
                      {quincena}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              >
                Aplicar Filtros
              </button>
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </form>
        </div>

        {/* Tabla de recibos */}
        {loadingTable ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted">Cargando recibos...</p>
          </div>
        ) : (
          <RecibosTable data={recibosData} />
        )}

        <UploadRecibosButton onSuccess={handleUploadSuccess} />
      </div>
    </div>
  );
}
