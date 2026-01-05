
import Link from 'next/link';
import { auth } from '@/../auth';
import { isDbConfigured } from '@/lib/db';
import { listAsesores } from '@/lib/asesor';
import Button from '@/components/ui/Button';
import { revalidatePath } from 'next/cache';

export default async function AsesoresAdminPage() {
    const session = await auth();
    const isAdmin = session?.user?.roles?.includes('admin');
    const dbReady = isDbConfigured();

    if (!isAdmin) {
        return <div className="p-8 text-center">Acceso denegado</div>;
    }

    if (!dbReady) {
        return <div className="p-8 text-center">Base de datos no configurada</div>;
    }

    const asesores = await listAsesores();

    return (
        <div className="py-6">
            <div className="p-6 sm:p-8">
                <h2 className="text-2xl font-semibold mb-6">Administración de Asesores</h2>

                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="p-3 text-left font-medium">ID</th>
                                    <th className="p-3 text-left font-medium">Nombre</th>
                                    <th className="p-3 text-left font-medium">Email</th>
                                    <th className="p-3 text-left font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {asesores.map(asesor => (
                                    <AsesorRow key={asesor.id} asesor={asesor} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AsesorRow({ asesor }) {
    async function updateEmail(formData) {
        'use server';

        // We can fetch against the API we made or use direct server action logic
        // Using direct fetch to our API for consistency
        const id = formData.get('id');
        const email = formData.get('email');

        // Call the API endpoint we created
        // Note: In server components, relative URLs for fetch might need full base URL, 
        // but better to use direct DB call if possible.
        // However, to reuse logic, let's just use a fetch to the absolute URL or import the logic.
        // For simplicity in this swift action, let's call the API from client or just do a fetch here.
        // Actually, Server Actions are better.

        // Re-importing query here to avoid circular dependencies if any
        const { query } = await import('@/lib/db');
        await query(`UPDATE asesor SET email = $1 WHERE id = $2`, [email || null, id]);
        revalidatePath('/admin/asesores');
    }

    return (
        <tr className="hover:bg-muted/5">
            <td className="p-3">{asesor.id}</td>
            <td className="p-3">{asesor.nombre}</td>
            <td className="p-3">
                <form action={updateEmail} className="flex gap-2">
                    <input type="hidden" name="id" value={asesor.id} />
                    <input
                        name="email"
                        defaultValue={asesor.email || ''}
                        placeholder="correo@ejemplo.com"
                        className="px-2 py-1 border border-border rounded w-64 bg-background"
                    />
                    <Button size="sm" type="submit" variant="secondary">Guardar</Button>
                </form>
            </td>
            <td className="p-3 text-muted">
                {asesor.activo ? 'Activo' : 'Inactivo'}
            </td>
        </tr>
    );
}
