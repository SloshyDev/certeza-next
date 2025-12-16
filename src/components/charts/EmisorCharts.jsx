import React from "react";
import PieChart from "./PieChart";
import { CHART_PALETTE, TYPE_COLORS } from "@/lib/chart-constants";

export default function EmisorCharts({ data, start, end }) {
  const grouped = {};
  for (const row of data) {
    const key = row.emisor || "(vacío)";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({ tipo: row.tipo || "(vacío)", total: row.total });
  }

  const emisores = Object.entries(grouped);

  if (emisores.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="opacity-80">Sin registros para el rango seleccionado.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {emisores.map(([emisor, rows], idx) => {
        const total = rows.reduce((a, b) => a + b.total, 0);
        const slices = [];
        let acc = 0;

        for (let i = 0; i < rows.length; i++) {
          const pct = total ? rows[i].total / total : 0;
          const startA = acc * 2 * Math.PI - Math.PI / 2;
          const endA = (acc + pct) * 2 * Math.PI - Math.PI / 2;
          acc += pct;

          const key = (rows[i].tipo || "").toUpperCase();
          const color = TYPE_COLORS[key] || CHART_PALETTE[i % CHART_PALETTE.length];

          slices.push({
            color,
            startA,
            endA,
            meta: rows[i],
          });
        }

        return (
          <div key={emisor + idx} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm opacity-80">Emisor</div>
              <div className="text-sm opacity-80">Total</div>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-base font-medium">{emisor}</div>
              <div className="text-lg font-semibold">{total}</div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <PieChart size={160} thickness={40} slices={slices} />
              <div className="flex-1">
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{
                        backgroundColor:
                          TYPE_COLORS[(r.tipo || "").toUpperCase()] ||
                          CHART_PALETTE[i % CHART_PALETTE.length],
                      }}
                    />
                    <span className="opacity-80">{r.tipo}</span>
                    <span className="ml-auto font-medium">{r.total}</span>
                  </div>
                ))}
                <div className="mt-2 text-xs opacity-60">
                  {start} a {end}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
