import BitacoraGroupedView from "@/components/BitacoraGroupedView";
import { getBitacoraTableData } from "@/lib/bitacora";

function todayStr() {
  const now = new Date();
  return new Date(now).toISOString().slice(0, 10);
}

function normalizeDate(val, fallback) {
  const v = Array.isArray(val) ? val[0] : val;
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback;
}

export default async function Page(props) {
  const searchParams =
    props && props.searchParams ? await props.searchParams : {};
  const today = todayStr();
  const end = normalizeDate(searchParams?.endDate, today);
  const start = normalizeDate(searchParams?.startDate, today);

  const data = await getBitacoraTableData(start, end);

  return (
    <section className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bitácora</h1>
        <form className="flex gap-2" action="/bitacora" method="get">
          <input
            type="date"
            name="startDate"
            defaultValue={start}
            className="border rounded px-2 py-1"
          />
          <input
            type="date"
            name="endDate"
            defaultValue={end}
            className="border rounded px-2 py-1"
          />
          <button className="border rounded px-3 py-1 bg-gray-100">
            Filtrar
          </button>
        </form>
      </header>
      <BitacoraGroupedView data={data} />
    </section>
  );
}
