"use client";
import { useState, useMemo, useEffect } from "react";
import {
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    createColumnHelper,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper();

const STATUS_OPTIONS = [
    "INGRESO",
    "INGRESO DIGITAL",
    "EN COMERCIAL",
    "REGRESO ASESOR",
    "SIN INGRESO",
    "CANCELACION",
    "COMPLETO",
];

const REQUEST_OPTIONS = ["DXN", "CONT", "MENS"];
const COMPANY_OPTIONS = ["QUALITAS", "GNP", "AXA", "HDI", "GS"];

// Generic Select Component
const EditableSelect = ({ value, rowId, field, options, canEdit, onUpdate, className = "" }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleChange = async (e) => {
        const newValue = e.target.value;
        if (newValue === currentValue) return;

        setLoading(true);
        setCurrentValue(newValue);

        try {
            const res = await fetch("/api/ingresos/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: rowId, field, value: newValue }),
            });

            if (!res.ok) throw new Error("Failed to update");
            // const json = await res.json();
            if (onUpdate) onUpdate(rowId, field, newValue);
        } catch (error) {
            console.error(error);
            alert("Error actualizando");
            setCurrentValue(value); // Revert
        } finally {
            setLoading(false);
        }
    };

    if (!canEdit) return <span>{value || "-"}</span>;

    // Visual logic for Status specific colors could remain here or be passed
    const getStatusColor = (val) => {
        if (field !== "estatus") return "text-foreground";
        if (val === "COMPLETO") return "text-green-600";
        if (val === "CANCELACION") return "text-red-600";
        return "text-foreground";
    };

    return (
        <select
            value={currentValue || ""}
            onChange={handleChange}
            disabled={loading}
            className={`bg-transparent border-none p-0 text-xs font-medium focus:ring-0 cursor-pointer ${getStatusColor(currentValue)} ${loading ? "opacity-50" : ""} ${className}`}
        >
            <option value="" disabled>Seleccionar</option>
            {options.map((opt) => (
                <option key={opt} value={opt} className="text-foreground bg-background">
                    {opt}
                </option>
            ))}
        </select>
    );
};

// Generic Text Input Component
const EditableText = ({ value, rowId, field, canEdit, onUpdate, className = "" }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleBlur = async () => {
        if (currentValue === value) return; // No change

        setLoading(true);
        try {
            const res = await fetch("/api/ingresos/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: rowId, field, value: currentValue }),
            });

            if (!res.ok) throw new Error("Failed to update");
            if (onUpdate) onUpdate(rowId, field, currentValue);
        } catch (error) {
            console.error(error);
            alert("Error actualizando");
            setCurrentValue(value); // Revert
        } finally {
            setLoading(false);
        }
    };

    if (!canEdit) return <span>{value || "-"}</span>;

    return (
        <input
            type="text"
            value={currentValue || ""}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleBlur}
            disabled={loading}
            className={`bg-transparent border-none p-0 text-foreground focus:ring-1 focus:ring-accent rounded px-1 ${loading ? "opacity-50" : ""} ${className}`}
        />
    );
};

// Generic Date Input Component
const EditableDate = ({ value, rowId, field, canEdit, onUpdate, className = "" }) => {
    // Ensure value is YYYY-MM-DD
    const formatDate = (val) => {
        if (!val) return "";
        return val.includes("T") ? val.split("T")[0] : val;
    };

    const [currentValue, setCurrentValue] = useState(formatDate(value));
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setCurrentValue(formatDate(value));
    }, [value]);

    const handleBlur = async () => {
        // Basic valid date check or empty
        if (currentValue === formatDate(value)) return;

        setLoading(true);
        try {
            const res = await fetch("/api/ingresos/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: rowId, field, value: currentValue || null }),
            });

            if (!res.ok) throw new Error("Failed to update");
            if (onUpdate) onUpdate(rowId, field, currentValue);
        } catch (error) {
            console.error(error);
            alert("Error actualizando fecha");
            setCurrentValue(formatDate(value)); // Revert
        } finally {
            setLoading(false);
        }
    };

    if (!canEdit) {
        return <span>{value ? formatDate(value) : <span className="text-muted-foreground text-red-500">Sin fecha</span>}</span>
    }

    return (
        <input
            type="date"
            value={currentValue || ""}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleBlur}
            disabled={loading}
            className={`bg-transparent border-none p-0 text-xs text-foreground focus:ring-1 focus:ring-accent rounded px-1 w-full ${loading ? "opacity-50" : ""} ${className}`}
        />
    );
};

// Generic Text Area Component
const EditableTextArea = ({ value, rowId, field, canEdit, onUpdate, className = "" }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleBlur = async () => {
        if (currentValue === value) return; // No change

        setLoading(true);
        try {
            const res = await fetch("/api/ingresos/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: rowId, field, value: currentValue || "" }),
            });

            if (!res.ok) throw new Error("Failed to update");
            if (onUpdate) onUpdate(rowId, field, currentValue);
        } catch (error) {
            console.error(error);
            alert("Error actualizando");
            setCurrentValue(value); // Revert
        } finally {
            setLoading(false);
        }
    };

    if (!canEdit) return <p className="whitespace-pre-wrap">{value || <span className="text-muted-foreground text-green-500">Sin observación</span>}</p>;

    return (
        <textarea
            value={currentValue || ""}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleBlur}
            disabled={loading}
            rows={Math.max(1, Math.min(5, (currentValue || "").split('\n').length))}
            className={`bg-transparent border border-transparent hover:border-border focus:border-accent rounded p-1 text-sm w-full min-w-[200px] resize-y ${loading ? "opacity-50" : ""} ${className}`}
        />
    );
};

// Editable Asesor Select Component
const EditableAsesorSelect = ({ value, rowId, asesores, canEdit, onUpdate, className = "" }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    const handleChange = async (e) => {
        const newValue = e.target.value; // This is the advisor ID (string or number)
        if (newValue == currentValue) return;

        setLoading(true);
        setCurrentValue(newValue);

        try {
            const res = await fetch("/api/ingresos/update", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: rowId, field: "asesor_id", value: newValue }),
            });

            if (!res.ok) throw new Error("Failed to update");

            // Find the selected advisor object to get the name
            const selectedAsesor = asesores.find(a => String(a.id) === String(newValue));

            if (onUpdate) {
                // Update the ID
                onUpdate(rowId, "asesor_id", newValue);
                // Also update the Name for display
                if (selectedAsesor) {
                    onUpdate(rowId, "asesor", selectedAsesor.nombre);
                }
            }
        } catch (error) {
            console.error(error);
            alert("Error actualizando asesor");
            setCurrentValue(value); // Revert
        } finally {
            setLoading(false);
        }
    };

    if (!canEdit) {
        // Find name from asesores list or use the one in the row if we don't have the list logic here
        // But better to just assume the parent passed the name in a text field if not editable? 
        // Actually, we can use the `asesores` list to show the name corresponding to `value` (id)
        const asesor = asesores?.find(a => String(a.id) === String(value));
        return <span>{asesor ? asesor.nombre.slice(0, 10) : "-"}</span>;
    }

    return (
        <select
            value={currentValue || ""}
            onChange={handleChange}
            disabled={loading}
            className={`bg-transparent border-none p-0 text-xs font-medium focus:ring-0 cursor-pointer text-foreground ${loading ? "opacity-50" : ""} ${className}`}
        >
            <option value="" disabled>Seleccionar</option>
            {asesores?.map((a) => (
                <option key={a.id} value={a.id} className="text-foreground bg-background">
                    {a.nombre}
                </option>
            ))}
        </select>
    );
};


export default function IngresosTable({ data, asesores = [], canEdit }) {
    const [sorting, setSorting] = useState([]);
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
    const [tableData, setTableData] = useState(data);

    useEffect(() => {
        setTableData(data);
    }, [data]);

    const handleUpdate = (id, field, newValue) => {
        setTableData((prev) =>
            prev.map((row) => {
                if (row.id === id) {
                    // Map field names to data keys if necessary, strictly they match 
                    // but 'estatus' key in data is 'tipo_ingreso_reingreso'
                    const key = field === 'estatus' ? 'tipo_ingreso_reingreso' : field;
                    return { ...row, [key]: newValue };
                }
                return row;
            })
        );
    };

    const columns = useMemo(
        () => [
            columnHelper.accessor("tipo_ingreso_reingreso", {
                header: "Estatus",
                cell: (info) => (
                    <EditableSelect
                        value={info.getValue()}
                        rowId={info.row.original.id}
                        field="estatus"
                        options={STATUS_OPTIONS}
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                    />
                ),
            }),
            columnHelper.accessor("folio", {
                header: "Folio",
                cell: (info) => (
                    <EditableText
                        value={info.getValue()}
                        rowId={info.row.original.id}
                        field="folio"
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                        className="w-16"
                    />
                ),
            }),
            columnHelper.accessor("asesor", {
                header: "Asesor",
                cell: (info) => (
                    <EditableAsesorSelect
                        value={info.row.original.asesor_id}
                        rowId={info.row.original.id}
                        asesores={asesores}
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                        className="w-32"
                    />
                ),
            }),
            columnHelper.accessor("poliza", {
                header: "Póliza",
                cell: (info) => (
                    <EditableText
                        value={info.getValue()}
                        rowId={info.row.original.id}
                        field="poliza"
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                        className="w-[7.5rem]"
                    />
                ),
            }),
            columnHelper.accessor("compania", {
                header: "Cía",
                cell: (info) => (
                    <EditableSelect
                        value={info.getValue()}
                        rowId={info.row.original.id}
                        field="compania"
                        options={COMPANY_OPTIONS}
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                    />
                ),
            }),
            columnHelper.accessor("tipo_solicitud", {
                header: "Solicitud",
                cell: (info) => (
                    <EditableSelect
                        value={info.getValue()}
                        rowId={info.row.original.id}
                        field="tipo_solicitud"
                        options={REQUEST_OPTIONS}
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                    />
                ),
            }),
            columnHelper.accessor("fecha_ingreso", {
                header: "Ingreso",
                cell: (info) => (
                    <EditableDate
                        value={info.getValue()}
                        rowId={info.row.original.id}
                        field="fecha_ingreso"
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                    />
                ),
            }),
            columnHelper.accessor("fecha_ingreso_digital", {
                header: "Ingreso Digital",
                cell: (info) => (
                    <EditableDate
                        value={info.getValue()}
                        rowId={info.row.original.id}
                        field="fecha_ingreso_digital"
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                    />
                ),
            }),
            columnHelper.accessor("fecha_comercial", {
                header: "Ingreso Comercial",
                cell: (info) => (
                    <EditableDate
                        value={info.getValue()}
                        rowId={info.row.original.id}
                        field="fecha_comercial"
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                    />
                ),
            }),
            columnHelper.accessor("fecha_mesa_vales", {
                header: "Mesa de vales",
                cell: (info) => (
                    <EditableDate
                        value={info.getValue()}
                        rowId={info.row.original.id}
                        field="fecha_mesa_vales"
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                    />
                ),
            }),
            columnHelper.accessor("observacion", {
                header: "Obs",
                cell: (info) => (
                    <EditableTextArea
                        value={info.getValue()}
                        rowId={info.row.original.id}
                        field="observacion"
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                    />
                ),
            }),
        ],
        [canEdit, tableData]
    );

    const table = useReactTable({
        data: tableData || [],
        columns,
        state: { sorting, pagination },
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className="overflow-visible rounded border-none md:border md:border-border">
            {/* Desktop Table */}
            <table className="hidden md:table min-w-full text-sm">
                <thead className="bg-muted/10">
                    {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                            {hg.headers.map((header) => (
                                <th
                                    key={header.id}
                                    className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer select-none"
                                    onClick={header.column.getToggleSortingHandler()}
                                >
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                    {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted()] ||
                                        null}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map((row) => (
                        <tr
                            key={row.id}
                            className="border-b border-border last:border-0 hover:bg-muted/5"
                        >
                            {row.getVisibleCells().map((cell) => (
                                <td
                                    key={cell.id}
                                    className="px-3 py-2 text-foreground align-top"
                                >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
                {table.getRowModel().rows.map((row) => (
                    <div
                        key={row.id}
                        className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 shadow-sm"
                    >
                        <div className="border-b border-border pb-2 mb-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Estatus
                                </span>
                                <EditableSelect
                                    value={row.original.tipo_ingreso_reingreso}
                                    rowId={row.original.id}
                                    field="estatus"
                                    options={STATUS_OPTIONS}
                                    canEdit={canEdit}
                                    onUpdate={handleUpdate}
                                    className="text-right"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between items-start">
                            <div className="flex flex-col w-1/2 pr-2">
                                <span className="text-xs text-muted-foreground">Folio</span>
                                <EditableText
                                    value={row.original.folio}
                                    rowId={row.original.id}
                                    field="folio"
                                    canEdit={canEdit}
                                    onUpdate={handleUpdate}
                                    className="font-semibold text-lg"
                                />
                            </div>
                            <div className="flex flex-col items-end w-1/2 pl-2">
                                <span className="text-xs text-muted-foreground">Fecha Ingreso</span>
                                <EditableDate
                                    value={row.original.fecha_ingreso}
                                    rowId={row.original.id}
                                    field="fecha_ingreso"
                                    canEdit={canEdit}
                                    onUpdate={handleUpdate}
                                    className="text-right"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Póliza</span>
                                <EditableText
                                    value={row.original.poliza}
                                    rowId={row.original.id}
                                    field="poliza"
                                    canEdit={canEdit}
                                    onUpdate={handleUpdate}
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Compañía</span>
                                <EditableSelect
                                    value={row.original.compania}
                                    rowId={row.original.id}
                                    field="compania"
                                    options={COMPANY_OPTIONS}
                                    canEdit={canEdit}
                                    onUpdate={handleUpdate}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col mt-1">
                            <span className="text-xs text-muted-foreground">Asesor</span>
                            <span className="font-medium text-primary truncate">
                                {row.original.asesor || "Sin asesor"}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Solicitud</span>
                                <EditableSelect
                                    value={row.original.tipo_solicitud}
                                    rowId={row.original.id}
                                    field="tipo_solicitud"
                                    options={REQUEST_OPTIONS}
                                    canEdit={canEdit}
                                    onUpdate={handleUpdate}
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Recibe</span>
                                <span className="text-sm">{row.original.recibe}</span>
                            </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-border text-sm space-y-2 bg-muted/10 p-2 rounded">
                            <div>
                                <span className="font-semibold text-xs block">
                                    Observación:
                                </span>
                                <EditableTextArea
                                    value={row.original.observacion}
                                    rowId={row.original.id}
                                    field="observacion"
                                    canEdit={canEdit}
                                    onUpdate={handleUpdate}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="flex flex-col">
                                    <span className="block opacity-70">Mesa Vales:</span>
                                    <EditableDate
                                        value={row.original.fecha_mesa_vales}
                                        rowId={row.original.id}
                                        field="fecha_mesa_vales"
                                        canEdit={canEdit}
                                        onUpdate={handleUpdate}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="block opacity-70">Digital:</span>
                                    <EditableDate
                                        value={row.original.fecha_ingreso_digital}
                                        rowId={row.original.id}
                                        field="fecha_ingreso_digital"
                                        canEdit={canEdit}
                                        onUpdate={handleUpdate}
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="block opacity-70">Comercial:</span>
                                    <EditableDate
                                        value={row.original.fecha_comercial}
                                        rowId={row.original.id}
                                        field="fecha_comercial"
                                        canEdit={canEdit}
                                        onUpdate={handleUpdate}
                                    />
                                </div>
                                <div>
                                    <span className="block opacity-70">Reingreso:</span>
                                    {row.original.reingreso ? "Sí" : "No"}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 border-t border-border mt-4 md:mt-0">
                <div className="flex items-center gap-2">
                    <button
                        className="px-3 py-1 border rounded disabled:opacity-50"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Anterior
                    </button>
                    <button
                        className="px-3 py-1 border rounded disabled:opacity-50"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Siguiente
                    </button>
                </div>
                <span className="text-sm text-muted-foreground">
                    Página {table.getState().pagination.pageIndex + 1} de{" "}
                    {table.getPageCount()}
                </span>
            </div>
        </div>
    );
}
