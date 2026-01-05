import Link from "next/link";
import { auth } from "@/../auth";
import {
  listRoles,
  listUsers,
  setUserRole,
  setUserAliasFlexible,
  createRole,
  ensureUsersAuthAliasColumn,
} from "@/lib/roles";
import { isDbConfigured } from "@/lib/db";
import Button from "@/components/ui/Button";
import RoleSelect from "@/components/ui/RoleSelect";
import { revalidatePath } from "next/cache";
import {
  UserGroupIcon,
  ShieldCheckIcon,
  UsersIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();
  const dbReady = isDbConfigured();
  if (dbReady) {
    await ensureUsersAuthAliasColumn();
    await createRole({ name: "emisor" });
    await createRole({ name: "coordinador" });
    await createRole({ name: "supervisor_emi" });
  }
  const roles = await listRoles();
  const isAdmin = session?.user?.roles?.includes("admin");
  const users = dbReady ? await listUsers() : [];

  return (
    <div className="py-6">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Panel de Administración
            </h2>
            <p className="mt-2 text-muted-foreground">
              Gestiona roles y accesos de usuarios
            </p>
            <div className="mt-4 flex gap-4">
              <Link href="/admin/asesores" className="text-primary hover:underline">
                Administrar Asesores
              </Link>
            </div>
          </div>
        </div>
        {!isAdmin ? (
          <div className="mt-6">
            <p className="text-muted-foreground">
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
                <p className="text-muted-foreground">
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
  // Redirigir a la página de gestión de usuarios por defecto
  redirect("/admin/users");
}

function UsersList({ users, roles }) {
  async function onUpdateRole(formData) {
    "use server";
    const userId = Number(formData.get("userId"));
    const roleName = String(formData.get("role"));
    await setUserRole(userId, roleName);
    revalidatePath("/admin");
  }
  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold text-foreground">Usuarios</h3>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full table-fixed border-collapse">
          <thead className="bg-muted/10">
            <tr className="border-b border-border text-left">
              <th className="p-3 w-16 text-muted-foreground font-medium">ID</th>
              <th className="p-3 text-muted-foreground font-medium">Email</th>
              <th className="p-3 text-muted-foreground font-medium">Nombre</th>
              <th className="p-3 text-muted-foreground font-medium">Asignación</th>
              <th className="p-3 text-muted-foreground font-medium">Roles</th>
              <th className="p-3 text-muted-foreground font-medium">
                Editar rol
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-border last:border-0 hover:bg-muted/5 transition-colors"
              >
                <td className="p-3 text-muted-foreground">{u.id}</td>
                <td className="p-3 text-foreground font-medium">{u.email}</td>
                <td className="p-3 text-foreground">{u.name}</td>

                <td className="p-3">
                  {u.assignment_active === true && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                      Activo
                    </span>
                  )}
                  {u.assignment_active === false && (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                      Inactivo
                    </span>
                  )}
                  {(u.assignment_active === null || u.assignment_active === undefined) && (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">
                  {(u.roles || []).join(", ")}
                </td>
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
                    <Button variant="accent" className="dark:text-white" type="submit">
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

function AliasForm({ userId, email, initialAlias }) {
  async function onUpdateAlias(formData) {
    "use server";
    const id = Number(formData.get("userId"));
    const email = String(formData.get("email") || "").trim();
    const alias = String(formData.get("alias") || "").trim();
    const ok = await setUserAliasFlexible(id, email, alias || null);
    if (!ok) {
      // ensure column exists and try again
      await ensureUsersAuthAliasColumn();
      await setUserAliasFlexible(id, email, alias || null);
    }
    revalidatePath("/admin");
  }
  return (
    <form action={onUpdateAlias} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="email" value={email || ""} />
      <input
        name="alias"
        defaultValue={initialAlias}
        placeholder="Alias"
        className="border rounded px-2 py-1"
      />
      <Button variant="secondary" className="dark:text-white" type="submit">
        Guardar
      </Button>
    </form>
  );
}
