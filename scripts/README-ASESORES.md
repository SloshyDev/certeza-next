# Script para Insertar Asesores

## Opción 1: Usando el script de Node.js

1. Ejecutar el script:

```bash
cd c:\Users\devln\Desktop\CERTEZA_APP\certeza-next
node scripts/insertar-asesores.js
```

## Opción 2: Usando SQL directamente en Neon

1. Ve a tu dashboard de Neon: https://console.neon.tech
2. Selecciona tu proyecto
3. Ve a "SQL Editor"
4. Copia y pega el contenido de `scripts/insertar-asesores.sql`
5. Ejecuta el script

## Opción 3: Usando psql

```bash
psql "postgresql://neondb_owner:npg_vkfRtX78VNaJ@ep-bold-rice-a45h46zx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require" -f scripts/insertar-asesores.sql
```

## Verificar Inserción

Después de ejecutar cualquiera de las opciones, verifica:

```sql
SELECT COUNT(*) FROM asesor WHERE activo = true;
SELECT nombre, clave FROM asesor ORDER BY nombre LIMIT 10;
```

## Notas

- El script usa `ON CONFLICT (clave) DO NOTHING` para evitar duplicados
- Todos los asesores se insertan con `activo = true`
- Total de asesores a insertar: 47
