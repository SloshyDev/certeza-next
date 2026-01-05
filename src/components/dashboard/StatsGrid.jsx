// src/components/dashboard/StatsGrid.jsx
import Link from "next/link";

function hrefToggleTipo(tipo, selectedTipos, start, end) {
  const key = String(tipo || "").toUpperCase();
  const next = new Set(selectedTipos);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  const params = new URLSearchParams();
  params.set("start", start);
  params.set("end", end);
  for (const v of Array.from(next)) {
    params.append("tipo", v);
  }
  const qs = params.toString();
  return `/?${qs}`;
}

export default function StatsGrid({ stats, selectedTipos, start, end }) {
  if (stats.length === 0) {
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="opacity-80">
          Sin registros para el rango seleccionado.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
      {stats.map((s) => (
        <Link
          key={s.tipo}
          href={hrefToggleTipo(s.tipo, selectedTipos, start, end)}
          className={`surface surface-type p-3 w-full ${
            selectedTipos.size === 0 ||
            !selectedTipos.has(String(s.tipo || "").toUpperCase())
              ? "ring-2 ring-accent"
              : "opacity-60"
          }`}
          data-type={(s.tipo || "").toUpperCase()}
          data-selected={
            selectedTipos.size === 0 ||
            !selectedTipos.has(String(s.tipo || "").toUpperCase())
              ? "true"
              : "false"
          }
          role="button"
          aria-pressed={
            selectedTipos.size === 0 ||
            !selectedTipos.has(String(s.tipo || "").toUpperCase())
          }
          aria-label={`Filtrar por tipo ${(s.tipo || "(vacío)").toString()}`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-80">Tipo</div>
            <div className="text-xs opacity-80">Registros</div>
          </div>
          <div className="mt-0.5 flex items-center justify-between">
            <div className="text-sm font-medium">{s.tipo || "(vacío)"}</div>
            <div className="text-base font-semibold">{s.total}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}