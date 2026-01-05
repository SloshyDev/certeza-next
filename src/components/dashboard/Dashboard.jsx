// src/components/dashboard/Dashboard.jsx
import { isDbConfigured } from "@/lib/db";
import { isAdminArea } from "@/lib/roles";
import ChartsLoader from "@/components/charts/ChartsLoader";
import BarsLoader from "@/components/charts/BarsLoader";
import TypesPieLoader from "@/components/charts/TypesPieLoader";
import HeatmapLoader from "@/components/charts/HeatmapLoader";
import EmisorCharts from "@/components/charts/EmisorCharts";
import RenovacionesCharts from "@/components/charts/RenovacionesCharts";
import IngresosDashboard from "@/components/charts/IngresosDashboard";
import DashboardSection from "./DashboardSection";
import DateFilter from "./DateFilter";
import StatsGrid from "./StatsGrid";

export default function Dashboard({
  session,
  start,
  end,
  isSingleDay,
  dbReady,
  stats,
  emisorTipoView,
  tiposSerieView,
  asesorTipoView,
  tiposTotalsView,
  horaLlegadaSeries,
  renovacionesStats,
  renovacionesByMes,
  ingresosStats,
  selectedTipos,
}) {
  const showEmisorCharts = isAdminArea(session);

  return (
    <div className="py-6">
      <main className="container-responsive px-4 sm:px-6">
        <h1 className="text-center">Balance general</h1>

        <div className="mt-8">
          <DateFilter start={start} end={end} />
          <DashboardSection title="Actividad por tipo (rango seleccionado)">
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
          </DashboardSection>

          {showEmisorCharts && (
            <DashboardSection title="Actividad por emisor">
              {!dbReady ? (
                <p className="mt-2 opacity-80">
                  Configura DATABASE_URL para consultar la base de datos.
                </p>
              ) : (
                <EmisorCharts
                  data={emisorTipoView}
                  start={start}
                  end={end}
                />
              )}
            </DashboardSection>
          )}

          <DashboardSection title="Análisis detallado">
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
          </DashboardSection>

          {!isSingleDay && (
            <DashboardSection title="Evolución diaria por tipo">
              {!dbReady ? (
                <p className="mt-2 opacity-80">
                  Configura DATABASE_URL para consultar la base de datos.
                </p>
              ) : (
                <ChartsLoader data={tiposSerieView} start={start} end={end} />
              )}
            </DashboardSection>
          )}

          {dbReady && (
            <DashboardSection title="Tablero de Ingresos">
              <IngresosDashboard stats={ingresosStats} />
            </DashboardSection>
          )}

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