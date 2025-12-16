import { z } from "zod";
import { query, isDbConfigured } from "./db.js";

export const RoleSchema = z.object({
  id: z.number().int().positive(),
  name: z.enum(["admin", "editor", "viewer"]),
  description: z.string().optional(),
});

export const NewRoleSchema = z.object({
  name: z.enum(["admin", "editor", "viewer"]),
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

export async function listRoles() {
  if (!isDbConfigured())
    return [
      { id: 1, name: "admin", description: null },
      { id: 2, name: "editor", description: null },
      { id: 3, name: "viewer", description: null },
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

export async function listUsers() {
  if (!isDbConfigured()) return [];
  const res = await query(
    `SELECT 
       u.id,
       u.email,
       u.name,
       COALESCE(ARRAY_AGG(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
     FROM users_auth u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     GROUP BY u.id
     ORDER BY u.email ASC`
  );
  return res.rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
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
