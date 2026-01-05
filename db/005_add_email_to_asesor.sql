
-- Agregar columna email a la tabla asesor
ALTER TABLE asesor 
ADD COLUMN IF NOT EXISTS email TEXT;
