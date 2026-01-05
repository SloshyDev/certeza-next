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
import PaymentReminderModal from "./PaymentReminderModal";

const columnHelper = createColumnHelper();

export default function RecibosTable({ data = [] }) {
  const [mounted, setMounted] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    poliza: null,
  });
  const [showModal, setShowModal] = useState(false);
  const [showComisionModal, setShowComisionModal] = useState(false);
  const [showComisionSelector, setShowComisionSelector] = useState(false);
  const [comisionModalType, setComisionModalType] = useState(null); // 'pagar' o 'ajuste'
  const [selectedPoliza, setSelectedPoliza] = useState(null);
  const [selectedRecibo, setSelectedRecibo] = useState(null);
  const [selectedRecibos, setSelectedRecibos] = useState([]);
  const [bulkAction, setBulkAction] = useState({
    estatus_pago: "",
    estatus_comision: "",
    f_pago: "",
    f_pago_comision: "",
    comision_descontar: "",
  });
  const [ajusteData, setAjusteData] = useState({
    monto_ajuste: "",
    tipo_ajuste: "CANCELACION",
    motivo: "",
  });
  const [pagoComisionData, setPagoComisionData] = useState({
    f_pago_comision: "",
    estatus_comision: "PAGADO",
  });
  const [loading, setLoading] = useState(false);

  // Reminder Modal State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderData, setReminderData] = useState({
    policyData: null,
    daysData: 0,
    type: 'overdue'
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ visible: false, x: 0, y: 0, poliza: null });
      setShowComisionModal(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Función para calcular días de vencimiento
  const calculateDiasVencimiento = (row) => {
    // Buscar siguiente recibo no pagado
    const recibos = row.recibos || [];
    const sortedRecibos = [...recibos].sort((a, b) => (a.no_recibo || 0) - (b.no_recibo || 0));
    const nextUnpaid = sortedRecibos.find(r => r.estatus_pago !== "PAGADO" && r.estatus_pago !== "CANCELADO");

    // Si hay recibo pendiente, usar su f_hasta. Si no, usar f_hasta de la póliza (fin vigencia)
    const targetDateStr = nextUnpaid ? nextUnpaid.f_hasta : row.f_hasta;

    if (!targetDateStr) return null;

    const hoy = new Date();

    const targetDate = new Date(targetDateStr);
    const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const current = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const diffTime = target - current;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Función para obtener el color del círculo de pago
  const getPagoColor = (estatus_pago) => {
    if (estatus_pago === "PAGADO") return "bg-green-500";
    if (estatus_pago === "CANCELADO") return "bg-red-500";
    return "bg-orange-500"; // PENDIENTE
  };

  // Función para obtener el color del círculo de comisión
  const getComisionColor = (estatus_comision) => {
    if (estatus_comision === "PAGADO") return "bg-blue-500";
    if (estatus_comision === "RETENIDO") return "bg-yellow-500";
    if (estatus_comision === "CANCELADO") return "bg-red-500";
    return "bg-gray-400"; // PENDIENTE
  };

  const handleContextMenu = (e, poliza) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      poliza,
    });
  };

  const openModal = () => {
    if (contextMenu.poliza) {
      setSelectedPoliza(contextMenu.poliza);
      const recibos = contextMenu.poliza.recibos || [];
      setSelectedRecibos(recibos.map((r) => r.id));
      setShowModal(true);
      setContextMenu({ visible: false, x: 0, y: 0, poliza: null });
    }
  };

  const handleReciboToggle = (reciboId) => {
    setSelectedRecibos((prev) =>
      prev.includes(reciboId)
        ? prev.filter((id) => id !== reciboId)
        : [...prev, reciboId]
    );
  };

  const handleSelectAll = () => {
    if (!selectedPoliza) return;
    const allIds = (selectedPoliza.recibos || []).map((r) => r.id);
    setSelectedRecibos(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedRecibos([]);
  };

  const handleBulkUpdate = async () => {
    if (selectedRecibos.length === 0) {
      alert("Selecciona al menos un recibo");
      return;
    }

    if (!bulkAction.estatus_pago && !bulkAction.estatus_comision) {
      alert("Selecciona al menos una acción");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        recibos_ids: selectedRecibos,
      };

      if (bulkAction.estatus_pago) {
        payload.estatus_pago = bulkAction.estatus_pago;
      }

      if (bulkAction.estatus_comision) {
        payload.estatus_comision = bulkAction.estatus_comision;
      }

      if (bulkAction.f_pago) {
        payload.f_pago = bulkAction.f_pago;
      }

      if (bulkAction.f_pago_comision) {
        payload.f_pago_comision = bulkAction.f_pago_comision;
      }

      // Si el estatus de comisión es CANCELADO y hay monto a descontar
      if (
        bulkAction.estatus_comision === "CANCELADO" &&
        bulkAction.comision_descontar
      ) {
        payload.generar_descuento = true;
        payload.comision_descontar = parseFloat(bulkAction.comision_descontar);
        payload.poliza_id = selectedPoliza.poliza_id;
      }

      const res = await fetch("/api/recibos/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        alert(result.message);
        setShowModal(false);
        setBulkAction({
          estatus_pago: "",
          estatus_comision: "",
          f_pago: "",
          f_pago_comision: "",
          comision_descontar: "",
        });
        window.location.reload(); // Recargar para ver cambios
      } else {
        alert(result.error || "Error al actualizar");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al actualizar recibos");
    } finally {
      setLoading(false);
    }
  };

  const handleComisionClick = (e, poliza, recibo) => {
    e.preventDefault();
    e.stopPropagation();

    setSelectedPoliza(poliza);
    setSelectedRecibo(recibo);
    setShowComisionSelector(true);
  };

  const handleSeleccionPagarComision = () => {
    setPagoComisionData({
      f_pago_comision: new Date().toISOString().split("T")[0],
      estatus_comision: "PAGADO",
    });
    setShowComisionSelector(false);
    setComisionModalType("pagar");
  };

  const handleSeleccionGenerarAjuste = () => {
    setAjusteData({
      monto_ajuste: "",
      tipo_ajuste: "CANCELACION",
      motivo: "",
    });
    setShowComisionSelector(false);
    setComisionModalType("ajuste");
  };

  const handlePagarComision = async () => {
    if (!selectedRecibo || !pagoComisionData.f_pago_comision) {
      alert("Por favor ingresa la fecha de pago");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/recibos/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recibos_ids: [selectedRecibo.id],
          estatus_comision: pagoComisionData.estatus_comision,
          f_pago_comision: pagoComisionData.f_pago_comision,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert(result.message || "Comisión actualizada correctamente");
        setComisionModalType(null);
        window.location.reload();
      } else {
        alert(result.error || "Error al actualizar comisión");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al pagar comisión");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarAjuste = async () => {
    if (!selectedPoliza || !selectedRecibo || !ajusteData.monto_ajuste) {
      alert("Por favor ingresa el monto del ajuste");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/recibos/generar-ajuste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poliza_id: selectedPoliza.poliza_id,
          no_recibo: selectedRecibo.no_recibo,
          monto_ajuste: parseFloat(ajusteData.monto_ajuste),
          tipo_ajuste: ajusteData.tipo_ajuste,
          motivo: ajusteData.motivo || null,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        alert(result.message || "Ajuste generado correctamente");
        setComisionModalType(null);
        window.location.reload();
      } else {
        alert(result.error || "Error al generar ajuste");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al generar recibo de ajuste");
    } finally {
      setLoading(false);
    }
  };

  const handleDaysClick = (e, row, days) => {
    e.stopPropagation();
    if (days === null) return;
    setReminderData({
      policyData: row,
      daysData: days,
      type: days < 0 ? 'overdue' : 'remaining'
    });
    setShowReminderModal(true);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("no_poliza", {
        header: "Póliza",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div
              onContextMenu={(e) => handleContextMenu(e, row)}
              className="cursor-context-menu"
            >
              <div className="font-bold text-primary">{row.no_poliza}</div>
              <div className="text-xs text-muted">{row.asesor_nombre}</div>
              <div className="text-xs text-green-600 dark:text-green-400">
                {row.poliza_estatus}
              </div>
            </div>
          );
        },
        size: 150,
      }),
      columnHelper.accessor("prima_total", {
        header: "Primas",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="text-sm">
              <div className="font-medium">
                T: ${parseFloat(row.prima_total || 0).toFixed(2)}
              </div>
              <div className="text-muted">
                N: ${parseFloat(row.prima_neta || 0).toFixed(2)}
              </div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {parseFloat(row.commission_percentage || 0).toFixed(1)}%
              </div>
            </div>
          );
        },
        size: 120,
      }),
      columnHelper.accessor("folio", {
        header: "Folio",
        cell: (info) => (
          <span className="text-sm">{info.getValue() || "-"}</span>
        ),
        size: 100,
      }),
      columnHelper.accessor("f_hasta", {
        header: "Días Vencimiento",
        cell: (info) => {
          const dias = calculateDiasVencimiento(info.row.original);
          if (dias === null) return <span className="text-sm text-muted">-</span>;
          const isVencido = dias < 0;
          return (
            <span
              onClick={(e) => handleDaysClick(e, info.row.original, dias)}
              className={`text-sm font-medium cursor-pointer hover:underline ${isVencido
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
                }`}
            >
              {dias} días
            </span>
          );
        },
        size: 120,
      }),
      columnHelper.accessor("f_desde", {
        header: "Vigencia Pendiente",
        cell: (info) => {
          const row = info.row.original;
          if (!row.f_desde || !row.f_hasta) return "-";
          return (
            <span className="text-sm">
              {new Date(row.f_desde).toLocaleDateString("es-MX")} -{" "}
              {new Date(row.f_hasta).toLocaleDateString("es-MX")}
            </span>
          );
        },
        size: 180,
      }),
      columnHelper.accessor("cia", {
        header: "Cía",
        cell: (info) => (
          <span className="text-sm font-medium">{info.getValue()}</span>
        ),
        size: 80,
      }),
      columnHelper.accessor("forma_pago", {
        header: "F. Pago",
        cell: (info) => (
          <span className="text-sm">{info.getValue() || "-"}</span>
        ),
        size: 80,
      }),
      // Columnas para los 13 recibos
      ...Array.from({ length: 13 }, (_, i) => {
        const reciboNum = i + 1;
        return columnHelper.display({
          id: `recibo_${reciboNum}`,
          header: () => <span className="text-xs">{reciboNum}</span>,
          cell: ({ row }) => {
            const recibos = row.original.recibos || [];
            const recibosConNumero = recibos.filter(
              (r) => r.no_recibo === reciboNum
            );

            if (recibosConNumero.length === 0) {
              return <span className="text-gray-300">○ ○</span>;
            }

            // Si hay múltiples recibos con el mismo número, mostrar varias filas
            return (
              <div className="flex flex-col gap-0.5">
                {recibosConNumero.map((recibo, idx) => {
                  const pagoColor = getPagoColor(recibo.estatus_pago);
                  const comisionColor = getComisionColor(
                    recibo.estatus_comision
                  );

                  const tooltipText = [
                    `Recibo ${reciboNum} (${idx + 1}/${recibosConNumero.length
                    })`,
                    `\nPago: ${recibo.estatus_pago}`,
                    recibo.f_pago
                      ? `Fecha pago: ${recibo.f_pago}`
                      : "Fecha pago: Pendiente",
                    `\nComisión: ${recibo.estatus_comision}`,
                    recibo.f_pago_comision
                      ? `Fecha pago comisión: ${recibo.f_pago_comision}`
                      : "Fecha pago comisión: Pendiente",
                  ].join("\n");

                  return (
                    <div
                      key={recibo.id || idx}
                      className="flex items-center gap-0.5"
                      title={tooltipText}
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${pagoColor}`}
                      ></div>
                      <div
                        className={`w-3 h-3 rounded-full ${comisionColor} cursor-pointer hover:ring-2 hover:ring-blue-400`}
                        onClick={(e) =>
                          handleComisionClick(e, row.original, recibo)
                        }
                        title="Click para opciones"
                      ></div>
                    </div>
                  );
                })}
              </div>
            );
          },
          size: 50,
        });
      }),
      columnHelper.accessor("comision_pagada_total", {
        header: "Com. Pagada",
        cell: (info) => (
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            ${parseFloat(info.getValue() || 0).toFixed(2)}
          </span>
        ),
        size: 120,
      }),
      columnHelper.accessor("comision_cancelada_total", {
        header: "Com. Cancelada",
        cell: (info) => (
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            ${parseFloat(info.getValue() || 0).toFixed(2)}
          </span>
        ),
        size: 120,
      }),
      columnHelper.accessor("comision_pendiente_total", {
        header: "Com. Pendiente",
        cell: (info) => (
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            ${parseFloat(info.getValue() || 0).toFixed(2)}
          </span>
        ),
        size: 120,
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

  return (
    <div className="w-full space-y-4">
      {/* Leyenda */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">Leyenda:</p>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium mb-2 text-muted">
              Estado de Pago (Primer círculo):
            </p>
            <div className="flex flex-wrap gap-4 text-xs ml-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Pagado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>Pendiente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Cancelado</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium mb-2 text-muted">
              Estado de Comisión (Segundo círculo):
            </p>
            <div className="flex flex-wrap gap-4 text-xs ml-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Pagada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span>Pendiente</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vista móvil: Cards */}
      <div className="lg:hidden space-y-4">
        {table.getRowModel().rows.map((row) => {
          const poliza = row.original;
          const recibos = poliza.recibos || [];
          const diasVencimiento = calculateDiasVencimiento(poliza);

          return (
            <div
              key={row.id}
              className="bg-card border border-border rounded-lg p-4 shadow-sm"
            >
              {/* Header */}
              <div
                className="flex justify-between items-start mb-3"
                onContextMenu={(e) => handleContextMenu(e, poliza)}
              >
                <div>
                  <p className="font-bold text-lg text-primary">
                    {poliza.no_poliza}
                  </p>
                  <p className="text-xs text-muted">{poliza.asesor_nombre}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    {poliza.poliza_estatus}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Folio</p>
                  <p className="font-medium">{poliza.folio || "-"}</p>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                <div>
                  <p className="text-xs text-muted">Primas</p>
                  <p className="font-medium">
                    T: ${parseFloat(poliza.prima_total || 0).toFixed(2)}
                  </p>
                  <p className="text-muted text-xs">
                    N: ${parseFloat(poliza.prima_neta || 0).toFixed(2)}
                  </p>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {parseFloat(poliza.commission_percentage || 0).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">Días Vencimiento</p>
                  {diasVencimiento !== null ? (
                    <p
                      onClick={(e) => handleDaysClick(e, poliza, diasVencimiento)}
                      className={`font-medium cursor-pointer hover:underline ${diasVencimiento < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                        }`}
                    >
                      {diasVencimiento} días
                    </p>
                  ) : (
                    <p className="text-sm text-muted">-</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted">Compañía</p>
                  <p className="font-medium">{poliza.cia}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Forma Pago</p>
                  <p className="font-medium">{poliza.forma_pago || "-"}</p>
                </div>
              </div>

              {/* Recibos */}
              <div className="mb-3">
                <p className="text-xs text-muted mb-2">Recibos:</p>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 12 }, (_, i) => {
                    const reciboNum = i + 1;
                    const recibosConNumero = recibos.filter(
                      (r) => r.no_recibo === reciboNum
                    );

                    if (recibosConNumero.length === 0) {
                      return (
                        <div key={i} className="flex flex-col items-center">
                          <span className="text-[10px] text-muted mb-0.5">
                            {reciboNum}
                          </span>
                          <div className="flex gap-0.5">
                            <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                            <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={i} className="flex flex-col items-center">
                        <span className="text-[10px] text-muted mb-0.5">
                          {reciboNum}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          {recibosConNumero.map((recibo, idx) => {
                            const pagoColor = getPagoColor(recibo.estatus_pago);
                            const comisionColor = getComisionColor(
                              recibo.estatus_comision
                            );

                            return (
                              <div
                                key={recibo.id || idx}
                                className="flex gap-0.5"
                              >
                                <div
                                  className={`w-3 h-3 rounded-full ${pagoColor}`}
                                ></div>
                                <div
                                  className={`w-3 h-3 rounded-full ${comisionColor}`}
                                ></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comisiones */}
              <div className="flex justify-between text-sm pt-3 border-t border-border">
                <div>
                  <p className="text-xs text-muted">Com. Pagada</p>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    ${parseFloat(poliza.comision_pagada_total || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted">Com. Pendiente</p>
                  <p className="font-medium text-yellow-600 dark:text-yellow-400">
                    $
                    {parseFloat(poliza.comision_pendiente_total || 0).toFixed(
                      2
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista desktop: Tabla */}
      <div className="hidden lg:block overflow-x-auto rounded-lg border border-border shadow-sm">
        <table className="w-full border-collapse bg-card">
          <thead className="bg-muted/50 sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider border-b border-border"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none flex items-center gap-1"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: " 🔼",
                          desc: " 🔽",
                        }[header.column.getIsSorted()] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-border hover:bg-muted/30 transition-colors"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <div className="text-sm text-muted">
          Mostrando{" "}
          {table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
            1}{" "}
          a{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) *
            table.getState().pagination.pageSize,
            data.length
          )}{" "}
          de {data.length} resultados
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-sm">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white dark:bg-gray-800 border border-border rounded-lg shadow-lg py-1 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={openModal}
            className="w-full px-4 py-2 text-left text-sm hover:bg-muted transition-colors"
          >
            Aplicar Pagos/Comisiones
          </button>
        </div>
      )}

      {/* Modal de Selección de Acción */}
      {showComisionSelector && selectedPoliza && selectedRecibo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="border-b border-border p-4">
              <h3 className="text-lg font-semibold">Selecciona una Acción</h3>
              <p className="text-sm text-muted mt-1">
                Póliza: {selectedPoliza.no_poliza} - Recibo #
                {selectedRecibo.no_recibo}
              </p>
              <p className="text-sm font-medium mt-1">
                Comisión: ${parseFloat(selectedRecibo.comision || 0).toFixed(2)}
              </p>
            </div>

            <div className="p-6 space-y-3">
              <button
                onClick={handleSeleccionPagarComision}
                className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <span className="text-xl">💰</span>
                <span>Pagar Comisión</span>
              </button>

              <button
                onClick={handleSeleccionGenerarAjuste}
                className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <span className="text-xl">📋</span>
                <span>Generar Ajuste</span>
              </button>
            </div>

            <div className="border-t border-border p-4">
              <button
                onClick={() => setShowComisionSelector(false)}
                className="w-full px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/80"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de actualización masiva */}
      {showModal && selectedPoliza && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="text-lg font-semibold">
                Actualizar Recibos - Póliza {selectedPoliza.no_poliza}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Selector de recibos */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Seleccionar Recibos:</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary/90"
                    >
                      Seleccionar Todos
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="text-xs px-2 py-1 bg-secondary text-white rounded hover:bg-secondary/80"
                    >
                      Deseleccionar Todos
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {(selectedPoliza.recibos || []).map((recibo) => {
                    const pagoColor = getPagoColor(recibo.estatus_pago);
                    const comisionColor = getComisionColor(
                      recibo.estatus_comision
                    );
                    return (
                      <label
                        key={recibo.id}
                        className="flex items-center gap-2 p-2 border border-border rounded cursor-pointer hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecibos.includes(recibo.id)}
                          onChange={() => handleReciboToggle(recibo.id)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm font-medium">
                          #{recibo.no_recibo}
                        </span>
                        <div className="flex gap-0.5">
                          <div
                            className={`w-3 h-3 rounded-full ${pagoColor}`}
                          ></div>
                          <div
                            className={`w-3 h-3 rounded-full ${comisionColor}`}
                          ></div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted mt-2">
                  {selectedRecibos.length} de{" "}
                  {selectedPoliza.recibos?.length || 0} recibos seleccionados
                </p>
              </div>

              {/* Acciones */}
              <div className="space-y-4">
                <h4 className="font-medium">Aplicar Cambios:</h4>

                {/* Estatus de Pago */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Estatus de Pago
                  </label>
                  <select
                    value={bulkAction.estatus_pago}
                    onChange={(e) =>
                      setBulkAction((prev) => ({
                        ...prev,
                        estatus_pago: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="">No modificar</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="PAGADO">PAGADO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </div>

                {/* Estatus de Comisión */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Estatus de Comisión
                  </label>
                  <select
                    value={bulkAction.estatus_comision}
                    onChange={(e) =>
                      setBulkAction((prev) => ({
                        ...prev,
                        estatus_comision: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="">No modificar</option>
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="PAGADO">PAGADO</option>
                    <option value="RETENIDO">RETENIDO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </div>

                {/* Comisión a Descontar - Solo si es CANCELADO */}
                {bulkAction.estatus_comision === "CANCELADO" && (
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <label className="block text-sm font-medium mb-1 text-red-900 dark:text-red-100">
                      Comisión a Descontar (genera recibo negativo)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkAction.comision_descontar}
                      onChange={(e) =>
                        setBulkAction((prev) => ({
                          ...prev,
                          comision_descontar: e.target.value,
                        }))
                      }
                      placeholder="Monto a descontar"
                      className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-md bg-background text-foreground"
                    />
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      Se generará un recibo adicional con valor negativo
                    </p>
                  </div>
                )}

                {/* Fecha de Pago */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fecha de Pago (opcional)
                  </label>
                  <input
                    type="date"
                    value={bulkAction.f_pago}
                    onChange={(e) =>
                      setBulkAction((prev) => ({
                        ...prev,
                        f_pago: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  />
                </div>

                {/* Fecha de Pago de Comisión */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fecha de Pago de Comisión (opcional)
                  </label>
                  <input
                    type="date"
                    value={bulkAction.f_pago_comision}
                    onChange={(e) =>
                      setBulkAction((prev) => ({
                        ...prev,
                        f_pago_comision: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/80"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkUpdate}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Actualizando..." : "Aplicar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ajuste de Comisión */}
      {comisionModalType === "ajuste" && selectedPoliza && selectedRecibo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg bg-black/80 shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-border p-4">
              <h3 className="text-lg font-semibold">
                Generar Recibo de Ajuste
              </h3>
              <p className="text-sm text-muted mt-1">
                Póliza: {selectedPoliza.no_poliza} - Recibo #
                {selectedRecibo.no_recibo}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Tipo de Ajuste */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo de Ajuste *
                </label>
                <select
                  value={ajusteData.tipo_ajuste}
                  onChange={(e) =>
                    setAjusteData((prev) => ({
                      ...prev,
                      tipo_ajuste: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="CANCELACION">CANCELACION</option>
                  <option value="PAGO DUPLICADO">PAGO DUPLICADO</option>
                  <option value="FORMA DE PAGO">FORMA DE PAGO</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>

              {/* Monto de Ajuste */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Monto de Ajuste *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ajusteData.monto_ajuste}
                  onChange={(e) =>
                    setAjusteData((prev) => ({
                      ...prev,
                      monto_ajuste: e.target.value,
                    }))
                  }
                  placeholder="Ej: -1500.00 o 1500.00"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
                <p className="text-xs text-muted mt-1">
                  Use números negativos para descuentos, positivos para aumentos
                </p>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Motivo (opcional)
                </label>
                <textarea
                  value={ajusteData.motivo}
                  onChange={(e) =>
                    setAjusteData((prev) => ({
                      ...prev,
                      motivo: e.target.value,
                    }))
                  }
                  placeholder="Describe el motivo del ajuste..."
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  rows="3"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  📋 Se generará otro recibo #{selectedRecibo.no_recibo} con el
                  monto de ajuste especificado
                </p>
              </div>
            </div>

            <div className="border-t border-border p-4 flex justify-end gap-3">
              <button
                onClick={() => setComisionModalType(null)}
                className="px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/80"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerarAjuste}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Generando..." : "Generar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pago de Comisión Individual */}
      {comisionModalType === "pagar" && selectedPoliza && selectedRecibo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="border-b border-border p-4">
              <h3 className="text-lg font-semibold">Pagar Comisión</h3>
              <p className="text-sm text-muted mt-1">
                Póliza: {selectedPoliza.no_poliza} - Recibo #
                {selectedRecibo.no_recibo}
              </p>
              <p className="text-sm text-muted">
                Comisión: ${parseFloat(selectedRecibo.comision || 0).toFixed(2)}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Estatus de Comisión */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Estatus de Comisión *
                </label>
                <select
                  value={pagoComisionData.estatus_comision}
                  onChange={(e) =>
                    setPagoComisionData((prev) => ({
                      ...prev,
                      estatus_comision: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="PAGADO">PAGADO</option>
                  <option value="RETENIDO">RETENIDO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </div>

              {/* Fecha de Pago de Comisión */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fecha de Pago de Comisión *
                </label>
                <input
                  type="date"
                  value={pagoComisionData.f_pago_comision}
                  onChange={(e) =>
                    setPagoComisionData((prev) => ({
                      ...prev,
                      f_pago_comision: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>

              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-900 dark:text-green-100">
                  💰 Se actualizará el estatus de comisión de este recibo
                </p>
              </div>
            </div>

            <div className="border-t border-border p-4 flex justify-end gap-3">
              <button
                onClick={() => setComisionModalType(null)}
                className="px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/80"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handlePagarComision}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Actualizando..." : "Pagar Comisión"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showReminderModal && (
        <PaymentReminderModal
          isOpen={showReminderModal}
          onClose={() => setShowReminderModal(false)}
          policyData={reminderData.policyData}
          daysData={reminderData.daysData}
          type={reminderData.type}
        />
      )}
    </div>
  );
}
