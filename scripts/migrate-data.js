import { neon } from "@neondatabase/serverless";

// Configurar las conexiones
const SOURCE_DB_URL =
  "postgresql://neondb_owner:npg_EmH7pOrcGJ5q@ep-old-resonance-adzweor5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"; // develop
const TARGET_DB_URL = process.env.DATABASE_URL; // production

const sourceDb = neon(SOURCE_DB_URL);
const targetDb = neon(TARGET_DB_URL);

async function migratePolizas() {
  console.log("\n📦 Iniciando migración de pólizas...");

  try {
    // Obtener todas las pólizas de develop
    const polizas = await sourceDb`SELECT * FROM polizas ORDER BY id`;
    console.log(`✓ Se encontraron ${polizas.length} pólizas en develop`);

    if (polizas.length === 0) {
      console.log("⚠ No hay pólizas para migrar");
      return { migrated: 0, skipped: 0 };
    }

    // Obtener pólizas existentes en production
    const existingPolizas = await targetDb`SELECT no_poliza FROM polizas`;
    const existingSet = new Set(existingPolizas.map((p) => p.no_poliza));
    console.log(
      `✓ Ya existen ${existingSet.size} pólizas en production (serán actualizadas)`
    );
    console.log(`➜ Se procesarán todas las ${polizas.length} pólizas`);

    let migrated = 0;
    let updated = 0;
    let skipped = 0;

    // Insertar/actualizar en lotes de 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < polizas.length; i += BATCH_SIZE) {
      const batch = polizas.slice(i, i + BATCH_SIZE);

      for (const poliza of batch) {
        const exists = existingSet.has(poliza.no_poliza);
        try {
          await targetDb`
            INSERT INTO polizas (
              no_poliza, cia, forma_pago, f_desde, f_hasta, 
              prima_neta, prima_total, estatus, folio, 
              asesor_id, commission_percentage, check_mesa,
              bitacora_id, created_by, no_vale, f_actualizacion,
              f_vale_recibido, f_ingreso, contador_cambios
            ) VALUES (
              ${poliza.no_poliza}, ${poliza.cia}, ${poliza.forma_pago},
              ${poliza.f_desde}, ${poliza.f_hasta}, ${poliza.prima_neta}, 
              ${poliza.prima_total}, ${poliza.estatus}, ${poliza.folio}, 
              ${poliza.asesor_id}, ${poliza.commission_percentage}, ${poliza.check_mesa},
              ${poliza.bitacora_id}, ${poliza.created_by}, ${poliza.no_vale}, 
              ${poliza.f_actualizacion}, ${poliza.f_vale_recibido}, ${poliza.f_ingreso},
              ${poliza.contador_cambios}
            )
            ON CONFLICT (no_poliza) DO UPDATE SET
              cia = EXCLUDED.cia,
              forma_pago = EXCLUDED.forma_pago,
              f_desde = EXCLUDED.f_desde,
              f_hasta = EXCLUDED.f_hasta,
              prima_neta = EXCLUDED.prima_neta,
              prima_total = EXCLUDED.prima_total,
              estatus = EXCLUDED.estatus,
              folio = EXCLUDED.folio,
              asesor_id = EXCLUDED.asesor_id,
              commission_percentage = EXCLUDED.commission_percentage,
              check_mesa = EXCLUDED.check_mesa,
              bitacora_id = EXCLUDED.bitacora_id,
              created_by = EXCLUDED.created_by,
              no_vale = EXCLUDED.no_vale,
              f_actualizacion = EXCLUDED.f_actualizacion,
              f_vale_recibido = EXCLUDED.f_vale_recibido,
              f_ingreso = EXCLUDED.f_ingreso,
              contador_cambios = EXCLUDED.contador_cambios
          `;
          if (exists) {
            updated++;
          } else {
            migrated++;
          }
        } catch (error) {
          console.error(
            `  ✗ Error procesando póliza ${poliza.no_poliza}:`,
            error.message
          );
          skipped++;
        }
      }

      console.log(
        `  ➜ Procesadas ${Math.min(i + BATCH_SIZE, polizas.length)}/${
          polizas.length
        } pólizas`
      );
    }

    console.log(`✅ Pólizas nuevas: ${migrated}`);
    console.log(`🔄 Pólizas actualizadas: ${updated}`);
    console.log(`⏭ Pólizas omitidas: ${skipped}`);

    return { migrated, updated, skipped };
  } catch (error) {
    console.error("❌ Error migrando pólizas:", error);
    throw error;
  }
}

async function migrateRecibos() {
  console.log("\n📦 Iniciando migración de recibos...");

  try {
    // Obtener todos los recibos de develop
    const recibos = await sourceDb`SELECT * FROM recibos ORDER BY id`;
    console.log(`✓ Se encontraron ${recibos.length} recibos en develop`);

    if (recibos.length === 0) {
      console.log("⚠ No hay recibos para migrar");
      return { migrated: 0, skipped: 0 };
    }

    // Obtener mapeo de poliza_id entre bases de datos
    const sourcePolizas = await sourceDb`SELECT id, no_poliza FROM polizas`;
    const targetPolizas = await targetDb`SELECT id, no_poliza FROM polizas`;

    const polizaIdMap = new Map();
    sourcePolizas.forEach((sp) => {
      const tp = targetPolizas.find((t) => t.no_poliza === sp.no_poliza);
      if (tp) {
        polizaIdMap.set(sp.id, tp.id);
      }
    });

    console.log(`✓ Mapeadas ${polizaIdMap.size} pólizas entre bases de datos`);

    // Obtener recibos existentes en production
    const existingRecibos = await targetDb`
      SELECT poliza_id, no_recibo 
      FROM recibos
    `;
    const existingSet = new Set(
      existingRecibos.map((r) => `${r.poliza_id}_${r.no_recibo}`)
    );
    console.log(`✓ Ya existen ${existingSet.size} recibos en production`);

    let migrated = 0;
    let skipped = 0;

    // Insertar en lotes de 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < recibos.length; i += BATCH_SIZE) {
      const batch = recibos.slice(i, i + BATCH_SIZE);

      for (const recibo of batch) {
        // Mapear poliza_id
        const targetPolizaId = polizaIdMap.get(recibo.poliza_id);

        if (!targetPolizaId) {
          console.log(
            `  ⚠ Recibo ${recibo.id}: póliza ${recibo.poliza_id} no existe en production, omitiendo`
          );
          skipped++;
          continue;
        }

        // Verificar si ya existe
        const key = `${targetPolizaId}_${recibo.no_recibo}`;
        if (existingSet.has(key)) {
          skipped++;
          continue;
        }

        try {
          await targetDb`
            INSERT INTO recibos (
              poliza_id, no_recibo, estatus_pago, estatus_comision,
              prima_neta, prima_total, comision, f_desde, f_hasta,
              f_pago, no_aviso, identificador, motivo, f_pago_comision
            ) VALUES (
              ${targetPolizaId}, ${recibo.no_recibo}, ${recibo.estatus_pago},
              ${recibo.estatus_comision}, ${recibo.prima_neta}, ${recibo.prima_total},
              ${recibo.comision}, ${recibo.f_desde}, ${recibo.f_hasta},
              ${recibo.f_pago}, ${recibo.no_aviso}, ${recibo.identificador},
              ${recibo.motivo}, ${recibo.f_pago_comision}
            )
          `;
          migrated++;
        } catch (error) {
          console.error(
            `  ✗ Error insertando recibo ${recibo.id}:`,
            error.message
          );
          skipped++;
        }
      }

      console.log(
        `  ➜ Procesados ${Math.min(i + BATCH_SIZE, recibos.length)}/${
          recibos.length
        } recibos`
      );
    }

    console.log(`✅ Recibos migrados: ${migrated}`);
    console.log(`⏭ Recibos omitidos: ${skipped}`);

    return { migrated, skipped };
  } catch (error) {
    console.error("❌ Error migrando recibos:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 Iniciando migración de datos de develop a production\n");
  console.log("📍 Source (develop): ep-old-resonance-adzweor5");
  console.log("📍 Target (production): ep-sparkling-bread-ad6zjx41");

  try {
    // Verificar conexiones
    console.log("\n🔍 Verificando conexiones...");
    const sourceTest = await sourceDb`SELECT COUNT(*) as count FROM polizas`;
    const targetTest = await targetDb`SELECT COUNT(*) as count FROM polizas`;
    console.log(`✓ Develop: ${sourceTest[0].count} pólizas`);
    console.log(`✓ Production: ${targetTest[0].count} pólizas`);

    // Migrar pólizas primero (para respetar foreign keys)
    const polizasResult = await migratePolizas();

    // Migrar recibos
    const recibosResult = await migrateRecibos();

    console.log("\n✅ Migración completada");
    console.log(`\n📊 Resumen:`);
    console.log(
      `  Pólizas: ${polizasResult.migrated} nuevas, ${polizasResult.updated} actualizadas, ${polizasResult.skipped} omitidas`
    );
    console.log(
      `  Recibos: ${recibosResult.migrated} migrados, ${recibosResult.skipped} omitidos`
    );
  } catch (error) {
    console.error("\n❌ Error en la migración:", error);
    process.exit(1);
  }
}

main();
