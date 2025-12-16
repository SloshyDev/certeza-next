"use client";
import dynamic from "next/dynamic";

const FlexBarsByAsesorLazy = dynamic(
  () => import("./SeriesChartsClient").then((m) => m.FlexBarsByAsesorClient),
  { ssr: false }
);

export default function BarsLoader({ data, start, end }) {
  return <FlexBarsByAsesorLazy data={data} start={start} end={end} />;
}
