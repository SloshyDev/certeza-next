"use client";
import dynamic from "next/dynamic";

const PieTiposLazy = dynamic(
  () => import("./SeriesChartsClient").then((m) => m.PieTiposClient),
  { ssr: false }
);

export default function TypesPieLoader({ data }) {
  return <PieTiposLazy data={data} />;
}
