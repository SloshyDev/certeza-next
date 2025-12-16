# Sistema de Roles

## Tablas

- `roles(id, name, description)`
- `user_roles(user_id, role_id)`

## Permisos

- `admin`: acceso total y gestión de roles
- `editor`: acceso a `/editor`
- `viewer`: acceso a `/viewer`

## Middleware

- Define rutas protegidas y verifica `session.user.roles`

## Administración

- Página `/admin` para asignar/revocar roles
- Endpoints: `POST /api/user-roles`, `DELETE /api/user-roles`

## Validación

- Zod valida payloads de creación de roles y asignaciones
