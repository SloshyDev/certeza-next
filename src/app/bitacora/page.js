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
        <form
          className="flex flex-col sm:flex-row gap-3 w-full md:w-auto"
          action="/bitacora"
          method="get"
        >
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="date"
              name="startDate"
              defaultValue={start}
              className="flex-1 sm:w-auto h-10 rounded-lg border border-border bg-white/10 backdrop-blur-md px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
            <input
              type="date"
              name="endDate"
              defaultValue={end}
              className="flex-1 sm:w-auto h-10 rounded-lg border border-border bg-white/10 backdrop-blur-md px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:w-auto h-10 px-4 rounded-lg bg-gray-800 text-white hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors shadow-sm text-sm font-medium flex items-center justify-center gap-2">
              <FunnelIcon className="h-4 w-4" />
              Filtrar
            </button>
            <Link
              href="/bitacora"
              className="flex-1 sm:w-auto h-10 px-4 rounded-lg bg-gray-500 text-white hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors shadow-sm text-sm font-medium flex items-center justify-center gap-2"
            >
              <XMarkIcon className="h-4 w-4" />
              Limpiar
            </Link>
          </div>
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
