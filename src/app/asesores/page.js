
import { auth } from "@/../auth";
import { redirect } from "next/navigation";
import { listAsesores } from "@/lib/asesor";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

export default async function AsesoresPage() {
    const session = await auth();
    if (!session) {
        redirect("/auth/sign-in");
    }

    const asesores = await listAsesores();

    return (
        <div className="py-6 px-4 sm:px-6 relative min-h-screen pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Directorio de Asesores</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Lista de asesores registrados con clave y correo
                    </p>
                </div>
                <Link href="/" className="btn-secondary gap-2 self-start sm:self-auto">
                    <ArrowLeftIcon className="w-4 h-4" />
                    Volver
                </Link>
            </div>

            <div className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-muted/10">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nombre</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Clave</th>
                                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Correo</th>
                                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Estatus</th>
                            </tr>
                        </thead>
                        <tbody>
                            {asesores.map((asesor) => (
                                <tr key={asesor.id} className="border-b border-border last:border-0 hover:bg-muted/5">
                                    <td className="px-4 py-3 font-medium">{asesor.nombre}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{asesor.clave || "-"}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{asesor.correo || "-"}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${asesor.activo
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            }`}>
                                            {asesor.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {asesores.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        No hay asesores registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
