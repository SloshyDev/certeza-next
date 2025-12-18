import BitacoraGroupedView from "@/components/BitacoraGroupedView";
import { getBitacoraTableData } from "@/lib/bitacora";
import { auth } from "@/../auth";
import { hasRole } from "@/lib/roles";
import AddBitacoraButton from "@/components/AddBitacoraButton";
import ExportBitacoraButton from "@/components/ExportBitacoraButton";
import { redirect } from "next/navigation";
import Link from "next/link";
import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";

function todayStr() {
  const now = new Date();
  return new Date(now).toISOString().slice(0, 10);
}

function normalizeDate(val, fallback) {
  const v = Array.isArray(val) ? val[0] : val;
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback;
}

export default async function Page(props) {
  const session = await auth();

  // Si no hay sesión, redirigir al login
  if (!session) {
    redirect("/auth/sign-in");
  }
  const searchParams =
    props && props.searchParams ? await props.searchParams : {};
  const today = todayStr();
  const end = normalizeDate(searchParams?.endDate, today);
  const start = normalizeDate(searchParams?.startDate, today);

  const data = await getBitacoraTableData(start, end);
  const canDelete = !!session && hasRole(session, ["admin"]);
  const canCreate = !!session && hasRole(session, ["admin", "editor"]);
  const canEdit = !!session && hasRole(session, ["admin", "editor"]);

  return (
    <section className="p-4 space-y-6 overflow-visible min-h-screen">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
          <h1 className="text-2xl font-bold text-foreground">Bitácora</h1>
          {canCreate ? <AddBitacoraButton /> : null}
        </div>
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
      <BitacoraGroupedView
        data={data}
        start={start}
        end={end}
        canDelete={canDelete}
        canCreate={canCreate}
        canEdit={canEdit}
      />
    </section>
  );
}
