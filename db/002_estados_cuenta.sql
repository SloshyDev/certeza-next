-- Tabla para almacenar cortes de estados de cuenta
CREATE TABLE IF NOT EXISTS estados_cuenta_cortes (
  id SERIAL PRIMARY KEY,
  nombre_quincena VARCHAR(100) NOT NULL UNIQUE,
  fecha_corte TIMESTAMP DEFAULT NOW(),
  total_comisiones DECIMAL(15, 2) DEFAULT 0,
  num_asesores INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INT REFERENCES users(id)
);

-- Tabla para almacenar detalles de comisiones por asesor en cada corte
CREATE TABLE IF NOT EXISTS estados_cuenta_detalles (
  id SERIAL PRIMARY KEY,
  corte_id INT NOT NULL REFERENCES estados_cuenta_cortes(id) ON DELETE CASCADE,
  asesor_id INT NOT NULL REFERENCES asesor(id),
  asesor_nombre VARCHAR(255) NOT NULL,
  asesor_clave VARCHAR(50),
  no_poliza VARCHAR(100) NOT NULL,
  cia VARCHAR(100),
  forma_pago VARCHAR(50),
  prima_total DECIMAL(15, 2) DEFAULT 0,
  prima_neta DECIMAL(15, 2) DEFAULT 0,
  porcentaje_comision DECIMAL(5, 2) DEFAULT 0,
  no_recibo INT,
  comision DECIMAL(15, 2) DEFAULT 0,
  f_pago_comision DATE,
  f_desde DATE,
  f_hasta DATE,
  estatus_pago VARCHAR(50),
  estatus_comision VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_estados_cuenta_detalles_corte ON estados_cuenta_detalles(corte_id);
CREATE INDEX IF NOT EXISTS idx_estados_cuenta_detalles_asesor ON estados_cuenta_detalles(asesor_id);
CREATE INDEX IF NOT EXISTS idx_estados_cuenta_detalles_poliza ON estados_cuenta_detalles(no_poliza);

-- Comentarios
COMMENT ON TABLE estados_cuenta_cortes IS 'Almacena información de cortes de estados de cuenta por quincena';
COMMENT ON TABLE estados_cuenta_detalles IS 'Detalle inmutable de comisiones pagadas por asesor en cada corte';
