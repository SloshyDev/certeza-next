import React, { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";
import { formatCurrency, formatDate } from "../utils";

export default function PolizasTable({ data, loading, onDelete }) {
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
              onDelete(
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
    [onDelete]
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
                    onDelete(
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
            <p className="mt-6 text-gray-600 text-lg">Cargando pólizas...</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                    <p className="text-xl mb-2">📭</p>
                    <p>No se encontraron pólizas</p>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 whitespace-nowrap text-gray-900"
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
      {/* Paginación simple si es necesaria, aunque no estaba en el código original explícitamente más allá de useReactTable options */}
       {/* Agregar controles de paginación si se desea, pero por ahora mantengo la paridad con el original que usaba pageSize 10 pero no vi controles de paginación explícitos en el snippet truncado. Asumiré que no tenía o Tanstack table maneja scroll/pagination internamente si se configura, pero el código original tenía pagination: { pageSize: 10 } en initialState. Voy a agregar controles básicos de paginación al final si la tabla tiene más de 1 página. */}
       {!loading && data.length > 0 && (
        <div className="flex items-center justify-between p-4 border-t">
            <div className="flex gap-2">
            <button
                className="border rounded p-1"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
            >
                {'<<'}
            </button>
            <button
                className="border rounded p-1"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                {'<'}
            </button>
            <button
                className="border rounded p-1"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                {'>'}
            </button>
            <button
                className="border rounded p-1"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
            >
                {'>>'}
            </button>
            </div>
            <span className="flex items-center gap-1">
                <div>Página</div>
                <strong>
                    {table.getState().pagination.pageIndex + 1} de{' '}
                    {table.getPageCount()}
                </strong>
            </span>
        </div>
       )}
    </div>
  );
}
