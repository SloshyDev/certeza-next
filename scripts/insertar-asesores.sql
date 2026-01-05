-- Script para insertar asesores en la base de datos
-- Ejecutar en la consola de Neon o con psql

-- Primero, verificar si la tabla existe y tiene la estructura correcta
-- La tabla asesor debe tener: id, nombre, clave, correo, activo, created_at

INSERT INTO asesor (nombre, clave, activo) VALUES
('AMALIA RIOS CHAVEZ', '14010', true),
('LIDIA CAROLINA RUIZ MENDOZA', '9047', true),
('CERTEZA', '9001', true),
('ENRIQUE BOUQUET VARGAS', '9051', true),
('GEORGINA RAMIREZ SOLIS', '9053', true),
('GERARDO GASPAR GASPAR', '9004', true),
('INVER REDES', '20001', true),
('JORGE CRUZ ROJAS', '9041', true),
('JORGE GENARO MARTINEZ ACEVEDO', '23002', true),
('LIDIA HERNANDEZ CEDILLO', '9012', true),
('MARIA DEL CARMEN TORRES IBARRA', '20002', true),
('MARIA ELENA VARGAS ZAMORA', '9005', true),
('GRISELDA PAEZ NIÑO', '9038', true),
('MARTHA VIOLETA TELLO VELAZQUEZ', '9031', true),
('CARLOS GONZALEZ / HIDALGO', '13002', true),
('MILDRET MONSERRAT PEREZ RODRIGUEZ', '9010', true),
('VERONICA MARGARITA ROMERO MARTINEZ', '9036', true),
('TONATIUH OROZCO BECERRIL', '9016', true),
('VERONICA SALVADOR CRUZ', '9002', true),
('CECILIA PEREZ MEJIA', '9015', true),
('ERIKA SALAZAR ORDOÑEZ', '9020', true),
('ELIZABETH LILIANA RUIZ ALFARO', '9040', true),
('JOSE ANTONIO CONTRERAS GARCIA', '9017', true),
('ERIKA FABIOLA ARCINIEGA', '14005', true),
('Jonathan certeza', '9102', true),
('RAYMUNDO CERTEZA', '9103', true),
('DIEGO CERTEZA', '9109', true),
('DEMIAN CERTEZA', '9101', true),
('RODRIGO BENGOCHEA', '9025', true),
('VERONICA MENDOZA RAMIREZ', '9011', true),
('MAURICIO GARCIA JUAREZ', '9075', true),
('SOLICITUD COMPAÑIA', '9006', true),
('GEORGINA CERTEZA', '9104', true),
('BRISA CERTEZA', '9105', true),
('ANTELMA CERTEZA', '9106', true),
('ALAN CERTEZA', '9107', true),
('JESUS CERTEZA', '9110', true),
('ASESORES BAJA', '9000', true),
('MARIA DEL ROCIO ESCOBEDO PEÑA', '9064', true),
('LUIS JOVANNI NICANOR LEON', '9064', true),
('EXPERIMENTAL', '202218', true),
('CENE', '18000', true),
('MARIO ALBERTO CASTILLO SANCHEZ', '10001', true),
('YURIAN YAHIR GONZALEZ ZAPIAIN', '10002', true),
('FREDY MENDOZA VELAZQUEZ', '10003', true),
('MARCO ANTONIO SANCHEZ HERNANDEZ', '10004', true),
('MARIA ALEJANDRA MALDONADO GARCIA', '9039', true)
ON CONFLICT (clave) DO NOTHING;

-- Verificar inserción
SELECT COUNT(*) as total_asesores FROM asesor WHERE activo = true;
