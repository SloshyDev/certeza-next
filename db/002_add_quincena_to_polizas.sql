-- Agregar columna quincena a la tabla polizas
-- Esta columna almacena el identificador de la quincena (por ejemplo: "2025-01", "2025-02")

ALTER TABLE polizas 
ADD COLUMN IF NOT EXISTS quincena VARCHAR(50);

-- Agregar comentario a la columna
COMMENT ON COLUMN polizas.quincena IS 'Identificador de la quincena correspondiente a la póliza';
