# Instalación y Configuración

## Requisitos

- Node.js 18+
- Cuenta Azure AD con app registrada
- Base de datos Neon Postgres

## Variables de entorno

Copie `.env.example` a `.env.local` y complete:

- `AUTH_SECRET`: secreto generado (`npx auth secret`)
- `NEXTAUTH_URL`: `http://localhost:3000`
- `DATABASE_URL`: connection string Neon
- `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`

## Scripts SQL

Ejecute en Neon:

- `db/000_nextauth.sql`
- `db/001_roles.sql`

## Ejecutar

- `npm run dev` para entorno local

## Azure AD

- Redirección: `http://localhost:3000/api/auth/callback/azure-ad`
- Scopes: `openid profile email User.Read`
