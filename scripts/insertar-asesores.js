import { Pool } from "@neondatabase/serverless";

const connectionString =
  "postgresql://neondb_owner:npg_vkfRtX78VNaJ@ep-bold-rice-a45h46zx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const asesores = [
  { nombre: "AMALIA RIOS CHAVEZ", clave: "14010" },
  { nombre: "LIDIA CAROLINA RUIZ MENDOZA", clave: "9047" },
  { nombre: "CERTEZA", clave: "9001" },
  { nombre: "ENRIQUE BOUQUET VARGAS", clave: "9051" },
  { nombre: "GEORGINA RAMIREZ SOLIS", clave: "9053" },
  { nombre: "GERARDO GASPAR GASPAR", clave: "9004" },
  { nombre: "INVER REDES", clave: "20001" },
  { nombre: "JORGE CRUZ ROJAS", clave: "9041" },
  { nombre: "JORGE GENARO MARTINEZ ACEVEDO", clave: "23002" },
  { nombre: "LIDIA HERNANDEZ CEDILLO", clave: "9012" },
  { nombre: "MARIA DEL CARMEN TORRES IBARRA", clave: "20002" },
  { nombre: "MARIA ELENA VARGAS ZAMORA", clave: "9005" },
  { nombre: "GRISELDA PAEZ NIÑO", clave: "9038" },
  { nombre: "MARTHA VIOLETA TELLO VELAZQUEZ", clave: "9031" },
  { nombre: "CARLOS GONZALEZ / HIDALGO", clave: "13002" },
  { nombre: "MILDRET MONSERRAT PEREZ RODRIGUEZ", clave: "9010" },
  { nombre: "VERONICA MARGARITA ROMERO MARTINEZ", clave: "9036" },
  { nombre: "TONATIUH OROZCO BECERRIL", clave: "9016" },
  { nombre: "VERONICA SALVADOR CRUZ", clave: "9002" },
  { nombre: "CECILIA PEREZ MEJIA", clave: "9015" },
  { nombre: "ERIKA SALAZAR ORDOÑEZ", clave: "9020" },
  { nombre: "ELIZABETH LILIANA RUIZ ALFARO", clave: "9040" },
  { nombre: "JOSE ANTONIO CONTRERAS GARCIA", clave: "9017" },
  { nombre: "ERIKA FABIOLA ARCINIEGA", clave: "14005" },
  { nombre: "Jonathan certeza", clave: "9102" },
  { nombre: "RAYMUNDO CERTEZA", clave: "9103" },
  { nombre: "DIEGO CERTEZA", clave: "9109" },
  { nombre: "DEMIAN CERTEZA", clave: "9101" },
  { nombre: "RODRIGO BENGOCHEA", clave: "9025" },
  { nombre: "VERONICA MENDOZA RAMIREZ", clave: "9011" },
  { nombre: "MAURICIO GARCIA JUAREZ", clave: "9075" },
  { nombre: "SOLICITUD COMPAÑIA", clave: "9006" },
  { nombre: "GEORGINA CERTEZA", clave: "9104" },
  { nombre: "BRISA CERTEZA", clave: "9105" },
  { nombre: "ANTELMA CERTEZA", clave: "9106" },
  { nombre: "ALAN CERTEZA", clave: "9107" },
  { nombre: "JESUS CERTEZA", clave: "9110" },
  { nombre: "ASESORES BAJA", clave: "9000" },
  { nombre: "MARIA DEL ROCIO ESCOBEDO PEÑA", clave: "9064" },
  { nombre: "LUIS JOVANNI NICANOR LEON", clave: "9064" },
  { nombre: "EXPERIMENTAL", clave: "202218" },
  { nombre: "CENE", clave: "18000" },
  { nombre: "MARIO ALBERTO CASTILLO SANCHEZ", clave: "10001" },
  { nombre: "YURIAN YAHIR GONZALEZ ZAPIAIN", clave: "10002" },
  { nombre: "FREDY MENDOZA VELAZQUEZ", clave: "10003" },
  { nombre: "MARCO ANTONIO SANCHEZ HERNANDEZ", clave: "10004" },
  { nombre: "MARIA ALEJANDRA MALDONADO GARCIA", clave: "9039" },
];

async function insertarAsesores() {
  const pool = new Pool({ connectionString });

  try {
    console.log("Conectando a la base de datos...");

    let insertados = 0;
    let duplicados = 0;
    let errores = 0;

    for (const asesor of asesores) {
      try {
        const result = await pool.query(
          `INSERT INTO asesor (nombre, clave, activo) 
           VALUES ($1, $2, true) 
           ON CONFLICT (clave) DO NOTHING
           RETURNING id`,
          [asesor.nombre, asesor.clave]
        );

        if (result.rowCount > 0) {
          insertados++;
          console.log(`✅ Insertado: ${asesor.nombre} (${asesor.clave})`);
        } else {
          duplicados++;
          console.log(`⚠️  Ya existe: ${asesor.nombre} (${asesor.clave})`);
        }
      } catch (error) {
        errores++;
        console.error(
          `❌ Error con ${asesor.nombre} (${asesor.clave}):`,
          error.message
        );
      }
    }

    console.log("\n📊 Resumen:");
    console.log(`   ✅ Insertados: ${insertados}`);
    console.log(`   ⚠️  Duplicados: ${duplicados}`);
    console.log(`   ❌ Errores: ${errores}`);

    // Verificar total
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM asesor WHERE activo = true"
    );
    console.log(
      `\n📈 Total de asesores activos en la BD: ${countResult.rows[0].total}`
    );
  } catch (error) {
    console.error("❌ Error general:", error);
  } finally {
    await pool.end();
    console.log("\n✅ Proceso completado");
  }
}

insertarAsesores();
