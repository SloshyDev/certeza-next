"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper();

export default function EstadoCuentaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const [corte, setCorte] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  useEffect(() => {
    if (params.id) {
      fetchDetalle();
    }
  }, [params.id]);

  const fetchDetalle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/estados-cuenta?corte_id=${params.id}`);
      const data = await response.json();

      if (data.ok) {
        setCorte(data.corte);
        setDetalles(data.detalles || []);
      }
    } catch (error) {
      console.error("Error al cargar detalle:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("asesor_nombre", {
        header: "Asesor",
        cell: (info) => (
          <div className="font-medium text-primary">{info.getValue()}</div>
        ),
      }),
      columnHelper.accessor("no_poliza", {
        header: "Póliza",
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
      }),
      columnHelper.accessor("cia", {
        header: "Compañía",
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor("forma_pago", {
        header: "F. Pago",
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor("prima_neta", {
        header: "Prima Neta",
        cell: (info) => (
          <span className="text-sm">
            ${parseFloat(info.getValue() || 0).toFixed(2)}
          </span>
        ),
      }),
      columnHelper.accessor("porcentaje_comision", {
        header: "% Com.",
        cell: (info) => (
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {parseFloat(info.getValue() || 0).toFixed(1)}%
          </span>
        ),
      }),
      columnHelper.accessor("no_recibo", {
        header: "Rec #",
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor("comision", {
        header: "Comisión",
        cell: (info) => (
          <span className="font-semibold text-green-600 dark:text-green-400">
            ${parseFloat(info.getValue() || 0).toFixed(2)}
          </span>
        ),
      }),
      columnHelper.accessor("f_pago_comision", {
        header: "F. Pago",
        cell: (info) => {
          const fecha = info.getValue();
          return fecha ? (
            <span className="text-sm">
              {new Date(fecha).toLocaleDateString("es-MX")}
            </span>
          ) : (
            "-"
          );
        },
      }),
      columnHelper.accessor("estatus_comision", {
        header: "Estatus",
        cell: (info) => {
          const estatus = info.getValue();
          const colorClass =
            estatus === "PAGADO"
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
              : estatus === "RETENIDO"
              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";

          return (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
            >
              {estatus}
            </span>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: detalles,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!corte) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted">Corte no encontrado</p>
          <button
            onClick={() => router.push("/estados-cuenta")}
            className="mt-4 text-primary hover:text-primary/80"
          >
            Volver a Estados de Cuenta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/estados-cuenta")}
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Volver
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                {corte.nombre_quincena}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-muted">
                <span>
                  Total Comisiones:{" "}
                  <strong className="text-green-600 dark:text-green-400">
                    ${parseFloat(corte.total_comisiones || 0).toFixed(2)}
                  </strong>
                </span>
                <span>
                  Asesores: <strong>{corte.num_asesores}</strong>
                </span>
                <span>
                  Registros: <strong>{detalles.length}</strong>
                </span>
                <span>
                  Fecha:{" "}
                  {new Date(corte.fecha_corte).toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-gray-50 dark:bg-gray-700">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-border">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 whitespace-nowrap text-sm"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted">
              Mostrando{" "}
              {table.getState().pagination.pageIndex * pagination.pageSize + 1}{" "}
              a{" "}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  pagination.pageSize,
                detalles.length
              )}{" "}
              de {detalles.length} registros
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1 border border-border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Anterior
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1 border border-border rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
