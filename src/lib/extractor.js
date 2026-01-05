import { query, isDbConfigured } from "./db.js";

/**
 * Obtener lista de asesores activos
 */
export async function getAsesores() {
  if (!isDbConfigured()) return [];

  try {
    const res = await query(
      `SELECT id_asesor as id, nombre, clave_asesor as clave 
       FROM asesores 
       WHERE activo = true 
       ORDER BY nombre ASC`
    );
    return res.rows;
  } catch (error) {
    console.error("Error al obtener asesores:", error);
    throw error;
  }
}

/**
 * Obtener lista de gerentes activos
 */
export async function getGerentes() {
  if (!isDbConfigured()) return [];

  try {
    const res = await query(
      `SELECT id_gerente as id, nombre
       FROM gerentes 
       WHERE activo = true 
       ORDER BY nombre ASC`
    );
    return res.rows;
  } catch (error) {
    console.error("Error al obtener gerentes:", error);
    throw error;
  }
}
