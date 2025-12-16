import { auth, signOut } from "@/../auth";
import { requireAuth } from "@/lib/auth";

export default async function SignOutPage() {
  // Verificar autenticación
  const session = await requireAuth();
  
  return (
    <div style={{ padding: 24 }}>
      <h2>Cerrar sesión</h2>
      <p>¿Deseas salir de tu cuenta?</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button>Salir</button>
      </form>
    </div>
  );
}