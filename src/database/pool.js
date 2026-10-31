const { Pool } = require('pg');
require('dotenv').config();

/**
 * Gestión centralizada del Pool de Conexiones PostgreSQL (Supabase).
 *
 * Propósito arquitectónico:
 * 1. Reutilización de sockets TCP para evitar saturación de conexiones ('too many connections').
 * 2. Mitigación del coste de apertura/cierre de handshake SSL en cada petición.
 * 3. Gestión estricta de límites (max) y tiempos de inactividad (idleTimeout).
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    '[DATABASE WARNING] DATABASE_URL no está definida en las variables de entorno. Verifique su archivo .env.'
  );
}

// Supabase requiere SSL explícito. Detectamos si es Supabase o conexión remota SSL.
const isSupabaseOrRemote =
  connectionString &&
  (connectionString.includes('supabase.com') ||
    connectionString.includes('sslmode=require') ||
    process.env.NODE_ENV === 'production');

const pool = new Pool({
  connectionString,
  ssl: isSupabaseOrRemote ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10), // Límite de conexiones simultáneas
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10), // Cierre de sockets inactivos
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '5000', 10), // Timeout de adquisición
});

/**
 * Escucha obligatoria de eventos de error en clientes inactivos (idle clients).
 *
 * CRÍTICO: Si un backend PostgreSQL cierra un socket inactivo (por timeout del
 * firewall o reinicio del nodo) y el pool de Node.js no captura este evento,
 * Node emitirá un uncaughtException terminando el proceso abruptamente.
 */
pool.on('error', (err, client) => {
  console.error(
    '[DATABASE POOL ERROR] Error inesperado en un cliente inactivo del pool de PostgreSQL:',
    err.message
  );
});

module.exports = pool;

