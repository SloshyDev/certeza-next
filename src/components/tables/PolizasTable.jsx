"use client";
import { useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper();

export default function PolizasTable({ data = [] }) {
  const [mounted, setMounted] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => (
          <span className="text-sm font-medium">{info.getValue()}</span>
        ),
        size: 60,
      }),
      columnHelper.accessor("estatus", {
        header: "Estatus",
        cell: (info) => {
          const estatus = info.getValue();
          let badgeColor =
            "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

          if (estatus === "VIGENTE")
            badgeColor =
              "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
          else if (estatus === "CANCELADA")
            badgeColor =
              "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
          else if (estatus === "PENDIENTE")
            badgeColor =
              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";

          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${badgeColor}`}
            >
              {estatus || "Sin Estatus"}
            </span>
          );
        },
        size: 120,
      }),
      columnHelper.accessor("quincena", {
        header: "Quincena",
        cell: (info) => (
          <span className="text-sm">{info.getValue() || "-"}</span>
        ),
        size: 100,
      }),
      columnHelper.accessor("f_ingreso", {
        header: "F. Ingreso",
        cell: (info) => {
          const fecha = info.getValue();
          return (
            <span className="text-sm text-muted">
              {fecha ? new Date(fecha).toLocaleDateString("es-MX") : "-"}
            </span>
          );
        },
        size: 100,
      }),
      columnHelper.accessor("no_poliza", {
        header: "No. Póliza",
        cell: (info) => (
          <span className="text-sm font-semibold text-primary">
            {info.getValue() || "-"}
          </span>
        ),
        size: 150,
      }),
      columnHelper.accessor("folio", {
        header: "Folio",
        cell: (info) => (
          <span className="text-sm">{info.getValue() || "-"}</span>
        ),
        size: 120,
      }),
      columnHelper.accessor("asesor_nombre", {
        header: "Asesor",
        cell: (info) => (
          <span className="text-sm">{info.getValue() || "Sin Asesor"}</span>
        ),
        size: 180,
      }),
      columnHelper.accessor("cia", {
        header: "Compañía",
        cell: (info) => (
          <span className="text-sm">{info.getValue() || "-"}</span>
        ),
        size: 150,
      }),
      columnHelper.accessor("f_desde", {
        header: "Desde",
        cell: (info) => {
          const fecha = info.getValue();
          return (
            <span className="text-sm text-muted">
              {fecha ? new Date(fecha).toLocaleDateString("es-MX") : "-"}
            </span>
          );
        },
        size: 100,
      }),
      columnHelper.accessor("f_hasta", {
        header: "Hasta",
        cell: (info) => {
          const fecha = info.getValue();
          return (
            <span className="text-sm text-muted">
              {fecha ? new Date(fecha).toLocaleDateString("es-MX") : "-"}
            </span>
          );
        },
        size: 100,
      }),
      columnHelper.accessor("prima_total", {
        header: "Prima Total",
        cell: (info) => (
          <span className="text-sm font-medium">
            {info.getValue() ? `$${info.getValue()}` : "-"}
          </span>
        ),
        size: 120,
      }),
      columnHelper.accessor("forma_pago", {
        header: "Forma Pago",
        cell: (info) => (
          <span className="text-sm">{info.getValue() || "-"}</span>
        ),
        size: 120,
      }),
      columnHelper.accessor("f_vale_recibido", {
        header: "F. Vale Recibido",
        cell: (info) => {
          const fecha = info.getValue();
          return (
            <span className="text-sm text-muted">
              {fecha ? new Date(fecha).toLocaleDateString("es-MX") : "-"}
            </span>
          );
        },
        size: 120,
      }),
      columnHelper.accessor("created_at", {
        header: "Fecha Creación",
        cell: (info) => {
          const fecha = info.getValue();
          return (
            <span className="text-xs text-muted">
              {fecha ? new Date(fecha).toLocaleString("es-MX") : "-"}
            </span>
          );
        },
        size: 140,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: data || [],
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

  if (!mounted) {
    return (
      <div className="w-full p-8 text-center text-muted">Cargando tabla...</div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full p-8 text-center">
        <p className="text-muted text-base">
          No se encontraron pólizas con los filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Vista móvil: Cards */}
      <div className="block lg:hidden space-y-3">
        {table.getRowModel().rows.map((row) => {
          const poliza = row.original;
          return (
            <div
              key={row.id}
              className="bg-white dark:bg-gray-800 border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs text-muted mb-1">ID</p>
                  <p className="text-base font-semibold">{poliza.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted mb-1">Estatus</p>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      poliza.estatus === "VIGENTE"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : poliza.estatus === "CANCELADA"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                        : poliza.estatus === "PENDIENTE"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                        : "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {poliza.estatus || "Sin Estatus"}
                  </span>
                </div>
              </div>

              <div className="mb-2">
                <p className="text-xs text-muted">Quincena</p>
                <p className="text-sm font-medium">{poliza.quincena || "-"}</p>
              </div>

              <div className="mb-2">
                <p className="text-xs text-muted">No. Póliza</p>
                <p className="text-base font-semibold text-primary">
                  {poliza.no_poliza || "-"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted">F. Ingreso</p>
                  <p className="font-medium">
                    {poliza.f_ingreso
                      ? new Date(poliza.f_ingreso).toLocaleDateString("es-MX")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Folio</p>
                  <p className="font-medium">{poliza.folio || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Asesor</p>
                  <p className="font-medium truncate">
                    {poliza.asesor_nombre || "Sin Asesor"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Compañía</p>
                  <p className="font-medium truncate">{poliza.cia || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Prima Total</p>
                  <p className="font-medium">
                    {poliza.prima_total ? `$${poliza.prima_total}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Forma Pago</p>
                  <p className="font-medium">{poliza.forma_pago || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Desde</p>
                  <p className="text-muted">
                    {poliza.f_desde
                      ? new Date(poliza.f_desde).toLocaleDateString("es-MX")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Hasta</p>
                  <p className="text-muted">
                    {poliza.f_hasta
                      ? new Date(poliza.f_hasta).toLocaleDateString("es-MX")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">F. Vale Recibido</p>
                  <p className="text-muted">
                    {poliza.f_vale_recibido
                      ? new Date(poliza.f_vale_recibido).toLocaleDateString(
                          "es-MX"
                        )
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista desktop: Tabla */}
      <div className="hidden lg:block overflow-x-auto rounded-lg border border-border shadow-sm">
        <table className="min-w-full divide-y divide-border bg-white dark:bg-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    style={{ width: header.column.columnDef.size }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getIsSorted() && (
                        <span className="text-primary">
                          {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Controles de paginación */}
        <div className="flex items-center justify-between p-2 border-t border-border bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <select
              className="border border-border rounded px-2 py-1 bg-white/10 backdrop-blur-md text-foreground focus:bg-white/20 focus:outline-none"
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option
                  key={pageSize}
                  value={pageSize}
                  className="bg-background text-foreground"
                >
                  {pageSize}
                </option>
              ))}
            </select>
            <button
              className="px-2 py-1 border border-border rounded disabled:opacity-50 text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {"|}"}
              {"<"}
            </button>
            <button
              className="px-2 py-1 border border-border rounded disabled:opacity-50 text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {"<"}
            </button>
            <button
              className="px-2 py-1 border border-border rounded disabled:opacity-50 text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {">"}
            </button>
            <button
              className="px-2 py-1 border border-border rounded disabled:opacity-50 text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {">"}
              {"|"}
            </button>
          </div>
          <span className="flex items-center gap-1 text-foreground">
            <div>Página</div>
            <strong>
              {table.getState().pagination.pageIndex + 1} de{" "}
              {table.getPageCount()}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
