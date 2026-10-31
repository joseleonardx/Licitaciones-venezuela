require('dotenv').config();
const app = require('./app');
const pool = require('./database/pool');

/**
 * Punto de Entrada y Gestión del Listener TCP del Servidor.
 *
 * Responsabilidades:
 * 1. Inicialización del puerto de escucha.
 * 2. Cierre grácil (Graceful Shutdown) ante señales SIGINT y SIGTERM.
 * 3. Drenado y liberación del Pool de PostgreSQL al apagar el proceso.
 */

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log(`🚀 Servidor HTTP iniciado exitosamente en modo [${NODE_ENV}]`);
  console.log(`🌐 Escuchando peticiones en: http://localhost:${PORT}`);
  console.log(`🩺 Health check disponible en: http://localhost:${PORT}/health`);
  console.log(`🔐 Dominio Auth (Empresas): http://localhost:${PORT}/api/v1/auth`);
  console.log(`🏛️ Dominio Licitaciones: http://localhost:${PORT}/api/v1/licitations`);
  console.log(`📑 Dominio Postulaciones (Bids): http://localhost:${PORT}/api/v1/bids`);
  console.log(`📦 Dominio Requests (FSM/ACID): http://localhost:${PORT}/api/v1/requests`);
  console.log('================================================================');
});

/**
 * Procedimiento de Apagado Grácil (Graceful Shutdown).
 * Asegura que las peticiones en vuelo terminen y que las conexiones del pool
 * se cierren ordenadamente sin dejar sockets huérfanos.
 */
async function gracefulShutdown(signal) {
  console.log(`\n[SHUTDOWN] Señal ${signal} recibida. Iniciando cierre grácil...`);

  server.close(async () => {
    console.log('[SHUTDOWN] Servidor HTTP cerrado para nuevas conexiones.');

    try {
      console.log('[SHUTDOWN] Drenando pool de conexiones PostgreSQL...');
      await pool.end();
      console.log('[SHUTDOWN] Pool de PostgreSQL cerrado con éxito.');
      process.exit(0);
    } catch (err) {
      console.error('[SHUTDOWN ERROR] Error al cerrar el pool de PostgreSQL:', err);
      process.exit(1);
    }
  });

  // Forzar apagado si las operaciones tardan más de 10 segundos
  setTimeout(() => {
    console.error('[SHUTDOWN TIMEOUT] No se completó el cierre a tiempo. Forzando salida.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL UNCAUGHT EXCEPTION]', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
