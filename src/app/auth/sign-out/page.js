import { auth, signOut } from "@/../auth";
import { redirect } from "next/navigation";

export default async function SignOutPage() {
  const session = await auth();
  if (!session) redirect("/auth/sign-in");
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

