import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import {
  getRenovaciones,
  getRenovacionesMeses,
  getRenovacionesStats,
  getRenovacionesByMes,
} from "@/lib/renovaciones";
import { listAsesores } from "@/lib/asesor";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";

import ExportButton from "./ExportButton";
import RenovacionesCharts from "@/components/charts/RenovacionesCharts";

export default async function RenovacionesPage({ searchParams }) {
  const session = await auth();
  if (!session) {
    redirect("/auth/sign-in");
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = {
    poliza: params.poliza || "",
    asesor: params.asesor || "",
    mes: params.mes || "",
    estatus: params.estatus || "",
    page,
    limit: 20,
  };

  const [dataResult, meses, asesores, stats, byMes] = await Promise.all([
    getRenovaciones(filters),
    getRenovacionesMeses(),
    listAsesores(),
    getRenovacionesStats(),
    getRenovacionesByMes(),
  ]);

  const { data, total, pages } = dataResult;

  // Lista estática de estatus
  const estatusOptions = ["PENDIENTE", "COLOCADA", "REEXPEDIDA", "CANCELADA"];

  return (
    <div className="py-6 min-h-screen relative pb-24">
      <main className="container-responsive px-4 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Renovaciones</h1>
          <Link href="/" className="text-sm text-primary hover:underline">
            &larr; Volver al inicio
          </Link>
        </div>

        {/* Charts Section */}
        <RenovacionesCharts stats={stats} byMes={byMes} />

        {/* Filtros */}
        <form className="bg-surface p-4 rounded-lg border border-border mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <input type="hidden" name="page" value="1" />
          <div className="flex flex-col gap-1">
            <label htmlFor="poliza" className="text-xs font-medium opacity-70">
              Póliza
            </label>
            <input
              type="text"
              name="poliza"
              id="poliza"
              defaultValue={filters.poliza}
              placeholder="Buscar póliza..."
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="asesor" className="text-xs font-medium opacity-70">
              Asesor
            </label>
            <select
              name="asesor"
              id="asesor"
              defaultValue={filters.asesor}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Todos</option>
              {asesores.map((a) => (
                <option key={a.id} value={a.nombre}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="mes" className="text-xs font-medium opacity-70">
              Mes
            </label>
            <select
              name="mes"
              id="mes"
              defaultValue={filters.mes}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Todos</option>
              {meses.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="estatus" className="text-xs font-medium opacity-70">
              Estatus
            </label>
            <select
              name="estatus"
              id="estatus"
              defaultValue={filters.estatus}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Todos</option>
              {estatusOptions.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary h-9 w-full sm:w-auto">
            Filtrar
          </button>
        </form>

        {/* Tabla */}
        <div className="rounded-lg border border-border overflow-hidden bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Póliza</th>
                  <th className="px-4 py-3">Mes</th>
                  <th className="px-4 py-3">Asesor</th>
                  <th className="px-4 py-3">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center opacity-60"
                    >
                      No se encontraron resultados.
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono opacity-70">
                        {row.id}
                      </td>
                      <td className="px-4 py-3 font-medium">{row.poliza}</td>
                      <td className="px-4 py-3">{row.mes}</td>
                      <td className="px-4 py-3">{row.asesor_nombre}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.estatus} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-surface">
            <div className="text-xs opacity-60">
              Mostrando {(page - 1) * filters.limit + 1} a{" "}
              {Math.min(page * filters.limit, total)} de {total} registros
            </div>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`?${new URLSearchParams({
                    ...filters,
                    page: page - 1,
                  }).toString()}`}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  aria-label="Página anterior"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </Link>
              )}
              <span className="text-sm font-medium px-2">
                Página {page} de {pages || 1}
              </span>
              {page < pages && (
                <Link
                  href={`?${new URLSearchParams({
                    ...filters,
                    page: page + 1,
                  }).toString()}`}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  aria-label="Página siguiente"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Botón Flotante de Exportar */}
      <ExportButton data={data} />
    </div>
  );
}

function StatusBadge({ status }) {
  let colorClass = "bg-gray-100 text-gray-800";
  const s = String(status).toLowerCase();
  if (s.includes("pagad") || s.includes("complet"))
    colorClass =
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  else if (s.includes("pendiente"))
    colorClass =
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  else if (s.includes("cancel"))
    colorClass = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
    >
      {status}
    </span>
  );
}
