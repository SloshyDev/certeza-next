-- Cambiar columna asesor_ajuste_id a asesor_ajuste_type (texto)
-- Esta columna guardará el tipo de ajuste: CANCELACION, PAGO DUPLICADO, OTRO

ALTER TABLE recibos 
DROP COLUMN IF EXISTS asesor_ajuste_id;

ALTER TABLE recibos 
ADD COLUMN IF NOT EXISTS asesor_ajuste_type TEXT;

COMMENT ON COLUMN recibos.asesor_ajuste_type IS 'Tipo de ajuste: CANCELACION, PAGO DUPLICADO, OTRO';
