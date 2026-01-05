import { auth } from "@/../auth";
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
import { isAdminArea } from "@/lib/roles";
import ChartsLoader from "@/components/charts/ChartsLoader";
import BarsLoader from "@/components/charts/BarsLoader";
import TypesPieLoader from "@/components/charts/TypesPieLoader";
import HeatmapLoader from "@/components/charts/HeatmapLoader";
import EmisorCharts from "@/components/charts/EmisorCharts";
import RenovacionesCharts from "@/components/charts/RenovacionesCharts";
import { getRenovacionesStats, getRenovacionesByMes } from "@/lib/renovaciones";
import { getIngresosStats } from "@/lib/ingresos";
import IngresosDashboard from "@/components/charts/IngresosDashboard";

// Components & Utils
import DateFilter from "@/components/dashboard/DateFilter";
import StatsGrid from "@/components/dashboard/StatsGrid";
import {
  getDateRange,
  getSelectedTypes,
  filterBySelectedTypes
} from "@/lib/dashboard-utils";

export default async function Home(props) {
  const session = await auth();

  // Authorization check
  if (!session) {
    redirect("/auth/sign-in");
  }

  // Parse parameters
  const searchParams = props?.searchParams ? await props.searchParams : {};
  const { start, end, isSingleDay } = getDateRange(searchParams);
  const dbReady = isDbConfigured();

  // Data Fetching
  const [
    stats,
    emisorTipo,
    tiposSerie,
    asesorTipo,
    tiposTotals,
    horaLlegadaSeries,
    renovacionesStats,
    renovacionesByMes,
    ingresosStats
  ] = session && dbReady ? await Promise.all([
    getBitacoraStatsByTipo(start, end),
    getBitacoraByEmisorTipo(start, end),
    !isSingleDay ? getTiposSeriePorDia(start, end) : [],
    getBitacoraByAsesorTipo(start, end),
    getTiposTotals(start, end),
    getHoraLlegadaSeries(start, end),
    getRenovacionesStats(),
    getRenovacionesByMes(),
    getIngresosStats(start, end)
  ]) : [[], [], [], [], [], [], [], [], { byStatus: [], byCompania: [], byAsesor: [] }];

  // View Filtering
  const selectedTipos = getSelectedTypes(searchParams);
  const emisorTipoView = filterBySelectedTypes(emisorTipo, selectedTipos);
  const tiposSerieView = filterBySelectedTypes(tiposSerie, selectedTipos);
  const asesorTipoView = filterBySelectedTypes(asesorTipo, selectedTipos);
  const tiposTotalsView = filterBySelectedTypes(tiposTotals, selectedTipos);

  const showEmisorCharts = isAdminArea(session);

  return (
    <div className="py-6">
      <main className="container-responsive px-4 sm:px-6">
        <h1 className="text-center">Balance general</h1>

        <div className="mt-8">
          {/* Date Filter */}
          <DateFilter start={start} end={end} />

          <h2 className="mt-4 text-xl font-semibold">
            Actividad por tipo (rango seleccionado)
          </h2>

          {!dbReady ? (
            <p className="mt-2 opacity-80">
              Configura DATABASE_URL para consultar la base de datos.
            </p>
          ) : (
            <StatsGrid
              stats={stats}
              selectedTipos={selectedTipos}
              start={start}
              end={end}
            />
          )}

          {/* Emisor Charts */}
          {showEmisorCharts && (
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
          )}

          {/* Detailed Analysis */}
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

          {/* Daily Evolution */}
          {!isSingleDay && (
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
          )}

          {/* Ingresos Dashboard Section */}
          {dbReady && (
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-6">Tablero de Ingresos</h2>
              <IngresosDashboard stats={ingresosStats} />
            </div>
          )}

          {/* Renovaciones Section */}
          {dbReady && (
            <RenovacionesCharts
              stats={renovacionesStats}
              byMes={renovacionesByMes}
            />
          )}
        </div>
      </main>
    </div>
  );
}
