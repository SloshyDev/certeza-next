import { auth } from "@/../auth";
import { redirect } from "next/navigation";

/**
 * Componente de utilidad para verificar autenticación en páginas
 * @returns {Promise<void>}
 */
export async function requireAuth() {
  const session = await auth();
  if (!session) {
    redirect("/auth/sign-in");
  }
  return session;
}

/**
 * Componente de utilidad para verificar roles específicos
 * @param {string[]} requiredRoles - Roles requeridos
 * @returns {Promise<void>}
 */
export async function requireRole(requiredRoles) {
  const session = await auth();
  if (!session) {
    redirect("/auth/sign-in");
  }
  
  const userRoles = session.user?.roles || [];
  const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
  
  if (!hasRequiredRole) {
    redirect("/");
  }
  
  return session;
}