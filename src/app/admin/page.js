import Link from "next/link";
import { auth } from "@/../auth";
import { listRoles, listUsers, setUserRole } from "@/lib/roles";
import { isDbConfigured } from "@/lib/db";
import Button from "@/components/ui/Button";
import RoleSelect from "@/components/ui/RoleSelect";
import {
  UserGroupIcon,
  ShieldCheckIcon,
  UsersIcon,
  CogIcon,
} from "@heroicons/react/24/outline";

export default async function AdminPage() {
  const session = await auth();
  const roles = await listRoles();
  const isAdmin = session?.user?.roles?.includes("admin");
  const dbReady = isDbConfigured();
  const users = dbReady ? await listUsers() : [];

  // Si no es admin, mostrar mensaje de acceso denegado
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="surface p-8 max-w-md w-full mx-4 text-center">
            <ShieldCheckIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Acceso Denegado
            </h2>
            <p className="text-muted-foreground mb-6">
              No tienes los permisos necesarios para acceder a esta sección.
            </p>
            <Link href="/" className="btn-primary">
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-foreground border-b border-border">
        <div className="container-responsive px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <CogIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Panel de Administración
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gestiona usuarios, roles y configuraciones del sistema
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Administrador: {session.user?.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-responsive px-4 sm:px-6 py-8">
        {!dbReady ? (
          <div className="surface p-8 text-center">
            <div className="bg-yellow-500/10 p-4 rounded-lg mb-4">
              <UsersIcon className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">
                Base de Datos No Configurada
              </h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Configura la variable de entorno{" "}
              <code className="bg-muted px-2 py-1 rounded">DATABASE_URL</code>{" "}
              para habilitar la gestión de usuarios.
            </p>
            <div className="bg-muted p-4 rounded-lg text-left max-w-2xl mx-auto">
              <p className="text-sm text-muted-foreground mb-2">
                Pasos para configurar:
              </p>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                <li>
                  Obtén la URL de conexión de tu base de datos (Neon,
                  PostgreSQL)
                </li>
                <li>
                  Agrega la variable{" "}
                  <code className="bg-background px-1 rounded">
                    DATABASE_URL
                  </code>{" "}
                  a tu archivo{" "}
                  <code className="bg-background px-1 rounded">.env.local</code>
                </li>
                <li>Reinicia el servidor de desarrollo</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="surface p-6">
                <div className="flex items-center">
                  <div className="bg-blue-500/10 p-3 rounded-lg">
                    <UsersIcon className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Usuarios
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {users.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface p-6">
                <div className="flex items-center">
                  <div className="bg-green-500/10 p-3 rounded-lg">
                    <UserGroupIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Roles Disponibles
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {roles.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface p-6">
                <div className="flex items-center">
                  <div className="bg-purple-500/10 p-3 rounded-lg">
                    <ShieldCheckIcon className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Estado del Sistema
                    </p>
                    <p className="text-2xl font-bold text-green-500">Activo</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="surface">
              <div className="p-6 border-b border-border">
                <h2 className="text-xl font-semibold text-foreground">
                  Gestión de Usuarios
                </h2>
                <p className="text-muted-foreground mt-1">
                  Administra los roles y permisos de los usuarios del sistema
                </p>
              </div>
              <UsersList users={users} roles={roles} />
            </div>
          </div>
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
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Usuario
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Rol Actual
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="bg-primary/10 p-2 rounded-full mr-3">
                    <UsersIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {u.name || "Sin nombre"}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-muted-foreground">{u.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {(u.roles || []).join(", ") || "Sin rol"}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <form
                  action={onUpdateRole}
                  className="flex items-center space-x-2"
                >
                  <input type="hidden" name="userId" value={u.id} />
                  <RoleSelect
                    inputId={`role-${u.id}`}
                    inputName="role"
                    initialValue={(u.roles && u.roles[0]) || "viewer"}
                    options={roles.map((r) => r.name)}
                    ariaLabel="Seleccionar rol"
                    className="text-sm"
                  />
                  <Button variant="accent" type="submit" size="sm">
                    Actualizar
                  </Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            No hay usuarios
          </h3>
          <p className="text-muted-foreground">
            Los usuarios aparecerán aquí cuando inicien sesión por primera vez.
          </p>
        </div>
      )}
    </div>
  );
}
