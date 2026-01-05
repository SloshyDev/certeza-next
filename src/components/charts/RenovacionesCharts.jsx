"use client";

import React, { useState, useMemo } from "react";
import PieChart from "./PieChart";
import { CHART_PALETTE, RENOVATION_STATUS_COLORS } from "@/lib/chart-constants";

export default function RenovacionesCharts({ stats, byMes }) {
  // Extract available months from data
  const availableMonths = useMemo(() => {
    const months = new Set(byMes.map((m) => m.mes));

    // Custom sort logic
    const monthMap = {
      ENERO: 0, FEBRERO: 1, MARZO: 2, ABRIL: 3, MAYO: 4, JUNIO: 5,
      JULIO: 6, AGOSTO: 7, SEPTIEMBRE: 8, OCTUBRE: 9, NOVIEMBRE: 10, DICIEMBRE: 11
    };

    return Array.from(months).sort((a, b) => {
      // Parse "MES AÑO" e.g. "ENERO 2025"
      const [ma, ya] = a.trim().toUpperCase().split(/\s+/);
      const [mb, yb] = b.trim().toUpperCase().split(/\s+/);

      const yearA = parseInt(ya) || 0;
      const yearB = parseInt(yb) || 0;

      if (yearA !== yearB) {
        return yearB - yearA; // Newest year first
      }

      // Same year, check month
      const idxA = monthMap[ma] ?? -1;
      const idxB = monthMap[mb] ?? -1;

      return idxB - idxA; // Newest month first
    });
  }, [byMes]);

  // State for selected month
  // "all" represents all months combined
  const [selectedMonth, setSelectedMonth] = useState(
    availableMonths.length > 0
      ? availableMonths[availableMonths.length - 1]
      : "all"
  );

  // 1. Prepare Colors for Statuses (Global consistency)
  const allStatuses = useMemo(() => {
    return new Set([
      ...stats.map((s) => s.estatus),
      ...byMes.map((s) => s.estatus),
    ]);
  }, [stats, byMes]);

  const statusColorMap = useMemo(() => {
    const map = {};
    // Use defined colors first, fallback to palette
    Array.from(allStatuses).forEach((status, idx) => {
      // Normalize status to uppercase for matching
      const normalizedStatus = status ? status.toUpperCase() : "";

      if (RENOVATION_STATUS_COLORS[normalizedStatus]) {
        map[status] = RENOVATION_STATUS_COLORS[normalizedStatus];
      } else {
        map[status] = CHART_PALETTE[idx % CHART_PALETTE.length];
      }
    });
    return map;
  }, [allStatuses]);

  // Filter Data based on selected month
  const filteredData = useMemo(() => {
    if (selectedMonth === "all") {
      return byMes;
    }
    return byMes.filter((d) => d.mes === selectedMonth);
  }, [byMes, selectedMonth]);

  // 2. Prepare Data for Pie Chart (Based on Selected Month or All)
  const pieStats = useMemo(() => {
    if (selectedMonth === "all") {
      // Use the pre-calculated global stats passed as prop
      // OR recalculate from 'byMes' to ensure consistency if 'stats' prop differs slightly
      // Using 'stats' prop is safer if it comes from a specific DB query for efficiency,
      // but here we can aggregate 'byMes' to be consistent with the filter.
      // Let's aggregate from filteredData (which is all 'byMes' in this case)
      const agg = {};
      filteredData.forEach((item) => {
        agg[item.estatus] = (agg[item.estatus] || 0) + item.total;
      });
      return Object.entries(agg).map(([estatus, total]) => ({
        estatus,
        total,
      }));
    } else {
      // Aggregate for the specific month
      const agg = {};
      filteredData.forEach((item) => {
        agg[item.estatus] = (agg[item.estatus] || 0) + item.total;
      });
      return Object.entries(agg).map(([estatus, total]) => ({
        estatus,
        total,
      }));
    }
  }, [filteredData, selectedMonth]);

  const totalRenovaciones = pieStats.reduce((acc, curr) => acc + curr.total, 0);

  let currentAngle = 0;
  const pieSlices = pieStats.map((item) => {
    const percentage =
      totalRenovaciones > 0 ? item.total / totalRenovaciones : 0;
    const startA = currentAngle * 2 * Math.PI - Math.PI / 2;
    const endA = (currentAngle + percentage) * 2 * Math.PI - Math.PI / 2;
    currentAngle += percentage;

    return {
      startA,
      endA,
      color: statusColorMap[item.estatus],
      meta: item,
    };
  });

  // 3. Prepare Data for Stacked Bar Chart (Filtered by Month, Grouped by Advisor)
  const stackedData = useMemo(() => {
    // Group by Advisor
    const advisorMap = {};
    filteredData.forEach((item) => {
      if (!advisorMap[item.asesor]) {
        advisorMap[item.asesor] = {
          asesor: item.asesor,
          total: 0,
          segments: [],
        };
      }
      // Check if segment already exists for this advisor (aggregating multiple months if "all")
      const existingSeg = advisorMap[item.asesor].segments.find(
        (s) => s.estatus === item.estatus
      );
      if (existingSeg) {
        existingSeg.total += item.total;
      } else {
        advisorMap[item.asesor].segments.push({
          estatus: item.estatus,
          total: item.total,
          color: statusColorMap[item.estatus],
        });
      }
      advisorMap[item.asesor].total += item.total;
    });

    // Calculate percentages for bars
    return Object.values(advisorMap)
      .sort((a, b) => {
        // Helper to sum 'COLOCADA' and 'REEXPEDIDA'
        const getRelevantTotal = (adv) => {
          return adv.segments
            .filter((s) => {
              const status = s.estatus ? s.estatus.toUpperCase() : "";
              return status === "COLOCADA" || status === "REEXPEDIDA";
            })
            .reduce((sum, s) => sum + s.total, 0);
        };

        const relA = getRelevantTotal(a);
        const relB = getRelevantTotal(b);

        // Sort by relevant total descending
        if (relB !== relA) {
          return relB - relA;
        }
        // Fallback to total count
        return b.total - a.total;
      })
      .map((adv) => {
        const segments = adv.segments.map((seg) => ({
          ...seg,
          percentage: adv.total > 0 ? (seg.total / adv.total) * 100 : 0,
        }));
        return { ...adv, segments };
      });
  }, [filteredData, statusColorMap]);

  if (stats.length === 0 && byMes.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Renovaciones (Automáticas)</h2>

      {/* Month Selector */}
      {availableMonths.length > 0 && (
        <div className="mb-6 flex items-center gap-2">
          <label htmlFor="month-select" className="text-sm font-medium">
            Mes:
          </label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">Todos</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stacked Bar Chart Section (By Advisor for Selected Month) */}
        <div className="rounded-lg border border-border p-6 bg-card text-card-foreground">
          <h3 className="text-lg font-semibold mb-4">
            {selectedMonth === "all"
              ? "Por Asesor (Todos los meses)"
              : `Por Asesor - ${selectedMonth}`}
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {stackedData.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No hay datos para este periodo.
              </p>
            ) : (
              stackedData.map((row) => (
                <div key={row.asesor}>
                  <div className="flex justify-between text-sm mb-1">
                    <span
                      className="font-medium truncate max-w-[200px]"
                      title={row.asesor}
                    >
                      {row.asesor}
                    </span>
                    <span className="text-muted-foreground font-mono">
                      {row.total}
                    </span>
                  </div>
                  <div className="flex h-6 w-full rounded-full overflow-hidden bg-muted/20">
                    {row.segments.map((seg, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: `${seg.percentage}%`,
                          backgroundColor: seg.color,
                        }}
                        className="h-full"
                        title={`${seg.estatus}: ${seg.total}`}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Legend for Stacked Bar */}
          <div className="mt-6 flex flex-wrap gap-4">
            {Object.entries(statusColorMap).map(([status, color]) => (
              <div key={status} className="flex items-center text-xs">
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: color }}
                />
                <span>{status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart Section (Global or Filtered) */}
        <div className="rounded-lg border border-border p-6 bg-card text-card-foreground flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-6 self-start">
            {selectedMonth === "all"
              ? "Distribución Global"
              : `Distribución - ${selectedMonth}`}
          </h3>
          <div className="relative">
            <PieChart size={240} thickness={60} slices={pieSlices} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="text-3xl font-bold">{totalRenovaciones}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
          {/* Legend for Pie Chart */}
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2">
            {pieStats.map((stat) => (
              <div
                key={stat.estatus}
                className="flex items-center justify-between text-sm min-w-[120px]"
              >
                <div className="flex items-center">
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: statusColorMap[stat.estatus] }}
                  />
                  <span className="truncate max-w-[100px]">{stat.estatus}</span>
                </div>
                <span className="font-mono ml-2">{stat.total}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
