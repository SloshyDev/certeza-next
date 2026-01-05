import { query, isDbConfigured } from "./db";

export async function getCorreosProcesados(limit = 100) {
    if (!isDbConfigured()) return [];
    const res = await query(
        `SELECT
        id,
        remitente,
        asunto,
        to_char(fecha_recibido, 'YYYY-MM-DD HH24:MI:SS') as fecha_recibido,
        to_char(fecha_procesado, 'YYYY-MM-DD HH24:MI:SS') as fecha_procesado,
        buzon,
        asignado,
        razon_no_asignacion
     FROM correos_procesados
     WHERE (razon_no_asignacion IS NULL OR razon_no_asignacion NOT ILIKE '%Correo de respuesta/reenvío%')
     ORDER BY fecha_recibido DESC
     LIMIT $1`,
        [limit]
    );
    return res.rows;
}

export async function getCorreosRechazados(limit = 100) {
    if (!isDbConfigured()) return [];
    const res = await query(
        `SELECT
        id,
        de,
        para,
        asunto,
        to_char(fecha_recepcion, 'YYYY-MM-DD HH24:MI:SS') as fecha_recepcion,
        to_char(fecha_rechazo, 'YYYY-MM-DD HH24:MI:SS') as fecha_rechazo,
        motivo_rechazo,
        buzon,
        clave_asesor
     FROM correos_rechazados
     ORDER BY fecha_recepcion DESC
     LIMIT $1`,
        [limit]
    );
    return res.rows;
}
