import { NextResponse } from "next/server";
import { auth } from "./auth";
const hasRole = (session, required) => {
  const roles = session?.user?.roles ?? [];
  return required.some((r) => roles.includes(r));
};

const protectedRoutes = [
  { path: "/admin", roles: ["admin"] },
  { path: "/editor", roles: ["editor", "admin"] },
  { path: "/viewer", roles: ["viewer", "editor", "admin"] },
];

export default auth((req) => {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const match = protectedRoutes.find((r) => pathname.startsWith(r.path));
  if (!match) return NextResponse.next();

  const isAuthed = !!req.auth;
  if (!isAuthed) {
    const url = new URL("/auth/sign-in", req.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (!hasRole(req.auth, match.roles)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
