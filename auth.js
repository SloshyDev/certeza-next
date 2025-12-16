import NextAuth from "next-auth";
import AzureAd from "next-auth/providers/azure-ad";
import { Pool } from "@neondatabase/serverless";
import { getUserRoles } from "./src/lib/roles.js";

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const dbUrl = process.env.DATABASE_URL;
  const hasDb =
    typeof dbUrl === "string" &&
    dbUrl.startsWith("postgres") &&
    !dbUrl.includes("user:password@host:port");
  const pool = hasDb ? new Pool({ connectionString: dbUrl }) : null;
  return {
    providers: [
      AzureAd({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
        issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
        authorization: {
          params: {
            scope: "openid profile email User.Read",
            prompt: "select_account",
          },
        },
        checks: ["none"],
      }),
    ],
    session: { strategy: "jwt" },
    secret: process.env.AUTH_SECRET,
    callbacks: {
      async redirect({ url, baseUrl }) {
        // Allow relative callback URLs
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        // Allow callback URLs on the same origin
        else if (new URL(url).origin === baseUrl) return url;
        return baseUrl;
      },
      async signIn({ account, profile }) {
        const email = profile?.email || account?.email || "";
        const domains = (
          process.env.ALLOWED_EMAIL_DOMAINS || "certezacovems.com.mx"
        )
          .split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean);
        const ok =
          email && domains.some((d) => email.toLowerCase().endsWith(`@${d}`));
        return !!ok;
      },
      async jwt({ token, account, profile }) {
        if (pool && account && profile?.email) {
          const client = await pool.connect();
          try {
            const upsert = await client.query(
              `INSERT INTO users_auth (email, name, external_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, external_id=EXCLUDED.external_id
               RETURNING id`,
              [profile.email, profile.name ?? null, profile.sub ?? null]
            );
            const userId = upsert.rows[0]?.id;
            token.userId = userId;
            const hasAnyRole = await client.query(
              `SELECT 1 FROM user_roles WHERE user_id=$1 LIMIT 1`,
              [userId]
            );
            if (!hasAnyRole.rows[0]) {
              const viewer = await client.query(
                `SELECT id FROM roles WHERE name='viewer' LIMIT 1`
              );
              if (viewer.rows[0]) {
                await client.query(
                  `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                  [userId, viewer.rows[0].id]
                );
              }
            }
          } finally {
            client.release();
          }
        }
        if (pool && !token.userId && token.email) {
          const client = await pool.connect();
          try {
            const res = await client.query(
              `SELECT id FROM users_auth WHERE email=$1`,
              [token.email]
            );
            if (res.rows[0]) token.userId = res.rows[0].id;
          } finally {
            client.release();
          }
        }
        return token;
      },
      async session({ session, token }) {
        if (session?.user && token?.sub) {
          session.user.id = token.userId ?? null;
          try {
            const roles =
              pool && session.user.id
                ? await getUserRoles(session.user.id)
                : [];
            session.user.roles = roles;
          } catch {
            session.user.roles = [];
          }
        }
        return session;
      },
    },
    pages: {
      signIn: "/auth/sign-in",
    },
  };
});
