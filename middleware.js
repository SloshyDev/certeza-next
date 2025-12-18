import { NextResponse } from "next/server";
import { auth } from "./auth";

const hasRole = (session, required) => {
  const roles = session?.user?.roles ?? [];
  return required.some((r) => roles.includes(r));
};

// Rutas que requieren roles específicos
const protectedRoutes = [
  { path: "/admin", roles: ["admin"] },
  { path: "/editor", roles: ["editor", "admin"] },
  { path: "/viewer", roles: ["viewer", "editor", "admin"] },
  { path: "/bitacora", roles: ["viewer", "editor", "admin", "emisor", "supervisor", "supervisor_emi"] },
  { path: "/api/bitacora", roles: ["viewer", "editor", "admin", "emisor", "supervisor", "supervisor_emi"] },
];

// Rutas que son públicas y no requieren autenticación
const publicRoutes = ["/", "/auth/sign-in", "/auth/sign-out"];

export async function middleware(req) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // Siempre permitir acceso a las rutas de autenticación
  if (pathname.startsWith("/api/auth") || publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Obtener la sesión completa con roles
  const session = await auth();
  
  // Si no está autenticado, redirigir al login
  if (!session) {
    const url = new URL("/auth/sign-in", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Verificar permisos de roles para rutas protegidas
  const match = protectedRoutes.find((r) => pathname.startsWith(r.path));
  if (match && !hasRole(session, match.roles)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export default auth(middleware);

export const config = {
  // El matcher ahora protege todas las rutas excepto archivos estáticos y api/auth
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
