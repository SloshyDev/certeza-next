"use client";
import { useEffect, useMemo, useState, Fragment } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, CalendarIcon, UserIcon, HashtagIcon, ClockIcon } from "@heroicons/react/24/outline";
import AplicacionHistoryTimeline from "@/components/aplicaciones/AplicacionHistoryTimeline";

const columnHelper = createColumnHelper();

export default function AplicacionesDesgloseTable({ data = [] }) {
  const [mounted, setMounted] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleRow = (rowId) => {
    setExpandedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const columns = useMemo(
    () => [
      {
        id: "expander",
        header: () => null,
        cell: ({ row }) => (
          <button
            onClick={() => toggleRow(row.id)}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {expandedRows[row.id] ? (
              <ChevronDownIcon className="w-4 h-4 text-primary" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        ),
        size: 40,
      },
      columnHelper.accessor("id", {
        header: "ID",
        cell: (info) => (
          <span className="text-xs font-mono text-muted-foreground">#{info.getValue()}</span>
        ),
        size: 80,
      }),
      columnHelper.accessor("poliza", {
        header: "Póliza",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <HashtagIcon className="w-3.5 h-3.5 text-primary/60" />
            <span className="font-bold text-primary">{info.getValue()}</span>
          </div>
        ),
        size: 150,
      }),
      columnHelper.accessor("estatus", {
        header: "Estatus Actual",
        cell: (info) => {
          const estatus = info.getValue();
          let badgeColor = "bg-gray-100 text-gray-700";
          if (estatus === "APLICADO") badgeColor = "bg-green-100 text-green-700 dark:bg-green-900/30";
          if (estatus === "PENDIENTE") badgeColor = "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30";
          if (estatus === "PENDIENTE COMPAÑIA") badgeColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30";

          return (
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${badgeColor}`}>
              {estatus}
            </span>
          );
        },
        size: 160,
      }),
      columnHelper.accessor("asesor_nombre", {
        header: "Asesor",
        cell: (info) => (
          <div className="flex items-center gap-2">
            <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm truncate max-w-[150px]">{info.getValue() || "N/A"}</span>
          </div>
        ),
        size: 180,
      }),
      columnHelper.accessor("fecha_actualizado", {
        header: "Última Act.",
        cell: (info) => (
          <div className="flex flex-col text-[11px] leading-tight">
            <span className="font-medium">{new Date(info.getValue()).toLocaleDateString('es-MX')}</span>
            <span className="text-muted-foreground">{new Date(info.getValue()).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ),
        size: 120,
      }),
    ],
    [expandedRows]
  );

  const table = useReactTable({
    data,
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
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Cargando desglose...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-50 dark:bg-gray-900/30 rounded-2xl border-2 border-dashed border-border">
        <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-lg font-medium text-foreground/70">No se encontraron aplicaciones</p>
        <p className="text-sm text-muted-foreground">Ingresa un número de póliza para ver su desglose detallado.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="hidden lg:block overflow-hidden rounded-2xl border border-border shadow-sm bg-white dark:bg-gray-800">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-gray-50/50 dark:bg-gray-900/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer select-none hover:text-foreground transition-colors"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.map((row) => (
              <Fragment key={row.id}>
                <tr className={`hover:bg-primary/[0.02] transition-colors ${expandedRows[row.id] ? 'bg-primary/[0.03]' : ''}`}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
                {expandedRows[row.id] && (
                  <tr key={`${row.id}-expanded`}>
                    <td colSpan={columns.length} className="px-12 py-8 bg-gray-50/50 dark:bg-gray-900/30">
                      <div className="max-w-4xl">
                        <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
                          <ClockIcon className="w-5 h-5 text-primary" />
                          <h4 className="text-sm font-bold text-foreground">Historial de Cambios</h4>
                        </div>
                        <AplicacionHistoryTimeline history={row.original.historial} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view would go here if needed, keeping it simple for now */}
    </div>
  );
}
