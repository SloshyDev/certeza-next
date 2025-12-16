"use client";
import dynamic from "next/dynamic";

const HeatmapHoraLlegadaLazy = dynamic(
  () => import("./SeriesChartsClient").then((m) => m.HeatmapHoraLlegadaClient),
  { ssr: false }
);

export default function HeatmapLoader({ data, series, start, end }) {
  return <HeatmapHoraLlegadaLazy series={series || data} start={start} end={end} />;
}
