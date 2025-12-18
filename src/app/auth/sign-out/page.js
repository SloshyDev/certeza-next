import { signOut } from "@/../auth";

export default async function SignOutPage() {
  
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
