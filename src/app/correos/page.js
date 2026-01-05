
import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import { getCorreosProcesados, getCorreosRechazados } from "@/lib/correos";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

export default async function CorreosPage(props) {
    const session = await auth();
    if (!session) {
        redirect("/auth/sign-in");
    }

    const searchParams = props.searchParams ? await props.searchParams : {};
    const tab = searchParams.tab || "procesados"; // procesados | rechazados

    let data = [];
    if (tab === "rechazados") {
        data = await getCorreosRechazados(200);
    } else {
        data = await getCorreosProcesados(200);
    }

    return (
        <div className="py-6 px-4 sm:px-6 relative min-h-screen pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Auditoría de Correos</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        registro de correos procesados y rechazados por el sistema
                    </p>
                </div>
                <Link href="/" className="btn-secondary gap-2 self-start sm:self-auto">
                    <ArrowLeftIcon className="w-4 h-4" />
                    Volver
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-border">
                <Link
                    href="?tab=procesados"
                    className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "procesados"
                            ? "border-accent text-accent"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Procesados
                </Link>
                <Link
                    href="?tab=rechazados"
                    className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "rechazados"
                            ? "border-red-500 text-red-500"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Rechazados
                </Link>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    {tab === "procesados" ? (
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted/10">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Remitente</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asunto</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Buzón</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row) => (
                                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/5">
                                        <td className="px-4 py-3 whitespace-nowrap text-xs">{row.fecha_procesado}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate" title={row.remitente}>{row.remitente}</td>
                                        <td className="px-4 py-3 max-w-[300px] truncate" title={row.asunto}>{row.asunto}</td>
                                        <td className="px-4 py-3">{row.buzon}</td>
                                        <td className="px-4 py-3">
                                            {row.asignado ? (
                                                <span className="text-green-600 font-medium text-xs bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                                                    Asignado
                                                </span>
                                            ) : (
                                                <span className="text-yellow-600 font-medium text-xs bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full" title={row.razon_no_asignacion}>
                                                    No Asignado
                                                </span>
                                            )}
                                            {row.razon_no_asignacion && !row.asignado && (
                                                <div className="text-[10px] text-muted-foreground mt-1 max-w-[200px] truncate">
                                                    {row.razon_no_asignacion}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No hay registros
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead className="bg-muted/10">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fecha Rechazo</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">De</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asunto</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Buzón</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row) => (
                                    <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/5">
                                        <td className="px-4 py-3 whitespace-nowrap text-xs">{row.fecha_rechazo}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate" title={row.de}>{row.de}</td>
                                        <td className="px-4 py-3 max-w-[300px] truncate" title={row.asunto}>{row.asunto}</td>
                                        <td className="px-4 py-3">{row.buzon}</td>
                                        <td className="px-4 py-3 text-red-600 font-medium text-xs">
                                            {row.motivo_rechazo}
                                            {row.clave_asesor && (
                                                <div className="text-[10px] text-muted-foreground font-normal">
                                                    Clave usada: {row.clave_asesor}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No hay registros
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
