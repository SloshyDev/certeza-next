# Environment Variables

This document describes all environment variables required for the CERTEZA Next.js application.

## Required Environment Variables

### Authentication (NextAuth.js)

#### `NEXTAUTH_URL`
- **Description**: The canonical URL of your site. Used for OAuth callbacks and redirects.
- **Required**: Yes (Production)
- **Format**: Full URL including protocol
- **Example**: 
  - Development: `http://localhost:3001`
  - Production: `https://dev.solucionescerteza.com.mx`

#### `AUTH_SECRET`
- **Description**: Secret key used to encrypt JWT tokens and sessions.
- **Required**: Yes
- **How to generate**: Run `openssl rand -base64 32` or `npx auth secret`
- **Example**: `your-generated-secret-here`
- **Important**: Keep this secret safe and never commit it to version control.

#### `AUTH_TRUST_HOST`
- **Description**: Trust the host header when behind proxies or load balancers.
- **Required**: Yes (Production, especially behind proxies)
- **Format**: Boolean
- **Example**: `true`
- **Important**: Essential for production deployments behind proxies, CDNs, or load balancers.

### Azure Active Directory

#### `AZURE_AD_CLIENT_ID`
- **Description**: Azure AD Application (client) ID
- **Required**: Yes
- **Where to find**: Azure Portal > App registrations > Your app > Overview
- **Example**: `12345678-1234-1234-1234-123456789abc`

#### `AZURE_AD_CLIENT_SECRET`
- **Description**: Azure AD client secret value
- **Required**: Yes
- **Where to find**: Azure Portal > App registrations > Your app > Certificates & secrets
- **Important**: Keep this secret safe and never commit it to version control.

#### `AZURE_AD_TENANT_ID`
- **Description**: Azure AD Directory (tenant) ID
- **Required**: Yes
- **Where to find**: Azure Portal > App registrations > Your app > Overview
- **Example**: `87654321-4321-4321-4321-cba987654321`

### Database

#### `DATABASE_URL`
- **Description**: PostgreSQL connection string (Neon or standard PostgreSQL)
- **Required**: Yes (for database features)
- **Format**: `postgresql://user:password@host:port/database?sslmode=require`
- **Example**: `postgresql://user:pass@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`

### Access Control

#### `ALLOWED_EMAIL_DOMAINS`
- **Description**: Comma-separated list of allowed email domains for authentication
- **Required**: Optional (defaults to `certezacovems.com.mx`)
- **Format**: Comma-separated domain names
- **Example**: `certezacovems.com.mx,example.com`

## Environment File Setup

### Development (.env.local)

Create a `.env.local` file in the root of your project:

```bash
# Authentication
NEXTAUTH_URL=http://localhost:3001
AUTH_SECRET=your-generated-secret-here
AUTH_TRUST_HOST=false

# Azure AD
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/certeza

# Access Control (optional)
ALLOWED_EMAIL_DOMAINS=certezacovems.com.mx
```

### Production

For production deployments, configure these variables in your hosting platform:

```bash
# Authentication
NEXTAUTH_URL=https://dev.solucionescerteza.com.mx
AUTH_SECRET=your-production-secret
AUTH_TRUST_HOST=true  # Important for deployments behind proxies!

# Azure AD
AZURE_AD_CLIENT_ID=your-production-client-id
AZURE_AD_CLIENT_SECRET=your-production-client-secret
AZURE_AD_TENANT_ID=your-tenant-id

# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Access Control
ALLOWED_EMAIL_DOMAINS=certezacovems.com.mx
```

## Azure AD Configuration

### Redirect URI Configuration

In Azure Portal, configure the following redirect URI for your application:

- **Development**: `http://localhost:3001/api/auth/callback/azure-ad`
- **Production**: `https://dev.solucionescerteza.com.mx/api/auth/callback/azure-ad`

### Important Notes

1. **`AUTH_TRUST_HOST=true`** is critical for production environments behind proxies, load balancers, or CDNs
2. Always use HTTPS in production (`NEXTAUTH_URL` should start with `https://`)
3. Generate a strong, unique `AUTH_SECRET` for each environment
4. Never commit `.env.local` or any file containing secrets to version control
5. Ensure your Azure AD redirect URIs match your `NEXTAUTH_URL` exactly

## Troubleshooting

### ERR_TOO_MANY_REDIRECTS

If you experience infinite redirect loops:

1. Verify `NEXTAUTH_URL` matches your actual deployment URL
2. Ensure `AUTH_TRUST_HOST=true` in production
3. Check that Azure AD redirect URI is configured correctly
4. Verify the root path `/` is included in `publicRoutes` in `middleware.js`

### Authentication Fails

1. Verify all Azure AD variables are set correctly
2. Check that your email domain is in `ALLOWED_EMAIL_DOMAINS`
3. Ensure Azure AD app has the correct permissions (openid, profile, email, User.Read)
4. Verify the redirect URI in Azure AD matches exactly
