import { auth, signIn } from "@/../auth";
import { redirect } from "next/navigation";
import Button from "@/components/ui/Button";

export default async function SignInPage() {
  const session = await auth();
  if (session) redirect("/");
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-6">
      <main className="w-full max-w-md surface p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
        <p className="mt-2 opacity-80">
          Usa tu cuenta de Microsoft para acceder
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("azure-ad", { redirectTo: "/" });
          }}
        >
          <Button variant="accent" type="submit">
            Entrar con Microsoft
          </Button>
        </form>
      </main>
    </div>
  );
}
