import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";

// Cargar variables de entorno
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (
    !url ||
    !/^postgres(ql)?:\/\//.test(url) ||
    url.includes("user:password@host:port")
  ) {
    console.error(
      "DATABASE_URL inválido. Configure una cadena real de Neon en .env/.env.local"
    );
    process.exit(2);
  }

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    // Si se pasa un archivo como argumento, aplicar solo ese
    const argFile = process.argv[2];

    let files = [];
    if (argFile) {
      const filePath = path.isAbsolute(argFile)
        ? argFile
        : path.join(process.cwd(), argFile);

      if (!fs.existsSync(filePath)) {
        console.error(`Archivo SQL no encontrado: ${filePath}`);
        process.exit(1);
      }
      files = [filePath];
    } else {
      // Si no hay argumento, aplicar archivos por defecto
      files = [
        path.join(process.cwd(), "db", "000_auth_users.sql"),
        path.join(process.cwd(), "db", "001_roles.sql"),
      ];
    }

    for (const f of files) {
      if (!fs.existsSync(f)) {
        console.warn(`Archivo SQL no encontrado: ${f}`);
        continue;
      }
      const sql = fs.readFileSync(f, "utf8");
      console.log(`Aplicando ${path.basename(f)}...`);
      await client.query(sql);
      console.log(`✓ OK: ${path.basename(f)}`);
    }
    console.log("\n✓ Migraciones aplicadas correctamente");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
