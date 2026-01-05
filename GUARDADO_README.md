# 💾 Sistema de Guardado de Pólizas - Extractor PDF

## Descripción General

El sistema de guardado implementa un flujo completo para persistir los datos extraídos del PDF en la base de datos PostgreSQL, incluyendo:

- **Asegurados** (clientes)
- **Vehículos**
- **Pólizas** (con todas las relaciones)
- **Control de documentos**
- **Auditoría** (registro de cambios)

## 🔄 Flujo de Guardado

### 1. Validación en el Cliente

```javascript
// Validaciones antes de enviar:
- Asesor seleccionado ✓
- Gerencia seleccionada ✓
- Número de póliza presente ✓
```

### 2. Procesamiento en el Servidor

#### PASO 1: Asegurado

- Busca si existe por nombre o RFC
- Si existe: actualiza datos
- Si no existe: inserta nuevo registro
- Retorna: `id_asegurado`

#### PASO 2: Vehículo

- Busca si existe por placas o número de serie
- Si existe: actualiza datos y vincula con asegurado
- Si no existe: inserta nuevo registro
- Retorna: `id_vehiculo`

#### PASO 3: Referencias

- Busca `id_aseguradora` por nombre (ILIKE)
- Busca `id_forma_pago` por nombre (ILIKE)

#### PASO 4: Póliza

- Inserta nueva póliza con todas las relaciones
- Estado por defecto: `ACTIVA`
- Fecha de captura: `NOW()`
- Retorna: `id_poliza`

#### PASO 5: Control de Documentos

- Inserta registro de control
- `completo = true` si `documentos_faltantes` está vacío o es "NINGUNO"
- Vincula con `id_poliza`

#### PASO 6: Auditoría

- Registra la operación en `audit_log`
- Acción: `INSERT`
- Usuario: gerencia seleccionada
- Datos: JSON con información clave

## 📋 Mapeo de Campos

### Asegurado

```
nombre_asegurado     → asegurados.nombre
rfc                  → asegurados.rfc
direccion_asegurado  → asegurados.direccion
telefono             → asegurados.telefono
numero_empleado      → asegurados.numero_empleado
tipo_trabajador      → asegurados.tipo_trabajador
```

### Vehículo

```
descripcion_unidad   → vehiculos.descripcion_unidad
modelo               → vehiculos.modelo
tipo_vehiculo        → vehiculos.tipo
placas               → vehiculos.placas
numero_serie         → vehiculos.numero_serie
numero_motor         → vehiculos.numero_motor
```

### Póliza

```
numero_folio         → polizas.numero_folio
numero_poliza        → polizas.numero_poliza
tipo_solicitud       → polizas.tipo_solicitud
fecha_desde          → polizas.fecha_desde
fecha_hasta          → polizas.fecha_hasta
fecha_emision        → polizas.fecha_emision
prima_neta           → polizas.prima_neta (NUMERIC)
prima_total          → polizas.prima_total (NUMERIC)
pago_mixto           → polizas.pago_mixto (NUMERIC)
ubicacion            → polizas.ubicacion
aseguradora          → polizas.id_aseguradora (lookup)
forma_pago           → polizas.id_forma_pago (lookup)
asesor_id            → polizas.id_asesor
```

### Control de Documentos

```
fecha_ingreso_digital  → control_documentos.fecha_ingreso_digital
fecha_ingreso_fisico   → control_documentos.fecha_ingreso_fisico
documentos_faltantes   → control_documentos.documentos_faltantes
completo               → control_documentos.completo (AUTO)
```

## 🔧 Archivos Creados/Modificados

### 1. `/api/polizas/save/route.js` (NUEVO)

Endpoint POST que maneja todo el flujo de guardado:

- Validación de configuración de DB
- Transacciones de inserción/actualización
- Búsqueda de referencias (aseguradora, forma_pago)
- Registro de auditoría
- Manejo de errores

### 2. `src/app/extractor/page.js` (MODIFICADO)

Función `handleSave()` actualizada:

- Validación de campos requeridos
- Llamada POST a `/api/polizas/save`
- Manejo de loading state
- Alertas de éxito/error
- Reset automático después de guardar

## 📊 Respuesta del API

### Éxito (200)

```json
{
  "success": true,
  "message": "Póliza guardada exitosamente",
  "data": {
    "id_poliza": 123,
    "id_asegurado": 45,
    "id_vehiculo": 67
  }
}
```

### Error (500)

```json
{
  "success": false,
  "error": "Mensaje de error descriptivo"
}
```

## ⚡ Características Especiales

### Prevención de Duplicados

- **Asegurados**: busca por nombre O RFC
- **Vehículos**: busca por placas O número de serie
- Si encuentra coincidencia: ACTUALIZA en lugar de insertar duplicado

### Conversión de Tipos

- Primas: string → `parseFloat()` → NUMERIC
- Asesor ID: string → `parseInt()` → INTEGER
- Fechas: string formato ISO → DATE

### Valores por Defecto

- `documentos_faltantes` vacío → `completo = true`
- Estado de póliza: `ACTIVA`
- Timestamps: `NOW()`

### Búsqueda Flexible

```sql
-- Busca aseguradora con ILIKE (case-insensitive, partial match)
WHERE nombre ILIKE '%AXA%'  -- coincide con "AXA SEGUROS", "axa", etc.
```

## 🧪 Prueba del Sistema

### 1. Iniciar el servidor Next.js

```bash
cd certeza-next
npm run dev
```

### 2. Ir a la página del extractor

```
http://localhost:3000/extractor
```

### 3. Proceso de prueba

1. ✅ Cargar un PDF
2. ✅ Seleccionar plantilla
3. ✅ Hacer clic en "📄 Extraer Datos"
4. ✅ Seleccionar Asesor
5. ✅ Seleccionar Gerencia
6. ✅ Revisar/editar campos extraídos
7. ✅ Hacer clic en "💾 Guardar Datos"
8. ✅ Verificar mensaje de éxito

### 4. Verificar en la base de datos

```sql
-- Ver última póliza insertada
SELECT * FROM polizas ORDER BY id_poliza DESC LIMIT 1;

-- Ver con todos los datos relacionados
SELECT * FROM vista_polizas_completa ORDER BY id_poliza DESC LIMIT 1;

-- Ver registro de auditoría
SELECT * FROM audit_log ORDER BY fecha DESC LIMIT 5;
```

## ⚠️ Consideraciones

### Campos Requeridos

- `asesor_id`: validado en cliente
- `gerencia`: validado en cliente
- `numero_poliza`: validado en cliente

### Campos Opcionales

- Todos los demás campos pueden ser NULL
- El sistema maneja valores vacíos correctamente

### Transacciones

⚠️ **IMPORTANTE**: El código actual NO usa transacciones. Si hay un error después de insertar el asegurado pero antes de completar la póliza, puede quedar data inconsistente.

**Mejora recomendada** (para implementar después):

```javascript
// Usar transacciones para operaciones atómicas
const client = await pool.connect();
try {
  await client.query("BEGIN");
  // ... todas las operaciones ...
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}
```

## 🔐 Seguridad

### Validaciones Implementadas

- ✅ Verificación de configuración de DB
- ✅ Validación de campos requeridos (cliente)
- ✅ Conversión segura de tipos
- ✅ Manejo de NULL values

### Mejoras Recomendadas

- [ ] Autenticación de usuario
- [ ] Permisos por rol
- [ ] Rate limiting
- [ ] Validación de datos en servidor (formato, rangos)
- [ ] Sanitización adicional de inputs

## 📝 Logs y Debugging

Los errores se registran en:

1. **Consola del navegador**: errores de cliente
2. **Terminal del servidor Next.js**: errores de servidor
3. **Tabla `audit_log`**: registro de operaciones exitosas

Para debug:

```javascript
// En route.js
console.log("Datos recibidos:", data);
console.log("ID asegurado:", id_asegurado);
console.log("ID vehículo:", id_vehiculo);
```

## 🚀 Próximos Pasos Sugeridos

1. **Implementar transacciones** para garantizar atomicidad
2. **Agregar validación de fechas** (formato, rango lógico)
3. **Mejorar búsqueda de aseguradoras** (tabla de mapeo de nombres)
4. **Implementar edición de pólizas** (endpoint PUT)
5. **Agregar confirmación visual** después de guardar
6. **Crear página de listado** de pólizas guardadas
7. **Implementar búsqueda y filtros** de pólizas
