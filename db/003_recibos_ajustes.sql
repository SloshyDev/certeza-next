-- Modificar tabla recibos para permitir recibos de ajuste sin póliza
-- y agregar campo para identificar el asesor en recibos de ajuste

-- 1. Permitir NULL en poliza_id (si no lo permite ya)
ALTER TABLE recibos 
ALTER COLUMN poliza_id DROP NOT NULL;

-- 2. Permitir NULL en no_recibo (para recibos de ajuste)
ALTER TABLE recibos 
ALTER COLUMN no_recibo DROP NOT NULL;

-- 3. Agregar campo para referenciar asesor en recibos de ajuste
ALTER TABLE recibos 
ADD COLUMN IF NOT EXISTS asesor_ajuste_id INTEGER REFERENCES asesor(id);

-- 4. Agregar columna f_pago_comision si no existe
ALTER TABLE recibos 
ADD COLUMN IF NOT EXISTS f_pago_comision DATE;

-- 5. Agregar índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_recibos_asesor_ajuste ON recibos(asesor_ajuste_id) WHERE asesor_ajuste_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recibos_ajuste ON recibos(estatus_pago) WHERE estatus_pago = 'AJUSTE';

-- Comentarios para documentación
COMMENT ON COLUMN recibos.asesor_ajuste_id IS 'ID del asesor al que se le aplica el ajuste de comisión (para recibos de ajuste sin póliza)';
COMMENT ON COLUMN recibos.motivo IS 'Descripción del motivo del recibo (especialmente importante para recibos de ajuste)';
