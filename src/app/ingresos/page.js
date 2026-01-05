import { auth } from "@/../auth";
import IngresosTable from "@/components/tables/IngresosTable";
import { getIngresosTableData } from "@/lib/ingresos";
import { listAsesores } from "@/lib/asesor";
import { isAdminArea, canEditMesaVales } from "@/lib/roles";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, TableCellsIcon } from "@heroicons/react/24/outline";
import CreateIngresoButton from "@/components/ingresos/CreateIngresoButton";

export const dynamic = "force-dynamic";



export default async function Page(props) {
    const searchParams = await props.searchParams;
    const session = await auth();
    if (!session) {
        redirect("/");
    }

    const canEdit = canEditMesaVales(session);

    // Optional date filtering
    // If startDate/endDate provided in params, use them. Otherwise undefined.
    // getIngresosTableData handles undefined by returning all records (or limiting by other filters)
    const start = searchParams?.startDate || undefined;
    const end = searchParams?.endDate || undefined;

    // Filters
    const asesor = searchParams?.asesor || "";
    const folio = searchParams?.folio || "";
    const poliza = searchParams?.poliza || "";
    const compania = searchParams?.compania || "";
    const estatus = searchParams?.estatus || "";
    const solicitud = searchParams?.solicitud || "";

    const [data, asesores] = await Promise.all([
        getIngresosTableData(start, end, {
            asesor,
            folio,
            poliza,
            compania,
            estatus,
            solicitud,
        }),
        listAsesores()
    ]);

    // Construct query string for export
    const queryParams = new URLSearchParams({
        startDate: start,
        endDate: end,
        asesor,
        folio,
        poliza,
        compania,
        estatus,
        solicitud,
    }).toString();

    return (
        <div className="py-6 px-4 sm:px-6 relative min-h-screen pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold">Ingresos</h1>
                        {canEdit && <CreateIngresoButton asesores={asesores} />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Visualización de ingresos y estatus
                    </p>
                </div>
                <Link href="/" className="btn-secondary gap-2 self-start sm:self-auto">
                    <ArrowLeftIcon className="w-4 h-4" />
                    Volver
                </Link>
            </div>

            <div className="bg-card rounded-lg border border-border p-4 mb-6">
                <form className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Desde</label>
                        <input
                            name="startDate"
                            type="date"
                            defaultValue={start}
                            className="border border-border rounded px-3 py-2 bg-background text-sm w-full"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Hasta</label>
                        <input
                            name="endDate"
                            type="date"
                            defaultValue={end}
                            className="border border-border rounded px-3 py-2 bg-background text-sm w-full"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Asesor</label>
                        <select
                            name="asesor"
                            defaultValue={asesor}
                            className="border border-border rounded px-3 py-2 bg-background text-sm w-full"
                        >
                            <option value="">TODOS</option>
                            {asesores.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Folio</label>
                        <input
                            name="folio"
                            type="text"
                            placeholder="Folio..."
                            defaultValue={folio}
                            className="border border-border rounded px-3 py-2 bg-background text-sm w-full"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Póliza</label>
                        <input
                            name="poliza"
                            type="text"
                            placeholder="Póliza..."
                            defaultValue={poliza}
                            className="border border-border rounded px-3 py-2 bg-background text-sm w-full"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Compañía</label>
                        <select
                            name="compania"
                            defaultValue={compania}
                            className="border border-border rounded px-3 py-2 bg-background text-sm w-full"
                        >
                            <option value="">TODAS</option>
                            <option value="QUALITAS">QUALITAS</option>
                            <option value="GNP">GNP</option>
                            <option value="AXA">AXA</option>
                            <option value="HDI">HDI</option>
                            <option value="GS">GS</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Estatus</label>
                        <select
                            name="estatus"
                            defaultValue={estatus}
                            className="border border-border rounded px-3 py-2 bg-background text-sm w-full"
                        >
                            <option value="">TODOS</option>
                            <option value="INGRESO">INGRESO</option>
                            <option value="INGRESO DIGITAL">INGRESO DIGITAL</option>
                            <option value="EN COMERCIAL">EN COMERCIAL</option>
                            <option value="REGRESO ASESOR">REGRESO ASESOR</option>
                            <option value="SIN INGRESO">SIN INGRESO</option>
                            <option value="CANCELACION">CANCELACION</option>
                            <option value="COMPLETO">COMPLETO</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-muted-foreground">Solicitud</label>
                        <select
                            name="solicitud"
                            defaultValue={solicitud}
                            className="border border-border rounded px-3 py-2 bg-background text-sm w-full"
                        >
                            <option value="">TODAS</option>
                            <option value="DXN">DXN</option>
                            <option value="CONT">CONT</option>
                            <option value="MENS">MENS</option>
                        </select>
                    </div>

                    <div className="flex gap-2 col-span-1 sm:col-span-2 md:col-span-4 lg:col-span-6 justify-end">
                        <Link href="/ingresos" className="btn-secondary">
                            Limpiar
                        </Link>
                        <button type="submit" className="btn-primary">
                            Filtrar
                        </button>
                    </div>
                </form>
            </div>

            <IngresosTable data={data} canEdit={canEdit} />

            <a
                href={`/api/ingresos/export?${queryParams}`}
                target="_blank"
                className="fixed bottom-6 left-6 p-4 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-lg transition-colors z-50 flex items-center justify-center"
                title="Exportar a Excel"
            >
                <TableCellsIcon className="w-6 h-6" />
            </a>
        </div>
    );
}
