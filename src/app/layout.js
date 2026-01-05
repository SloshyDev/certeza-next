import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "../components/ui/ThemeToggle";
import {
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  ClipboardDocumentListIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  UserIcon,
} from "@heroicons/react/20/solid";
import Logo from "../components/ui/Logo";
import Provider from "../components/SessionProvider";
import UserMenu from "../components/UserMenu";

import Link from "next/link";
import { auth, signOut } from "@/../auth";
import { isAdmin } from "@/lib/roles";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CERTEZA",
  description: "CERTEZA",
};



export default async function RootLayout({ children }) {
  const session = await auth();
  console.log(isAdmin(session));
  async function signOutAction() {
    "use server";
    await signOut();
  }
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground`}
      >
        <Provider session={session}>
          <header className="bg-background border-b border-border">
            {/* ... existing header code ... */}
            <div className="container-responsive flex items-center justify-between py-4 px-4 sm:px-6">
              <Link
                href="/"
                aria-label="Ir a inicio"
                className="flex items-center gap-2 hover:scale-110 transition-all duration-200"
              >
                <Logo className="h-8 w-8" />
                <span className="text-sm md:text-base text-foreground font-semibold tracking-wide">
                  CERTEZA
                </span>
              </Link>
              <nav className="flex items-center gap-2">
                <ThemeToggle />
                {session ? (
                  <>
                    <div className="hidden sm:flex items-center gap-2">
                      {isAdmin(session) ? (
                        <Link href="/recibos" className="btn-secondary gap-2">
                          <CurrencyDollarIcon
                            className="h-4 w-4 text-foreground"
                            aria-hidden="true"
                          />
                          Cobranza
                        </Link>
                      ) : null}
                      {isAdmin(session) ? (
                        <Link href="/polizas" className="btn-secondary gap-2">
                          <ChartBarIcon
                            className="h-4 w-4 text-foreground"
                            aria-hidden="true"
                          />
                          Drive
                        </Link>
                      ) : null}
                      <Link href="/bitacora" className="btn-secondary gap-2">
                        <ClipboardDocumentListIcon
                          className="h-4 w-4 text-foreground"
                          aria-hidden="true"
                        />
                        Bitácora
                      </Link>
                      <Link href="/ingresos" className="btn-secondary gap-2">
                        <ArchiveBoxIcon
                          className="h-4 w-4 text-foreground"
                          aria-hidden="true"
                        />
                        Ingresos
                      </Link>
                      <Link href="/renovaciones" className="btn-secondary gap-2">
                        <ArrowPathIcon
                          className="h-4 w-4 text-foreground"
                          aria-hidden="true"
                        />
                        Renovaciones
                      </Link>
                      <Link href="/asesores" className="btn-secondary gap-2">
                        <UserIcon
                          className="h-4 w-4 text-foreground"
                          aria-hidden="true"
                        />
                        Asesores
                      </Link>
                      <Link href="/correos" className="btn-secondary gap-2">
                        <ArchiveBoxIcon
                          className="h-4 w-4 text-foreground"
                          aria-hidden="true"
                        />
                        Gestionar Correos
                      </Link>
                      {isAdmin(session) ? (
                        <Link href="/admin" className="btn-secondary gap-2">
                          <Cog6ToothIcon
                            className="h-4 w-4 text-foreground"
                            aria-hidden="true"
                          />
                          Admin
                        </Link>
                      ) : null}
                      <UserMenu user={session.user} onSignOut={signOutAction} />
                    </div>
                    <details className="relative sm:hidden">
                      <summary className="btn-secondary list-none flex items-center gap-2">
                        <Bars3Icon
                          className="h-4 w-4 text-foreground"
                          aria-hidden="true"
                        />
                        Menú
                      </summary>
                      <div className="absolute z-50 right-0 mt-2 w-40 rounded-lg border border-border bg-background shadow-md">
                        <div className="flex flex-col p-2">
                          <Link
                            href="/bitacora"
                            className="btn-secondary w-full gap-2"
                          >
                            <ClipboardDocumentListIcon
                              className="h-4 w-4 text-foreground"
                              aria-hidden="true"
                            />
                            Bitácora
                          </Link>
                          <Link
                            href="/ingresos"
                            className="btn-secondary w-full gap-2 mt-2"
                          >
                            <ArchiveBoxIcon
                              className="h-4 w-4 text-foreground"
                              aria-hidden="true"
                            />
                            Ingresos
                          </Link>
                          <Link
                            href="/renovaciones"
                            className="btn-secondary w-full mt-2 gap-2"
                          >
                            <ArrowPathIcon
                              className="h-4 w-4 text-foreground"
                              aria-hidden="true"
                            />
                            Renovaciones
                          </Link>
                          <Link
                            href="/asesores"
                            className="btn-secondary w-full mt-2 gap-2"
                          >
                            <UserIcon
                              className="h-4 w-4 text-foreground"
                              aria-hidden="true"
                            />
                            Asesores
                          </Link>
                          <Link
                            href="/correos"
                            className="btn-secondary w-full mt-2 gap-2"
                          >
                            <ArchiveBoxIcon
                              className="h-4 w-4 text-foreground"
                              aria-hidden="true"
                            />
                            Auditoría Correos
                          </Link>
                          {isAdmin(session) ? (
                            <Link
                              href="/admin"
                              className="btn-secondary w-full mt-2 gap-2"
                            >
                              <Cog6ToothIcon
                                className="h-4 w-4 text-foreground"
                                aria-hidden="true"
                              />
                              Admin
                            </Link>
                          ) : null}
                          <UserMenu user={session.user} onSignOut={signOutAction} />
                        </div>
                      </div>
                    </details>
                  </>
                ) : null}
              </nav>
            </div>
          </header>
          <main className="w-full px-4 sm:px-6">{children}</main>
        </Provider>
      </body>
    </html>
  );
}
