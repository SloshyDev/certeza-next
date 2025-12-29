"use client";

import React from "react";
import PieChart from "./PieChart";
import { CHART_PALETTE } from "@/lib/chart-constants";

// Helper for horizontal bars
const HorizontalBarChart = ({ data, title, colorOffset = 0 }) => {
    const max = Math.max(1, ...data.map((d) => Number(d.total)));

    return (
        <div className="rounded-lg border border-border p-4 flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="space-y-3 flex-1 overflow-y-auto">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-24 shrink-0 truncate text-muted-foreground" title={d.tipo}>
                            {d.tipo || "(vacío)"}
                        </div>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${(Number(d.total) / max) * 100}%`,
                                    backgroundColor: CHART_PALETTE[(i + colorOffset) % CHART_PALETTE.length],
                                }}
                            />
                        </div>
                        <div className="w-8 shrink-0 text-right font-medium">{d.total}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper for daily vertical bars
const DailyChart = ({ data, title }) => {
    if (!data || data.length === 0) return (
        <div className="rounded-lg border border-border p-4 flex flex-col h-full items-center justify-center text-muted-foreground text-sm bg-card shadow-sm">
            <h3 className="text-lg font-semibold mb-2 self-start text-foreground">{title}</h3>
            No hay datos para mostrar
        </div>
    );

    const max = Math.max(1, ...data.map((d) => Number(d.total)));

    const formatDay = (dateStr) => {
        if (!dateStr) return "";
        const [y, m, d] = dateStr.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        const days = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"];
        const dayName = days[date.getDay()] || "";
        return `${dayName}-${d}`;
    };

    return (
        <div className="rounded-lg border border-border p-4 flex flex-col h-full bg-card shadow-sm">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="flex items-end gap-1 h-[200px] w-full pt-8 pb-2 px-2 overflow-x-auto">
                {data.map((d, i) => {
                    const heightPct = (Number(d.total) / max) * 100;
                    return (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[40px] group relative h-full justify-end">
                            <div
                                className="w-full bg-blue-600 rounded-t opacity-80 hover:opacity-100 transition-all relative"
                                style={{ height: `${heightPct}%` }}
                            >
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground px-1 rounded shadow pointer-events-none z-20">
                                    {d.total}
                                </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis w-full text-center font-medium">
                                {formatDay(d.dia)}
                            </div>
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 text-[10px] bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                                {d.dia}: {d.total}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function IngresosDashboard({ stats }) {
    const { byStatus, byCompania, byAsesor, byMesaValesDay } = stats;

    const totalIngresos = byStatus.reduce((acc, curr) => acc + Number(curr.total), 0);

    // Prepare slices for PieChart
    const statusSlices = byStatus.map((d, i) => ({
        color: CHART_PALETTE[i % CHART_PALETTE.length],
        value: Number(d.total),
        label: d.tipo || "(vacío)",
    }));

    // Calculate angles for PieChart manually
    let acc = 0;
    const totalStatus = statusSlices.reduce((a, b) => a + b.value, 0);
    const pieSlices = statusSlices.map((s) => {
        const pct = totalStatus ? s.value / totalStatus : 0;
        const startA = acc * 2 * Math.PI - Math.PI / 2;
        const endA = (acc + pct) * 2 * Math.PI - Math.PI / 2;
        acc += pct;
        return {
            ...s,
            startA,
            endA,
        };
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Summary Card */}
                <div className="rounded-lg border border-border p-6 flex flex-col items-center justify-center bg-card shadow-sm">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Total Ingresos</h3>
                    <div className="text-4xl font-bold">{totalIngresos}</div>
                    <div className="text-xs text-muted-foreground mt-2">En el periodo seleccionado</div>
                </div>

                {/* Status Pie Chart */}
                <div className="rounded-lg border border-border p-4 flex flex-col items-center bg-card shadow-sm md:col-span-2">
                    <h3 className="text-lg font-semibold w-full text-left mb-4">Estatus</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-8 w-full justify-center">
                        <PieChart size={160} thickness={40} slices={pieSlices} />
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            {statusSlices.map((s, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                    <span
                                        className="inline-block h-3 w-3 rounded-full"
                                        style={{ backgroundColor: s.color }}
                                    />
                                    <span className="opacity-80">{s.label}</span>
                                    <span className="font-semibold ml-auto">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <DailyChart data={byMesaValesDay} title="Mesa de Vales (Diario)" />
        </div>
    );
}
