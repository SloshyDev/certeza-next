import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    const tables = tablesRes.rows.map((r) => r.table_name);
    const schema = {};
    for (const t of tables) {
      const colsRes = await client.query(
        `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1
        ORDER BY ordinal_position
      `,
        [t]
      );
      schema[t] = { columns: colsRes.rows };
    }
    const fkRes = await client.query(`
      SELECT
        tc.table_name AS src_table,
        kcu.column_name AS src_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
      ORDER BY src_table
    `);
    const relationships = fkRes.rows;

    const docsDir = path.join(process.cwd(), "docs", "db");
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, "schema.json"), JSON.stringify({ tables: schema, relationships }, null, 2));
    const mermaid = toMermaid(schema, relationships);
    fs.writeFileSync(path.join(docsDir, "er-diagram.mmd"), mermaid, "utf8");
    console.log("ER diagram generado en docs/db/er-diagram.mmd");
  } finally {
    client.release();
  }
}

function toMermaid(schema, relationships) {
  let out = "erDiagram\n";
  for (const [table, info] of Object.entries(schema)) {
    out += `  ${table} {\n`;
    for (const col of info.columns) {
      out += `    ${col.data_type} ${col.column_name} ${col.is_nullable === "NO" ? "PK/FK?" : ""}\n`;
    }
    out += "  }\n";
  }
  for (const r of relationships) {
    out += `  ${r.target_table} ||--o{ ${r.src_table} : "${r.target_column} -> ${r.src_column}"\n`;
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

