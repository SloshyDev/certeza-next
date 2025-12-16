import React from "react";

export default function PieChart({ size = 200, thickness = 50, slices = [] }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const r0 = r - thickness;

  const toXY = (radius, angle) => [
    cx + radius * Math.cos(angle),
    cy + radius * Math.sin(angle),
  ];

  const paths = slices.map((s, i) => {
    // Calcular coordenadas
    const [x1o, y1o] = toXY(r, s.startA);
    const [x2o, y2o] = toXY(r, s.endA);
    const [x2i, y2i] = toXY(r0, s.endA);
    const [x1i, y1i] = toXY(r0, s.startA);

    // Determinar flag de arco grande
    const large = s.endA - s.startA > Math.PI ? 1 : 0;

    // Construir path SVG
    // M: Move to start outer
    // A: Arc to end outer
    // L: Line to end inner
    // A: Arc to start inner (reverse direction)
    // Z: Close path
    const d = `M ${x1o} ${y1o} A ${r} ${r} 0 ${large} 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${r0} ${r0} 0 ${large} 0 ${x1i} ${y1i} Z`;

    return <path key={i} d={d} fill={s.color} />;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {paths}
    </svg>
  );
}
