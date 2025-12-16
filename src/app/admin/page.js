import Link from "next/link";
import { auth } from "@/../auth";
import { listRoles, listUsers, setUserRole } from "@/lib/roles";
import { isDbConfigured } from "@/lib/db";
import Button from "@/components/ui/Button";
import RoleSelect from "@/components/ui/RoleSelect";

export default async function AdminPage() {
  const session = await auth();
  const roles = await listRoles();
  const isAdmin = session?.user?.roles?.includes("admin");
  const dbReady = isDbConfigured();
  const users = dbReady ? await listUsers() : [];
  return (
    <div className="py-6">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Panel de Administración</h2>
            <p className="mt-2 opacity-80">
              Gestiona roles y accesos de usuarios
            </p>
          </div>
        </div>
        {!isAdmin ? (
          <div className="mt-6">
            <p className="opacity-80">
              No tienes autorización para acceder a esta sección.
            </p>
            <div className="mt-4 flex gap-3">
              <Link href="/" className="btn-secondary">
                Volver al inicio
              </Link>
            </div>
          </div>
        ) : (
          <>
            {!dbReady ? (
              <div className="mt-6 rounded-lg border border-border p-4">
                <p className="opacity-80">
                  Configura `DATABASE_URL` para habilitar la gestión en base de
                  datos.
                </p>
              </div>
            ) : (
              <UsersList users={users} roles={roles} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UsersList({ users, roles }) {
  async function onUpdateRole(formData) {
    "use server";
    const userId = Number(formData.get("userId"));
    const roleName = String(formData.get("role"));
    await setUserRole(userId, roleName);
  }
  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold">Usuarios</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="p-3 w-16">ID</th>
              <th className="p-3">Email</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Roles</th>
              <th className="p-3">Editar rol</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border">
                <td className="p-3 opacity-80">{u.id}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.name}</td>
                <td className="p-3 opacity-80">{(u.roles || []).join(", ")}</td>
                <td className="p-3">
                  <form
                    action={onUpdateRole}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="userId" value={u.id} />
                    <label htmlFor={`role-${u.id}`} className="sr-only">
                      Rol
                    </label>
                    <RoleSelect
                      inputId={`role-${u.id}`}
                      inputName="role"
                      initialValue={(u.roles && u.roles[0]) || "viewer"}
                      options={roles.map((r) => r.name)}
                      ariaLabel="Seleccionar rol"
                    />
                    <Button variant="accent" type="submit">
                      Guardar
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
