"use client";
import { useEffect, useMemo, useState, Fragment } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper();

const TIPO_OPTIONS = [
  "EMISION",
  "COTIZACION",
  "CANCELACION",
  "ENDOSO",
  "REEXPEDICION",
  "OTRO",
];

const COLUMN_LABELS = {
  emisor: "Emisor",
  id: "ID",
  hist: "Historial",
  acciones: "Acciones",
  llegada: "Llegada",
  asesor: "Asesor",
  "tipo-edit": "Tipo",
  asunto: "Asunto",
  tiempo_respuesta_min: "Resp. (min)",
  estatus: "Estatus",
  no_poliza: "Póliza",
};

export default function BitacoraTable({
  data,
  showEmisor = true,
  canDelete = false,
  canEdit = false,
}) {
  const [mounted, setMounted] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [grouping, setGrouping] = useState(showEmisor ? ["emisor"] : []);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [rows, setRows] = useState(data || []);
  const [expanded, setExpanded] = useState({});
  const [historyMap, setHistoryMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setRows(Array.isArray(data) ? data : []);
  }, [data]);

  async function handleTipoChange(id, nextTipo) {
    if (!canEdit) return;
    try {
      const res = await fetch("/api/bitacora/tipo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, tipo: nextTipo }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error("update-failed");
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, tipo: nextTipo } : r))
      );
    } catch (e) {
      // no comments
    }
  }

  async function toggleHistory(id) {
    const isOpen = !!expanded[id];
    const next = { ...expanded, [id]: !isOpen };
    setExpanded(next);
    if (!isOpen && !historyMap[id] && !loadingMap[id]) {
      setLoadingMap((prev) => ({ ...prev, [id]: true }));
      try {
        const url = new URL(window.location.origin + "/api/bitacora/history");
        url.searchParams.set("bitacoraId", String(id));
        const res = await fetch(url.toString());
        const json = await res.json();
        setHistoryMap((prev) => ({ ...prev, [id]: json }));
      } catch (e) {
      } finally {
        setLoadingMap((prev) => ({ ...prev, [id]: false }));
      }
    }
  }

  async function handleDelete(id) {
    if (!canDelete) return;
    const ok = window.confirm(`Eliminar registro #${id}?`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/bitacora/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error("delete-failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      // no comments
    }
  }

  const columns = useMemo(
    () => [
      ...(showEmisor
        ? [
            columnHelper.accessor("emisor", {
              header: () => "Emisor",
              cell: (info) => info.getValue() || "",
              enableGrouping: true,
            }),
          ]
        : []),
      columnHelper.accessor("id", {
        header: () => "ID",
        cell: (info) => info.getValue(),
        size: 80,
      }),
      columnHelper.display({
        id: "hist",
        header: () => "Historial",
        cell: ({ row }) => {
          const id = row.original?.id;
          const open = !!expanded[id];
          const loading = !!loadingMap[id];
          return (
            <button
              className="px-2 py-1 border rounded"
              onClick={() => toggleHistory(id)}
            >
              {loading ? "Cargando..." : open ? "Ocultar" : "Ver"}
            </button>
          );
        },
        size: 120,
      }),
      ...(canDelete
        ? [
            columnHelper.display({
              id: "acciones",
              header: () => "Acciones",
              cell: ({ row }) => {
                const id = row.original?.id;
                return (
                  <button
                    className="px-2 py-1 border rounded text-red-600"
                    onClick={() => handleDelete(id)}
                  >
                    Eliminar
                  </button>
                );
              },
              size: 120,
            }),
          ]
        : []),
      columnHelper.display({
        id: "llegada",
        header: () => "Llegada",
        cell: ({ row }) => {
          const d = row.original?.dia_llegada || "";
          const h = row.original?.hora_llegada || "";
          return `${d} ${h}`.trim();
        },
        size: 160,
      }),
      columnHelper.accessor("asesor", {
        header: () => "Asesor",
        cell: (info) => info.getValue() || "",
      }),
      columnHelper.display({
        id: "tipo-edit",
        header: () => "Tipo",
        cell: ({ row }) => {
          const id = row.original?.id;
          const value = row.original?.tipo || "";
          if (!canEdit) return value;
          return (
            <select
              className="border border-border rounded px-2 py-1 bg-white/10 backdrop-blur-md text-foreground focus:bg-white/20 focus:outline-none"
              value={value}
              onChange={(e) => handleTipoChange(id, e.target.value)}
            >
              {TIPO_OPTIONS.map((opt) => (
                <option
                  key={opt}
                  value={opt}
                  className="bg-background text-foreground"
                >
                  {opt}
                </option>
              ))}
            </select>
          );
        },
      }),
      columnHelper.accessor("asunto", {
        header: () => "Asunto",
        cell: (info) => info.getValue() || "",
      }),
      columnHelper.accessor("tiempo_respuesta_min", {
        header: () => "Resp. (min)",
        cell: (info) => {
          const v = info.getValue();
          return v == null ? "" : v;
        },
        size: 120,
      }),
      columnHelper.accessor("estatus", {
        header: () => "Estatus",
        cell: (info) => info.getValue() || "",
        size: 140,
      }),
      columnHelper.accessor("no_poliza", {
        header: () => "Póliza",
        cell: (info) => info.getValue() || "",
        size: 140,
      }),
    ],
    []
  );

  const table = useReactTable({
    data: rows || [],
    columns,
    state: { sorting, grouping, pagination },
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false,
  });

  if (!mounted) return null;
  return (
    <div className="overflow-visible rounded border-none md:border md:border-border">
      <table className="min-w-full text-sm block md:table">
        <thead className="bg-muted/10 hidden md:table-header-group">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left font-medium text-muted-foreground"
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={
                        header.column.getCanSort()
                          ? "cursor-pointer select-none"
                          : ""
                      }
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted()] ||
                        null}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="block md:table-row-group">
          {table.getRowModel().rows.map((row) => {
            const isExpanded = expanded[row.original?.id];
            return (
              <Fragment key={row.id}>
                <tr
                  className={`block md:table-row border border-border md:border-0 md:border-t mb-4 md:mb-0 ${
                    isExpanded ? "rounded-t-lg border-b-0" : "rounded-lg"
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-3 py-2 text-foreground align-top block md:table-cell border-b border-border last:border-0 md:border-0"
                    >
                      <div className="flex justify-between items-center md:block w-full">
                        <span className="md:hidden font-medium text-muted-foreground mr-2">
                          {COLUMN_LABELS[cell.column.id] || cell.column.id}
                        </span>
                        <div className="text-right md:text-left flex-1 md:flex-none">
                          {cell.getIsGrouped() ? (
                            <button
                              className="mr-2 text-accent"
                              onClick={row.getToggleExpandedHandler()}
                            >
                              {row.getIsExpanded() ? "−" : "+"}
                            </button>
                          ) : null}
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
                {isExpanded ? (
                  <tr className="block md:table-row border border-border md:border-0 rounded-b-lg mb-4 md:mb-0 border-t-0">
                    <td
                      colSpan={table.getAllColumns().length}
                      className="px-3 py-2 bg-muted/5 block md:table-cell rounded-b-lg md:rounded-none"
                    >
                      {loadingMap[row.original?.id] ? (
                        <div className="text-sm">Cargando...</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="font-medium mb-2">
                              Historial de póliza
                            </div>
                            <ul className="space-y-2">
                              {(
                                historyMap[row.original?.id]?.polizas_history ||
                                []
                              ).map((h) => (
                                <li
                                  key={h.id}
                                  className="border border-border rounded p-2"
                                >
                                  <div className="text-xs opacity-70">
                                    {h.fecha_modificacion?.toString() || ""}
                                  </div>
                                  <div className="text-sm">
                                    {h.operacion} {h.campo_modificado}
                                  </div>
                                  <div className="text-sm">
                                    {h.valor_anterior} → {h.valor_nuevo}
                                  </div>
                                  <div className="text-xs">
                                    {h.usuario} · {h.no_poliza}
                                  </div>
                                </li>
                              ))}
                              {(
                                historyMap[row.original?.id]?.polizas_history ||
                                []
                              ).length === 0 ? (
                                <div className="text-sm opacity-70">
                                  Sin cambios de póliza
                                </div>
                              ) : null}
                            </ul>
                          </div>
                          <div>
                            <div className="font-medium mb-2">
                              Historial de bitácora
                            </div>
                            <ul className="space-y-2">
                              {(
                                historyMap[row.original?.id]
                                  ?.bitacora_historial || []
                              ).map((h, idx) => (
                                <li
                                  key={idx}
                                  className="border border-border rounded p-2"
                                >
                                  <div className="text-xs opacity-70">
                                    {h.fecha_actualizacion?.toString() || ""}
                                  </div>
                                  <div className="text-sm">
                                    {h.estatus_anterior} → {h.estatus_nuevo}
                                  </div>
                                  <div className="text-xs">
                                    {h.actualizado_por}
                                  </div>
                                </li>
                              ))}
                              {(
                                historyMap[row.original?.id]
                                  ?.bitacora_historial || []
                              ).length === 0 ? (
                                <div className="text-sm opacity-70">
                                  Sin cambios en bitácora
                                </div>
                              ) : null}
                            </ul>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center justify-between p-2 border-t border-border">
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
            className="px-2 py-1 border border-border rounded disabled:opacity-50 text-foreground"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {"|"}
            {"<"}
          </button>
          <button
            className="px-2 py-1 border border-border rounded disabled:opacity-50 text-foreground"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {"<"}
          </button>
          <button
            className="px-2 py-1 border border-border rounded disabled:opacity-50 text-foreground"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {">"}
          </button>
          <button
            className="px-2 py-1 border border-border rounded disabled:opacity-50 text-foreground"
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
  );
}
