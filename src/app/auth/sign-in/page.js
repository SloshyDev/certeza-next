import { auth, signIn } from "@/../auth";
import { redirect } from "next/navigation";
import Logo from "@/components/ui/Logo";
import { SubmitButton } from "./submit-button";

export default async function SignInPage(props) {
  const session = await auth();
  if (session) redirect("/");

  const searchParams =
    props && props.searchParams ? await props.searchParams : {};
  const { error } = searchParams;

  let errorMessage = "";
  if (error === "AccessDenied") {
    errorMessage = "Acceso denegado o cancelado.";
  } else if (error === "Verification") {
    errorMessage = "El enlace de verificación ha expirado o ya ha sido usado.";
  } else if (error) {
    errorMessage = "Ocurrió un error al iniciar sesión.";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 surface p-8 shadow-lg border-t-4 border-t-primary">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-20 w-20" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight">
            CERTEZA App
          </h2>
          <p className="mt-2 text-sm opacity-80 text-balance">
            Plataforma de Gestión y Bitácora Operativa
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 rounded-md p-3 text-sm text-center animate-pulse">
            {errorMessage}
          </div>
        )}

        <div className="mt-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-foreground text-background rounded-full text-xs uppercase tracking-wider opacity-70">
                Ingreso Corporativo
              </span>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await signIn("azure-ad", { redirectTo: "/" });
            }}
          >
            <SubmitButton />
          </form>
        </div>

        <p className="text-center text-xs opacity-50 mt-8">
          &copy; {new Date().getFullYear()} CERTEZA. Todos los derechos
          reservados.
        </p>
      </div>
    </div>
  );
}
