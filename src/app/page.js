import Link from "next/link";
import { auth, signIn } from "@/../auth";
import { redirect } from "next/navigation";
import {
  getBitacoraStatsByTipo,
  getBitacoraByEmisorTipo,
  getTiposSeriePorDia,
  getBitacoraByAsesorTipo,
  getTiposTotals,
  getHoraLlegadaSeries,
} from "@/lib/bitacora";
import { isDbConfigured } from "@/lib/db";
import ChartsLoader from "@/components/charts/ChartsLoader";
import BarsLoader from "@/components/charts/BarsLoader";
import TypesPieLoader from "@/components/charts/TypesPieLoader";
import HeatmapLoader from "@/components/charts/HeatmapLoader";
import EmisorCharts from "@/components/charts/EmisorCharts";

export default async function Home(props) {
  const session = await auth();

  // Si no hay sesión, redirigir al login
  if (!session) {
    redirect("/auth/sign-in");
  }

  const searchParams =
    props && props.searchParams ? await props.searchParams : {};
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defaultStart = thirtyDaysAgo.toISOString().slice(0, 10);
  const rawStart = searchParams && searchParams.start;
  const rawEnd = searchParams && searchParams.end;
  const normalize = (val, fallback) => {
    const v = Array.isArray(val) ? val[0] : val;
    return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)
      ? v
      : fallback;
  };
  let start = normalize(rawStart, defaultStart);
  let end = normalize(rawEnd, today);
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  const isSingleDay = start === end;
  const dbReady = isDbConfigured();
  const stats =
    session && dbReady ? await getBitacoraStatsByTipo(start, end) : [];
  const emisorTipo =
    session && dbReady ? await getBitacoraByEmisorTipo(start, end) : [];
  const tiposSerie =
    session && dbReady && !isSingleDay
      ? await getTiposSeriePorDia(start, end)
      : [];
  const asesorTipo =
    session && dbReady ? await getBitacoraByAsesorTipo(start, end) : [];
  const tiposTotals =
    session && dbReady ? await getTiposTotals(start, end) : [];
  const horaLlegadaSeries =
    session && dbReady ? await getHoraLlegadaSeries(start, end) : [];

  const rawTipos = searchParams.tipo;
  const tiposArray = Array.isArray(rawTipos)
    ? rawTipos
    : rawTipos
    ? [rawTipos]
    : [];
  const selectedTipos = new Set(tiposArray.map((t) => String(t).toUpperCase()));
  const emisorTipoView =
    selectedTipos.size > 0
      ? emisorTipo.filter((r) =>
          selectedTipos.has(String(r.tipo || "").toUpperCase())
        )
      : emisorTipo;
  const tiposSerieView =
    selectedTipos.size > 0
      ? tiposSerie.filter((r) =>
          selectedTipos.has(String(r.tipo || "").toUpperCase())
        )
      : tiposSerie;
  const asesorTipoView =
    selectedTipos.size > 0
      ? asesorTipo.filter((r) =>
          selectedTipos.has(String(r.tipo || "").toUpperCase())
        )
      : asesorTipo;
  const tiposTotalsView =
    selectedTipos.size > 0
      ? tiposTotals.filter((r) =>
          selectedTipos.has(String(r.tipo || "").toUpperCase())
        )
      : tiposTotals;

  function hrefToggleTipo(tipo) {
    const key = String(tipo || "").toUpperCase();
    const next = new Set(selectedTipos);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    const params = new URLSearchParams();
    params.set("start", start);
    params.set("end", end);
    for (const v of Array.from(next)) params.append("tipo", v);
    const qs = params.toString();
    return `/?${qs}`;
  }

  return (
    <div className="py-6">
      <main className="container-responsive px-4 sm:px-6">
        <h1 className="text-balance">CERTEZA App</h1>
        <p className="mt-4">
          Hola, {session.user?.name || session.user?.email} (
          {session.user?.email})
        </p>
        <p className="mt-2">
          Roles: {(session.user?.roles || []).join(", ") || "sin roles"}
        </p>

        <div className="mt-8">
          <form
            method="get"
            className="mt-2 flex flex-col sm:flex-row flex-wrap sm:items-end items-center justify-center gap-3"
          >
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label htmlFor="start" className="text-sm opacity-80">
                Desde
              </label>
              <input
                id="start"
                name="start"
                type="date"
                defaultValue={start}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label htmlFor="end" className="text-sm opacity-80">
                Hasta
              </label>
              <input
                id="end"
                name="end"
                type="date"
                defaultValue={end}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-sm opacity-0 select-none">Aplicar</label>
              <button type="submit" className="btn-secondary h-10">
                Aplicar
              </button>
            </div>
          </form>
          <h2 className="mt-4 text-xl font-semibold">
            Actividad por tipo (rango seleccionado)
          </h2>
          {!dbReady ? (
            <p className="mt-2 opacity-80">
              Configura DATABASE_URL para consultar la base de datos.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {stats.length === 0 ? (
                <div className="rounded-lg border border-border p-4">
                  <p className="opacity-80">
                    Sin registros para el rango seleccionado.
                  </p>
                </div>
              ) : (
                stats.map((s) => (
                  <Link
                    key={s.tipo}
                    href={hrefToggleTipo(s.tipo)}
                    className={`surface surface-type p-3 w-full ${
                      selectedTipos.has(String(s.tipo || "").toUpperCase())
                        ? "ring-2 ring-accent"
                        : "opacity-60"
                    }`}
                    data-type={(s.tipo || "").toUpperCase()}
                    role="button"
                    aria-pressed={selectedTipos.has(
                      String(s.tipo || "").toUpperCase()
                    )}
                    aria-label={`Filtrar por tipo ${(
                      s.tipo || "(vacío)"
                    ).toString()}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs opacity-80">Tipo</div>
                      <div className="text-xs opacity-80">Registros</div>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {s.tipo || "(vacío)"}
                      </div>
                      <div className="text-base font-semibold">{s.total}</div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
          <div className="mt-10">
            <h2 className="text-xl font-semibold">Actividad por emisor</h2>
            {!dbReady ? (
              <p className="mt-2 opacity-80">
                Configura DATABASE_URL para consultar la base de datos.
              </p>
            ) : (
              <EmisorCharts data={emisorTipoView} start={start} end={end} />
            )}
          </div>
          <div className="mt-10">
            <h2 className="text-xl font-semibold">Análisis detallado</h2>
            {!dbReady ? (
              <p className="mt-2 opacity-80">
                Configura DATABASE_URL para consultar la base de datos.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold">
                    Actividad por asesor
                  </h3>
                  <BarsLoader data={asesorTipoView} start={start} end={end} />
                </div>
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Distribución global por tipo
                    </h3>
                    <TypesPieLoader data={tiposTotalsView} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Horas de llegada (08–19)
                    </h3>
                    <HeatmapLoader
                      series={horaLlegadaSeries}
                      start={start}
                      end={end}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          {!isSingleDay ? (
            <div className="mt-10">
              <h2 className="text-xl font-semibold">
                Evolución diaria por tipo
              </h2>
              {!dbReady ? (
                <p className="mt-2 opacity-80">
                  Configura DATABASE_URL para consultar la base de datos.
                </p>
              ) : (
                <ChartsLoader data={tiposSerieView} start={start} end={end} />
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
