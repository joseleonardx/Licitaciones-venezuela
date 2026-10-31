const fs = require('fs');
const path = require('path');
const pool = require('../src/database/pool');

/**
 * Runner de Migraciones SQL incrementales para PostgreSQL / Supabase.
 * Lee todos los archivos .sql en orden de versión y los aplica.
 */
async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');

  console.log('================================================================');
  console.log('🔄 Iniciando ejecución de migraciones de base de datos...');
  console.log(`📁 Directorio: ${migrationsDir}`);

  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Error: El directorio de migraciones no existe.');
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('ℹ️ No se encontraron archivos de migración .sql para ejecutar.');
    await pool.end();
    return;
  }

  const client = await pool.connect();

  try {
    // Tabla interna para registrar migraciones ya aplicadas
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    for (const file of files) {
      const checkRes = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1;',
        [file]
      );

      if (checkRes.rows.length > 0) {
        console.log(`⏩ [SALTADA] Migración ya aplicada: ${file}`);
        continue;
      }

      console.log(`⏳ [EJECUTANDO] Aplicando migración: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      await client.query(sqlContent);
      await client.query(
        'INSERT INTO schema_migrations (filename, applied_at) VALUES ($1, NOW());',
        [file]
      );
      await client.query('COMMIT');

      console.log(`✅ [APLICADA] Migración exitosa: ${file}`);
    }

    console.log('🎉 Todas las migraciones fueron procesadas con éxito.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [ERROR FATAL] Falló la ejecución de las migraciones:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();

