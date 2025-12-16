"use client";
import dynamic from "next/dynamic";

const TiposSeriesChartLazy = dynamic(
  () => import("./SeriesChartsClient").then((m) => m.TiposSeriesChartClient),
  { ssr: false }
);

const MobileSeriesChartLazy = dynamic(
  () => import("./SeriesChartsClient").then((m) => m.MobileSeriesChartClient),
  { ssr: false }
);

export default function ChartsLoader({ data, start, end }) {
  return (
    <>
      <div className="sm:hidden">
        <MobileSeriesChartLazy data={data} start={start} end={end} />
      </div>
      <div className="hidden sm:block">
        <TiposSeriesChartLazy data={data} start={start} end={end} />
      </div>
    </>
  );
}
