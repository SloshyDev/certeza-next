import { Pool } from "pg";

async function main() {
  const email = process.argv[2];
  const roleName = process.argv[3] || "admin";
  if (!email) {
    console.error("Uso: node scripts/assign-admin.js <email> [roleName]");
    process.exit(2);
  }
  const url = process.env.DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url) || url.includes("user:password@host:port")) {
    console.error("DATABASE_URL inválido. Configure Neon en .env/.env.local");
    process.exit(3);
  }
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    const roleRes = await client.query(`SELECT id FROM roles WHERE name=$1`, [roleName]);
    if (!roleRes.rows[0]) {
      throw new Error(`Rol no encontrado: ${roleName}`);
    }
    const roleId = roleRes.rows[0].id;
    const upsert = await client.query(
      `INSERT INTO users_auth (email, name)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name
       RETURNING id, email`,
      [email, email.split("@")[0]]
    );
    const userId = upsert.rows[0].id;
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, roleId]
    );
    console.log(`Asignado rol ${roleName} a ${email} (user_id=${userId})`);
  } finally {
    client.release();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

