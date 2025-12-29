import { z } from "zod";
import { query, isDbConfigured } from "./db.js";

export const RoleSchema = z.object({
  id: z.number().int().positive(),
  name: z.enum([
    "admin",
    "editor",
    "viewer",
    "emisor",
    "coordinador",
    "supervisor_emi",
  ]),
  description: z.string().optional(),
});

export const NewRoleSchema = z.object({
  name: z.enum([
    "admin",
    "editor",
    "viewer",
    "emisor",
    "coordinador",
    "supervisor_emi",
  ]),
  description: z.string().optional(),
});

export async function getUserRoles(userId) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT r.name 
     FROM user_roles ur 
     JOIN roles r ON r.id = ur.role_id 
     WHERE ur.user_id = $1`,
    [userId]
  );
  return res.rows.map((r) => r.name);
}

export async function getUserRolesByEmail(email) {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT r.name
     FROM users_auth u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.email = $1`,
    [email]
  );
  return res.rows.map((r) => r.name).filter(Boolean);
}

export async function listRoles() {
  if (!isDbConfigured())
    return [
      { id: 1, name: "admin", description: null },
      { id: 2, name: "editor", description: null },
      { id: 3, name: "viewer", description: null },
      { id: 4, name: "emisor", description: null },
      { id: 5, name: "coordinador", description: null },
      { id: 6, name: "supervisor_emi", description: null },
    ];
  const res = await query(
    `SELECT id, name, description FROM roles ORDER BY name ASC`
  );
  return res.rows;
}

export async function createRole(data) {
  const parsed = NewRoleSchema.parse(data);
  if (!isDbConfigured()) return null;
  const res = await query(
    `INSERT INTO roles (name, description) 
     VALUES ($1, $2) 
     ON CONFLICT (name) DO NOTHING 
     RETURNING id, name, description`,
    [parsed.name, parsed.description ?? null]
  );
  return res.rows[0] ?? null;
}

export async function assignRole(userId, roleName) {
  if (!isDbConfigured()) throw new Error("DB_NOT_CONFIGURED");
  const roleRes = await query(`SELECT id FROM roles WHERE name = $1`, [
    roleName,
  ]);
  if (!roleRes.rows[0]) throw new Error("Role not found");
  const roleId = roleRes.rows[0].id;
  await query(
    `INSERT INTO user_roles (user_id, role_id) 
     VALUES ($1, $2) 
     ON CONFLICT DO NOTHING`,
    [userId, roleId]
  );
  return true;
}

export async function revokeRole(userId, roleName) {
  if (!isDbConfigured()) throw new Error("DB_NOT_CONFIGURED");
  const roleRes = await query(`SELECT id FROM roles WHERE name = $1`, [
    roleName,
  ]);
  if (!roleRes.rows[0]) throw new Error("Role not found");
  const roleId = roleRes.rows[0].id;
  await query(`DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`, [
    userId,
    roleId,
  ]);
  return true;
}


export function hasRole(session, requiredRoles) {
  const roles = session?.user?.roles ?? [];
  return requiredRoles.some((r) => roles.includes(r));
}

export function isAdmin(session) {
  return hasRole(session, ["admin"]);
}

export function isCoordinador(session) {
  return hasRole(session, ["coordinador"]);
}

export function isSupervisorEmisor(session) {
  return hasRole(session, ["supervisor_emi"]);
}

export function isViewer(session) {
  return hasRole(session, ["viewer"]);
}

export function isEmisor(session) {
  return hasRole(session, ["emisor"]);
}

export function isEditor(session) {
  return hasRole(session, ["editor"]);
}

export function isAdminArea(session) {
  return hasRole(session, ["admin", "coordinador", "supervisor_emi", "emisor"]);
}

export function isAnalistaMesaVales(session) {
  return hasRole(session, ["analista_mesa"]);
}


export function canEditMesaVales(session) {
  return hasRole(session, ["analista_mesa", "coordinador", "admin"]);
}

export async function resolveUserRoles(session) {
  const inSession = Array.isArray(session?.user?.roles)
    ? session.user.roles
    : [];
  if (inSession.length > 0 || !isDbConfigured()) return inSession;
  if (session?.user?.id) return await getUserRoles(session.user.id);
  if (session?.user?.email)
    return await getUserRolesByEmail(session.user.email);
  return [];
}

export async function listUsers() {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT 
       u.id,
       u.email,
       u.name,
       COALESCE(u.alias, '') AS alias,
       b.status as assignment_active,
       COALESCE(ARRAY_AGG(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
     FROM users_auth u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     LEFT JOIN users b ON LOWER(b.mail) = LOWER(u.email)
     GROUP BY u.id, b.status
     ORDER BY u.email ASC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    alias: row.alias || "",
    assignment_active: row.assignment_active,
    roles: row.roles,
  }));
}

export async function setUserRole(userId, roleName) {
  if (!isDbConfigured()) throw new Error("DB_NOT_CONFIGURED");
  const roleRes = await query(`SELECT id FROM roles WHERE name = $1`, [
    roleName,
  ]);
  if (!roleRes.rows[0]) throw new Error("Role not found");
  const roleId = roleRes.rows[0].id;
  await query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
  await query(
    `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, roleId]
  );
  return true;
}

export async function setUserAlias(userId, alias) {
  if (!isDbConfigured()) throw new Error("DB_NOT_CONFIGURED");
  await query(
    `ALTER TABLE IF EXISTS users_auth ADD COLUMN IF NOT EXISTS alias text`
  );
  const res = await query(`UPDATE users_auth SET alias = $2 WHERE id = $1`, [
    userId,
    alias ?? null,
  ]);
  return (res.rowCount ?? 0) > 0;
}

export async function setUserAliasFlexible(userId, email, alias) {
  if (!isDbConfigured()) throw new Error("DB_NOT_CONFIGURED");
  await query(
    `ALTER TABLE IF EXISTS users_auth ADD COLUMN IF NOT EXISTS alias text`
  );
  const byId = await query(`UPDATE users_auth SET alias = $2 WHERE id = $1`, [
    userId,
    alias ?? null,
  ]);
  if ((byId.rowCount ?? 0) > 0) return true;
  if (email) {
    const byEmail = await query(
      `UPDATE users_auth SET alias = $2 WHERE email = $1`,
      [email, alias ?? null]
    );
    return (byEmail.rowCount ?? 0) > 0;
  }
  return false;
}

export async function ensureUsersAuthAliasColumn() {
  if (!isDbConfigured()) return false;
  await query(
    `ALTER TABLE IF EXISTS users_auth ADD COLUMN IF NOT EXISTS alias text`
  );
  return true;
}

export async function getUserAliasByEmail(email) {
  if (!isDbConfigured()) return null;
  const res = await query(`SELECT alias FROM users_auth WHERE email = $1`, [
    email,
  ]);
  const a = res.rows[0]?.alias;
  return a && String(a).trim() !== "" ? String(a) : null;
}
