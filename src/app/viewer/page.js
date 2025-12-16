import { requireAuth } from "@/lib/auth";

export default async function ViewerPage() {
  // Verificar autenticación
  await requireAuth();

  return (
    <div className="py-6">
      <div className="surface p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Área de Viewer</h2>
        <p className="mt-2 opacity-80">
          Contenido accesible para viewer, editor y admin.
        </p>
      </div>
    </div>
  );
}
