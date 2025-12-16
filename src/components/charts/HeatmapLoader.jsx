"use client";
import dynamic from "next/dynamic";

const HeatmapHoraLlegadaLazy = dynamic(
  () => import("./SeriesChartsClient").then((m) => m.HeatmapHoraLlegadaClient),
  { ssr: false }
);

export default function HeatmapLoader({ series, start, end }) {
  return <HeatmapHoraLlegadaLazy series={series} start={start} end={end} />;
}
