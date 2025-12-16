"use client";

import React from "react";
import { CHART_PALETTE, TYPE_COLORS } from "@/lib/chart-constants";

export function TiposSeriesChartClient({ data, start, end }) {
  const h = 320;
  const p = 32;
  const parse = (s) => {
    const [y, m, d] = String(s)
      .split("-")
      .map((n) => Number(n));
    return new Date(Date.UTC(y, m - 1, d));
  };
  const days = [];
  let cur = parse(start);
  const endD = parse(end);
  while (cur <= endD) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cur = new Date(cur.getTime() + 24 * 3600 * 1000);
  }
  const tipos = Array.from(new Set(data.map((r) => r.tipo || "(vacío)")));
  const series = tipos.map((t) => ({
    tipo: t,
    values: days.map((dia) => {
      const found = data.find(
        (r) => String(r.dia) === dia && (r.tipo || "(vacío)") === t
      );
      return found ? found.total : 0;
    }),
  }));
  const maxY = Math.max(1, ...series.flatMap((s) => s.values));
  const nx = Math.max(1, days.length);
  const vbw = Math.max(1200, nx * 160);
  const xPos = (i) => p + (i * (vbw - 2 * p)) / Math.max(1, nx - 1);
  const yPos = (v) => h - p - (v * (h - 2 * p)) / maxY;
  const grid = Array.from({ length: 4 }).map((_, i) => {
    const gv = Math.round((i + 1) * (maxY / 4));
    const y = yPos(gv);
    return (
      <line
        key={`g-${i}`}
        x1={p}
        y1={y}
        x2={vbw - p}
        y2={y}
        stroke="#e5e7eb"
        strokeWidth={1}
      />
    );
  });
  const labels = days.map((d, i) => (
    <text
      key={`x-${i}`}
      x={xPos(i)}
      y={h - p + 26}
      textAnchor="middle"
      fontSize="18"
      fontWeight="700"
      fill="#6b7280"
    >
      {String(d)}
    </text>
  ));
  const yLabels = Array.from({ length: 5 }).map((_, i) => {
    const gv = Math.round((i * maxY) / 4);
    const y = yPos(gv);
    return (
      <text
        key={`y-${i}`}
        x={p - 8}
        y={y + 5}
        textAnchor="end"
        fontSize="18"
        fontWeight="700"
        fill="#6b7280"
      >
        {gv}
      </text>
    );
  });
  const pathFor = (vals) => {
    const pts = vals.map((v, i) => ({ x: xPos(i), y: yPos(v) }));
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const dx = (p1.x - p0.x) / 3;
      const c1x = p0.x + dx;
      const c1y = p0.y;
      const c2x = p1.x - dx;
      const c2y = p1.y;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };
  return (
    <div className="rounded-lg border border-border p-4 w-full max-w-none">
      <svg width="100%" height={h} viewBox={`0 0 ${vbw} ${h}`} aria-hidden>
        <rect
          x={p}
          y={p}
          width={vbw - 2 * p}
          height={h - 2 * p}
          fill="none"
          stroke="#e5e7eb"
        />
        {grid}
        {series.map((s, i) => (
          <path
            key={`l-${i}`}
            d={pathFor(s.values)}
            fill="none"
            stroke={
              TYPE_COLORS[(s.tipo || "").toUpperCase()] ||
              CHART_PALETTE[i % CHART_PALETTE.length]
            }
            strokeWidth={4}
            strokeLinecap="round"
          />
        ))}
        {series.map((s, i) =>
          s.values.map((v, j) => (
            <g key={`c-${i}-${j}`} className="group">
              <circle
                cx={xPos(j)}
                cy={yPos(v)}
                r={10}
                fill={
                  TYPE_COLORS[(s.tipo || "").toUpperCase()] ||
                  CHART_PALETTE[i % CHART_PALETTE.length]
                }
                stroke="#ffffff"
                strokeWidth={2}
              />
              <text
                x={xPos(j)}
                y={yPos(v) - 26}
                textAnchor="middle"
                fontSize="26"
                fontWeight="800"
                fill="currentColor"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {v}
              </text>
            </g>
          ))
        )}
        {labels}
        {yLabels}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-4">
        {series.map((s, i) => (
          <div key={`leg-${i}`} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded"
              style={{
                backgroundColor:
                  TYPE_COLORS[(s.tipo || "").toUpperCase()] ||
                  CHART_PALETTE[i % CHART_PALETTE.length],
              }}
            />
            <span className="opacity-80">{s.tipo || "(vacío)"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MobileSeriesChartClient({ data, start, end }) {
  const h = 140;
  const p = 16;
  const parse = (s) => {
    const [y, m, d] = String(s)
      .split("-")
      .map((n) => Number(n));
    return new Date(Date.UTC(y, m - 1, d));
  };
  const days = [];
  let cur = parse(start);
  const endD = parse(end);
  while (cur <= endD) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cur = new Date(cur.getTime() + 24 * 3600 * 1000);
  }
  const tipos = Array.from(new Set(data.map((r) => r.tipo || "(vacío)")));
  const series = tipos.map((t, i) => ({
    tipo: t,
    color:
      TYPE_COLORS[(t || "").toUpperCase()] ||
      CHART_PALETTE[i % CHART_PALETTE.length],
    values: days.map((dia) => {
      const found = data.find(
        (r) => String(r.dia) === dia && (r.tipo || "(vacío)") === t
      );
      return found ? found.total : 0;
    }),
  }));
  const nx = Math.max(1, days.length);
  const vbw = Math.max(360, nx * 40);
  const xPos = (i) => p + (i * (vbw - 2 * p)) / Math.max(1, nx - 1);
  const yPos = (v, maxY) => h - p - (v * (h - 2 * p)) / Math.max(1, maxY);
  const pathFor = (vals, maxY) => {
    const pts = vals.map((v, i) => ({ x: xPos(i), y: yPos(v, maxY) }));
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const dx = (p1.x - p0.x) / 3;
      d += ` C ${p0.x + dx} ${p0.y}, ${p1.x - dx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };
  return (
    <div className="space-y-4">
      {series.map((s, idx) => {
        const maxY = Math.max(1, ...s.values);
        const last = s.values[s.values.length - 1] || 0;
        return (
          <div key={idx} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-medium">{s.tipo}</span>
              </div>
              <div className="text-sm opacity-80">
                Último: <span className="font-semibold">{last}</span>
              </div>
            </div>
            <svg
              width="100%"
              height={h}
              viewBox={`0 0 ${vbw} ${h}`}
              aria-hidden
              className="mt-2"
            >
              <rect
                x={p}
                y={p}
                width={vbw - 2 * p}
                height={h - 2 * p}
                fill="none"
                stroke="#e5e7eb"
              />
              <path
                d={pathFor(s.values, maxY)}
                fill="none"
                stroke={s.color}
                strokeWidth={4}
                strokeLinecap="round"
              />
            </svg>
            <div className="mt-1 text-xs opacity-60">
              {days[0]} a {days[days.length - 1]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StackedBarsByAsesorClient({ data, start, end }) {
  const h = 520;
  const p = 32;
  const tipos = Array.from(
    new Set(data.map((r) => (r.tipo || "").toUpperCase()))
  );
  const asesores = Array.from(new Set(data.map((r) => r.asesor || "(vacío)")));
  const totalsByAsesor = Object.fromEntries(
    asesores.map((a) => [
      a,
      data
        .filter((r) => (r.asesor || "(vacío)") === a)
        .reduce((acc, r) => acc + (r.total || 0), 0),
    ])
  );
  const maxY = Math.max(1, ...Object.values(totalsByAsesor));
  const nx = Math.max(1, asesores.length);
  const vbw = Math.max(800, nx * 160);
  const BAR_W = Math.max(48, ((vbw - 2 * p) / nx) * 0.6);
  const xPos = (i) => p + (i + 0.5) * ((vbw - 2 * p) / nx);
  const yPos = (v) => h - p - (v * (h - 2 * p)) / maxY;
  const TYPE_COLORS = {
    COTIZACION: "#3892ff",
    EMISION: "#04e995",
    CANCELACION: "#fbbf24",
    REEXPEDICION: "#f87171",
    REEXPEDICON: "#f87171",
    ENDOSO: "#c27aff",
  };
  const colorFor = (t, i) =>
    TYPE_COLORS[t] || CHART_PALETTE[i % CHART_PALETTE.length];
  const stackedRects = asesores.map((a, ai) => {
    const bucket = tipos.map((t) => {
      const found = data.find(
        (r) =>
          (r.asesor || "(vacío)") === a && (r.tipo || "").toUpperCase() === t
      );
      return { tipo: t, total: found ? found.total : 0 };
    });
    let acc = 0;
    const rects = bucket.map((b, bi) => {
      const y2 = yPos(acc + b.total);
      const y1 = yPos(acc);
      acc += b.total;
      return (
        <rect
          key={`rect-${ai}-${bi}`}
          x={xPos(ai) - BAR_W / 2}
          y={y2}
          width={BAR_W}
          height={Math.max(0, y1 - y2)}
          fill={colorFor(b.tipo, bi)}
        />
      );
    });
    const total = totalsByAsesor[a] || 0;
    return (
      <g key={`bar-${ai}`}>
        {rects}
        <text
          x={xPos(ai)}
          y={yPos(total) - 12}
          textAnchor="middle"
          fontSize="28"
          fontWeight="900"
          fill="#111827"
        >
          {total}
        </text>
      </g>
    );
  });
  const labels = asesores.map((a, ai) => (
    <text
      key={`lab-${ai}`}
      x={xPos(ai)}
      y={h - p + 48}
      textAnchor="end"
      fontSize="24"
      fontWeight="800"
      fill="#111827"
      transform={`rotate(-45 ${xPos(ai)} ${h - p + 48})`}
    >
      {a}
    </text>
  ));
  return (
    <div className="rounded-lg border border-border p-4 w-full max-w-none">
      <svg width="100%" height={h} viewBox={`0 0 ${vbw} ${h}`} aria-hidden>
        <rect
          x={p}
          y={p}
          width={vbw - 2 * p}
          height={h - 2 * p}
          fill="none"
          stroke="#e5e7eb"
        />
        {stackedRects}
        {labels}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-4">
        {tipos.map((t, i) => (
          <div key={`leg-${i}`} className="flex items-center gap-2 text-xl">
            <span
              className="inline-block h-4 w-4 rounded"
              style={{ backgroundColor: colorFor(t, i) }}
            />
            <span className="opacity-80">{t || "(vacío)"}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 text-sm opacity-60">
        {start} a {end}
      </div>
    </div>
  );
}

export function HorizontalBarsByAsesorClient({ data, start, end }) {
  const p = 0;
  const LBL = 220;
  const laneH = 36;
  const gap = 12;
  const tipos = Array.from(
    new Set(data.map((r) => (r.tipo || "").toUpperCase()))
  );
  const asesores = Array.from(new Set(data.map((r) => r.asesor || "(vacío)")));
  const totalsByAsesor = Object.fromEntries(
    asesores.map((a) => [
      a,
      data
        .filter((r) => (r.asesor || "(vacío)") === a)
        .reduce((acc, r) => acc + (r.total || 0), 0),
    ])
  );
  const sortedAsesores = [...asesores].sort(
    (a, b) => (totalsByAsesor[b] || 0) - (totalsByAsesor[a] || 0)
  );
  const maxTotal = Math.max(
    1,
    ...sortedAsesores.map((a) => totalsByAsesor[a] || 0)
  );
  const nx = Math.max(1, sortedAsesores.length);
  const vbw = 1400;
  const W = vbw - 2 * p - LBL;
  const h = p + nx * (laneH + gap) - gap + p;
  const svgH = h;
  const colorFor = (t, i) =>
    TYPE_COLORS[t] || CHART_PALETTE[i % CHART_PALETTE.length];
  const lanes = sortedAsesores.map((a, ai) => {
    const y = p + ai * (laneH + gap);
    const x0 = p + LBL;
    const bucket = tipos.map((t) => {
      const found = data.find(
        (r) =>
          (r.asesor || "(vacío)") === a && (r.tipo || "").toUpperCase() === t
      );
      return { tipo: t, total: found ? found.total : 0 };
    });
    const total = totalsByAsesor[a] || 0;
    let xCur = x0;
    const rects = bucket.map((b, bi) => {
      const wSeg = W * (b.total / maxTotal);
      const r = (
        <rect
          key={`hrect-${ai}-${bi}`}
          x={xCur}
          y={y}
          width={Math.max(0, wSeg)}
          height={laneH}
          fill={colorFor(b.tipo, bi)}
        />
      );
      xCur += Math.max(0, wSeg);
      return r;
    });
    return (
      <g key={`hlane-${ai}`}>
        <text
          x={x0 - 8}
          y={y + laneH / 2}
          textAnchor="end"
          fontSize="16"
          fontWeight="700"
          fill="currentColor"
          dominantBaseline="middle"
        >
          {typeof a === "string" && a.length > 12 ? `${a.slice(0, 12)}...` : a}
        </text>
        {rects}
        <text
          x={x0 + W + 10}
          y={y + laneH / 2}
          textAnchor="start"
          fontSize="16"
          fontWeight="700"
          fill="currentColor"
          dominantBaseline="middle"
        >
          {total}
        </text>
      </g>
    );
  });
  return (
    <div className="rounded-lg border border-border p-0 w-full max-w-none">
      <svg
        width="100%"
        height={svgH}
        viewBox={`0 0 ${vbw} ${svgH}`}
        aria-hidden
        className="text-foreground"
      >
        <rect
          x={p + LBL}
          y={p}
          width={vbw - 2 * p - LBL}
          height={svgH - 2 * p}
          fill="none"
          stroke="#e5e7eb"
        />
        {lanes}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {tipos.map((t, i) => (
          <div key={`leg-h-${i}`} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded"
              style={{ backgroundColor: colorFor(t, i) }}
            />
            <span className="opacity-80">{t || "(vacío)"}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 text-sm opacity-60">
        {start} a {end}
      </div>
    </div>
  );
}

export function FlexBarsByAsesorClient({ data, start, end }) {
  const tipos = Array.from(
    new Set(data.map((r) => (r.tipo || "").toUpperCase()))
  );
  const asesores = Array.from(new Set(data.map((r) => r.asesor || "(vacío)")));
  const totalsByAsesor = Object.fromEntries(
    asesores.map((a) => [
      a,
      data
        .filter((r) => (r.asesor || "(vacío)") === a)
        .reduce((acc, r) => acc + (r.total || 0), 0),
    ])
  );
  const sortedAsesores = [...asesores].sort(
    (a, b) => (totalsByAsesor[b] || 0) - (totalsByAsesor[a] || 0)
  );
  const maxTotal = Math.max(
    1,
    ...sortedAsesores.map((a) => totalsByAsesor[a] || 0)
  );
  const colorFor = (t, i) =>
    TYPE_COLORS[t] || CHART_PALETTE[i % CHART_PALETTE.length];
  return (
    <div className="rounded-lg border border-border p-4 w-full">
      <div className="space-y-2">
        {sortedAsesores.map((a, ai) => {
          const segments = tipos.map((t, ti) => {
            const found = data.find(
              (r) =>
                (r.asesor || "(vacío)") === a &&
                (r.tipo || "").toUpperCase() === t
            );
            const val = found ? found.total : 0;
            const pct = maxTotal ? (val / maxTotal) * 100 : 0;
            return { t, val, pct, color: colorFor(t, ti) };
          });
          const total = totalsByAsesor[a] || 0;
          const barPct = Math.min(
            100,
            Math.round(40 + 60 * (total / maxTotal))
          );
          const label =
            typeof a === "string" && a.length > 12 ? `${a.slice(0, 12)}...` : a;
          return (
            <div key={`row-${ai}`} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-right text-sm font-semibold text-foreground">
                {label}
              </div>
              <div
                className="h-6 rounded overflow-hidden border border-border bg-background"
                style={{ width: `${barPct}%` }}
              >
                <div className="flex h-full">
                  {segments.map((s, si) => (
                    <div
                      key={`seg-${ai}-${si}`}
                      className="h-full"
                      style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                      aria-label={`${s.t}: ${s.val}`}
                      title={`${s.t}: ${s.val}`}
                    />
                  ))}
                </div>
              </div>
              <div className="w-16 text-left text-sm font-semibold text-foreground">
                {total}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {tipos.map((t, i) => (
          <div
            key={`leg-flex-${i}`}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className="inline-block h-3 w-3 rounded"
              style={{ backgroundColor: colorFor(t, i) }}
            />
            <span className="opacity-80">{t || "(vacío)"}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 text-xs opacity-60">
        {start} a {end}
      </div>
    </div>
  );
}

export function PieTiposClient({ data }) {
  const size = 220;
  const thickness = 60;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const r0 = r - thickness;
  const total = data.reduce((a, b) => a + (b.total || 0), 0) || 1;
  const TYPE_COLORS = {
    COTIZACION: "#3892ff",
    EMISION: "#04e995",
    CANCELACION: "#fbbf24",
    REEXPEDICION: "#f87171",
    REEXPEDICON: "#f87171",
    ENDOSO: "#c27aff",
  };
  const slices = data.map((d, i) => ({
    color:
      TYPE_COLORS[(d.tipo || "").toUpperCase()] ||
      CHART_PALETTE[i % CHART_PALETTE.length],
    pct: total ? (d.total || 0) / total : 0,
    meta: d,
  }));
  let acc = 0;
  const toXY = (radius, angle) => [
    cx + radius * Math.cos(angle),
    cy + radius * Math.sin(angle),
  ];
  const paths = slices.map((s, i) => {
    const startA = acc * 2 * Math.PI - Math.PI / 2;
    const endA = (acc + s.pct) * 2 * Math.PI - Math.PI / 2;
    acc += s.pct;
    const [x1o, y1o] = toXY(r, startA);
    const [x2o, y2o] = toXY(r, endA);
    const [x2i, y2i] = toXY(r0, endA);
    const [x1i, y1i] = toXY(r0, startA);
    const large = endA - startA > Math.PI ? 1 : 0;
    const d = `M ${x1o} ${y1o} A ${r} ${r} 0 ${large} 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${r0} ${r0} 0 ${large} 0 ${x1i} ${y1i} Z`;
    return <path key={i} d={d} fill={s.color} />;
  });
  return (
    <div className="rounded-lg border border-border p-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        className="mx-auto"
      >
        {paths}
      </svg>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {data.map((d, i) => (
          <div key={`leg-t-${i}`} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded"
              style={{
                backgroundColor:
                  TYPE_COLORS[(d.tipo || "").toUpperCase()] ||
                  CHART_PALETTE[i % CHART_PALETTE.length],
              }}
            />
            <span className="opacity-80">{d.tipo || "(vacío)"}</span>
            <span className="ml-auto font-medium">{d.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeatmapHoraLlegadaClient({ series, start, end }) {
  const p = 16;
  const cell = 40;
  const gap = 6;
  const parse = (s) => {
    const [y, m, d] = String(s)
      .split("-")
      .map((n) => Number(n));
    return new Date(Date.UTC(y, m - 1, d));
  };
  const days = [];
  let cur = parse(start);
  const endD = parse(end);
  while (cur <= endD) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cur = new Date(cur.getTime() + 24 * 3600 * 1000);
  }
  const [sel, setSel] = React.useState(days[0] || start);
  const hours = Array.from({ length: 12 }).map((_, i) => i + 8);
  const counts = hours.map((h) => {
    const found = series.find(
      (r) => String(r.dia) === sel && Number(r.hora) === h
    );
    return found ? found.total : 0;
  });
  const maxC = Math.max(1, ...counts);
  const w = p + hours.length * (cell + gap) - gap + p;
  const ch = 200;
  const h = p + ch + 24 + p;
  const yPos = (v) => p + ch - Math.round((v * ch) / maxC);
  const colorFor = (v) => {
    const t = v / maxC;
    const base = [56, 146, 255];
    const r = Math.round(base[0] * (0.5 + 0.5 * t));
    const g = Math.round(base[1] * (0.5 + 0.5 * t));
    const b = Math.round(base[2] * (0.5 + 0.5 * t));
    return `rgb(${r},${g},${b})`;
  };
  const bars = hours.map((hr, i) => {
    const x = p + i * (cell + gap);
    const y = yPos(counts[i]);
    const height = Math.max(0, p + ch - y);
    return (
      <rect
        key={`bar-${hr}`}
        x={x}
        y={y}
        width={cell}
        height={height}
        fill={colorFor(counts[i])}
      />
    );
  });
  const labels = hours.map((hr, i) => (
    <text
      key={`lbl-${hr}`}
      x={p + i * (cell + gap) + cell / 2}
      y={p + ch + 16}
      textAnchor="middle"
      fontSize="11"
      fill="currentColor"
    >
      {hr}
    </text>
  ));
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <label htmlFor="hm-date" className="text-sm opacity-80">
          Fecha
        </label>
        <select
          id="hm-date"
          className="h-9 rounded border border-border bg-white/10 backdrop-blur-md px-2 text-sm text-foreground focus:outline-none"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
        >
          {days.map((d) => (
            <option key={d} value={d} className="bg-background text-foreground">
              {d}
            </option>
          ))}
        </select>
      </div>
      <svg
        width="100%"
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden
        className="mt-3 text-foreground"
      >
        <rect
          x={p}
          y={p}
          width={w - 2 * p}
          height={ch}
          fill="none"
          stroke="#e5e7eb"
        />
        {bars}
        {labels}
      </svg>
    </div>
  );
}
