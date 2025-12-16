# Base de datos en Neon (PostgreSQL)

Guía práctica para configurar y utilizar la base de datos Neon Postgres en este proyecto.

## Connection string

- Formato: `postgresql://user:password@host:port/dbname?sslmode=require&channel_binding=require`
- Variable de entorno: defínala en `.env` o `.env.local` como:

```
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require&channel_binding=require
```

### Obtención desde Neon
- Cree un proyecto y una rama en el dashboard de Neon.
- En “Connection Details”, copie la cadena de conexión de tipo `postgresql`.
- Asegúrese de que incluya `sslmode=require`. Para mayor seguridad, se recomienda `channel_binding=require`.

Notas:
- Algunos clientes pueden no soportar `channel_binding`. Si su cliente falla con este parámetro, cambie a `channel_binding=prefer`.
- En este repositorio, el acceso desde la app usa `@neondatabase/serverless` y los scripts usan `pg`, ambos consumiendo la `DATABASE_URL`.

## Uso en el código

- Cliente serverless: `src/lib/db.js`
  - Crea un `Pool` de Neon con `connectionString: process.env.DATABASE_URL`.
  - Exposición de `query(text, params)` con acquire/release de conexión.
- Autenticación: `auth.js`
  - Valida `DATABASE_URL` y usa `Pool` para upsert y lookup en `users_auth`.
  - Integra roles de usuario vía `getUserRoles`.
- Scripts de introspección: `scripts/introspect-db.js`
  - Utiliza `pg` para leer esquema y generar `docs/db/schema.json` y `docs/db/er-diagram.mmd`.

## Inicialización de esquema

Ejecute en su base de datos Neon (por ejemplo, desde el SQL editor del dashboard) los siguientes archivos:
- `db/000_nextauth.sql` — Tablas base para NextAuth.
- `db/000_auth_users.sql` — Tabla `users_auth` usada por la app.
- `db/001_roles.sql` — Sistema de roles y asignaciones.

Tras ejecutar estos scripts:
- La app podrá crear/actualizar usuarios autenticados en `users_auth`.
- El sistema de roles (`roles`, `user_roles`) quedará disponible.

## Verificación rápida

- Inicie la app con `npm run dev` y verifique que el login con Azure AD crea/actualiza registros en `users_auth`.
- Genere la documentación del esquema:
  - `node scripts/introspect-db.js`
  - Se crearán/actualizarán `docs/db/schema.json` y `docs/db/er-diagram.mmd`.

## Buenas prácticas de seguridad

- Mantenga `sslmode=require` en la `DATABASE_URL`.
- Use `channel_binding=require` cuando su cliente lo soporte (verifique versiones).
- No comparta credenciales; utilice variables de entorno locales y secretos en producción.

## Recursos relacionados

- `docs/install.md` — Instalación y configuración general del proyecto.
- `docs/roles.md` — Manual del sistema de roles.
